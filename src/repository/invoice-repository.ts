import { db } from "../prisma/db";
import { or } from "@prisma/orm-postgres/orm-client";
import type { Numeric } from "@prisma/orm-postgres/target/codec-types";
import { searchPatterns } from "../lib/search-words";
import { fromCents, sumCents, toCents } from "../lib/money";
import { pageOffset, type PaginatedResult } from "../types/pagination";
import {
  InvoiceStatus,
  type CreateInvoiceData,
  type CreatePaymentData,
  type InvoiceDetail,
  type InvoiceModel,
  type InvoiceSummary,
  type PaymentModel,
  type UpdateInvoiceData,
} from "../types/invoices";

const INVOICE_FIELDS = [
  "id", "clinic_id", "patient_id", "appointment_id", "title", "total_amount",
  "status", "due_date", "created_at", "updated_at", "deleted_at",
] as const;

const PAYMENT_FIELDS = [
  "id", "clinic_id", "invoice_id", "appointment_id", "amount", "payment_method",
  "payment_date", "notes", "created_at", "updated_at", "deleted_at",
] as const;

const PERSON_FIELDS = ["id", "first_name", "last_name"] as const;

/** A validated amount string ("150.00") as the Numeric(12, 2) column type. */
const asMoney = (amount: string) => amount as unknown as Numeric<12, 2>;

export type InvoiceListFilter = {
  clinic_id?:  string;
  patient_id?: string;
  status?:     InvoiceStatus;
  /** Only invoices with something left to pay (Unpaid or Partial) */
  open?:       boolean;
  search?:     string;
  page:        number;
  limit:       number;
};

/** The status that follows from what is paid: nothing, some, or all of it. */
export function statusFor(totalCents: number, paidCents: number): InvoiceStatus {
  if (paidCents <= 0) return InvoiceStatus.Unpaid;
  return paidCents >= totalCents ? InvoiceStatus.Paid : InvoiceStatus.Partial;
}

/** Why a payment was refused. */
export type PaymentRefusal = { reason: "not_found" } | { reason: "overpaid"; balance: string };

type InvoiceRow = InvoiceModel & {
  patient: InvoiceSummary["patient"];
  payments: PaymentModel[];
};

/** Keeps the non-deleted payments and adds paid_amount and balance (exact, in cents). */
function withTotals(row: InvoiceRow) {
  const payments = row.payments.filter((p) => !p.deleted_at);
  const paid = sumCents(payments.map((p) => p.amount));
  return {
    ...row,
    payments,
    paid_amount: fromCents(paid),
    balance: fromCents(toCents(row.total_amount) - paid),
  };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Locks the invoice row for the rest of the transaction (a no-op update takes
 * Postgres' row lock), so two payments on one invoice never both pass the
 * balance check. Returns false when the invoice does not exist or is deleted.
 */
async function lockInvoice(tx: Tx, id: string): Promise<boolean> {
  const count = await tx.orm.public.Invoice
    .where({ id })
    .where((i) => i.deleted_at.isNull())
    .updateAndCount({ deleted_at: null });
  return count > 0;
}

/** Total and paid (in cents) of a locked invoice, read inside the transaction. */
async function centsOf(tx: Tx, id: string) {
  const [invoice, paid] = await Promise.all([
    tx.orm.public.Invoice.select("total_amount").first({ id }),
    tx.orm.public.Payment
      .where({ invoice_id: id })
      .where((p) => p.deleted_at.isNull())
      .aggregate((a) => ({ sum: a.sum("amount") })),
  ]);
  return { total: toCents(invoice!.total_amount), paid: paid.sum ? toCents(paid.sum) : 0 };
}

export class InvoiceRepository {
  // ── Queries ──────────────────────────────────────────────────────────────────

  /** One active invoice with its patient, payments (newest first), paid amount and balance. */
  static async findById(id: string): Promise<InvoiceDetail | null> {
    const row = await db.orm.public.Invoice
      .select(...INVOICE_FIELDS)
      .where((i) => i.deleted_at.isNull())
      .include("patient", (p) => p.select(...PERSON_FIELDS))
      .include("payments", (p) => p.select(...PAYMENT_FIELDS).orderBy((x) => x.payment_date.desc()))
      .first({ id });
    return row ? withTotals(row as unknown as InvoiceRow) : null;
  }

  /**
   * One page of active invoices, newest first, each with its patient, paid
   * amount and balance. `search`: every word must match the patient's name,
   * phone or email.
   */
  static async findPage(filter: InvoiceListFilter): Promise<PaginatedResult<InvoiceSummary>> {
    let query = db.orm.public.Invoice.select(...INVOICE_FIELDS).where((i) => i.deleted_at.isNull());
    if (filter.clinic_id)  query = query.where({ clinic_id: filter.clinic_id });
    if (filter.patient_id) query = query.where({ patient_id: filter.patient_id });
    if (filter.status)     query = query.where({ status: filter.status });
    if (filter.open)       query = query.where((i) => i.status.neq(InvoiceStatus.Paid));
    for (const pattern of searchPatterns(filter.search)) {
      query = query.where((i) =>
        i.patient.some((p) =>
          or(p.first_name.ilike(pattern), p.last_name.ilike(pattern), p.phone.ilike(pattern), p.email.ilike(pattern))
        )
      );
    }

    const [rows, agg] = await Promise.all([
      query
        .include("patient", (p) => p.select(...PERSON_FIELDS))
        .include("payments", (p) => p.select(...PAYMENT_FIELDS))
        .orderBy([(i) => i.created_at.desc(), (i) => i.id.desc()])
        .limit(filter.limit)
        .offset(pageOffset(filter))
        .all(),
      query.aggregate((a) => ({ count: a.count() })),
    ]);
    const data = (rows as unknown as InvoiceRow[]).map((row) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { payments, ...summary } = withTotals(row);
      return summary;
    });
    return { data, total: agg.count };
  }

  /** Whether an appointment belongs to this clinic and patient (to link it). */
  static async appointmentMatches(appointmentId: string, clinicId: string, patientId: string): Promise<boolean> {
    const result = await db.orm.public.Appointment
      .where({ id: appointmentId, clinic_id: clinicId, patient_id: patientId })
      .aggregate((a) => ({ count: a.count() }));
    return result.count > 0;
  }

  // ── Invoices ─────────────────────────────────────────────────────────────────

  /** Creates an unpaid invoice. */
  static async create(data: CreateInvoiceData): Promise<InvoiceModel> {
    return db.orm.public.Invoice.select(...INVOICE_FIELDS).create({
      ...data,
      total_amount: asMoney(data.total_amount),
      status: InvoiceStatus.Unpaid,
    });
  }

  /**
   * Changes the total, title or due date. The total may not drop below what
   * is paid; the status is recalculated. Runs under the invoice lock.
   */
  static async update(
    id: string,
    data: UpdateInvoiceData
  ): Promise<{ invoice: InvoiceModel } | { refused: PaymentRefusal }> {
    return db.transaction(async (tx) => {
      if (!(await lockInvoice(tx, id))) return { refused: { reason: "not_found" as const } };
      const { total, paid } = await centsOf(tx, id);
      const newTotal = data.total_amount ? toCents(data.total_amount) : total;
      if (newTotal < paid) return { refused: { reason: "overpaid" as const, balance: fromCents(paid) } };

      const { total_amount, ...rest } = data;
      const invoice = await tx.orm.public.Invoice
        .where({ id })
        .select(...INVOICE_FIELDS)
        .update({
          ...rest,
          ...(total_amount ? { total_amount: asMoney(total_amount) } : {}),
          status: statusFor(newTotal, paid),
        });
      return { invoice: invoice! };
    });
  }

  /**
   * Soft-deletes an invoice and its payments (financial records are kept for
   * audit, only hidden), in one transaction.
   */
  static async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      await tx.orm.public.Payment.where({ invoice_id: id }).where((p) => p.deleted_at.isNull()).updateAndCount({ deleted_at: now });
      await tx.orm.public.Invoice.where({ id }).update({ deleted_at: now });
    });
  }

  // ── Payments ─────────────────────────────────────────────────────────────────

  /**
   * Records a payment on an invoice if it fits the balance (no overpaying),
   * then updates the invoice's status, all under the invoice lock.
   */
  static async addPayment(
    data: CreatePaymentData
  ): Promise<{ payment: PaymentModel; status: InvoiceStatus } | { refused: PaymentRefusal }> {
    return db.transaction(async (tx) => {
      if (!(await lockInvoice(tx, data.invoice_id))) return { refused: { reason: "not_found" as const } };
      const { total, paid } = await centsOf(tx, data.invoice_id);
      const amount = toCents(data.amount);
      if (amount > total - paid) {
        return { refused: { reason: "overpaid" as const, balance: fromCents(total - paid) } };
      }

      const payment = await tx.orm.public.Payment.select(...PAYMENT_FIELDS).create({ ...data, amount: asMoney(data.amount) });
      const status = statusFor(total, paid + amount);
      await tx.orm.public.Invoice.where({ id: data.invoice_id }).update({ status });
      return { payment, status };
    });
  }

  /** One active payment of an invoice, or null. */
  static async findPayment(invoiceId: string, paymentId: string): Promise<PaymentModel | null> {
    const payment = await db.orm.public.Payment
      .select(...PAYMENT_FIELDS)
      .where({ id: paymentId, invoice_id: invoiceId })
      .where((p) => p.deleted_at.isNull())
      .first();
    return payment ?? null;
  }

  /** Soft-deletes a payment (kept for audit) and updates the invoice's status. */
  static async removePayment(invoiceId: string, paymentId: string): Promise<InvoiceStatus | null> {
    return db.transaction(async (tx) => {
      if (!(await lockInvoice(tx, invoiceId))) return null;
      await tx.orm.public.Payment
        .where({ id: paymentId, invoice_id: invoiceId })
        .where((p) => p.deleted_at.isNull())
        .updateAndCount({ deleted_at: new Date().toISOString() });
      const { total, paid } = await centsOf(tx, invoiceId);
      const status = statusFor(total, paid);
      await tx.orm.public.Invoice.where({ id: invoiceId }).update({ status });
      return status;
    });
  }

  /**
   * Pay-per-visit: a charge for one appointment, already paid in full, in one
   * transaction (an invoice of `amount` plus its payment).
   */
  static async createVisitCharge(data: {
    clinic_id: string;
    patient_id: string;
    appointment_id: string;
    title: string;
    payment: Omit<CreatePaymentData, "invoice_id" | "clinic_id" | "appointment_id">;
  }): Promise<{ invoice: InvoiceModel; payment: PaymentModel }> {
    return db.transaction(async (tx) => {
      const invoice = await tx.orm.public.Invoice.select(...INVOICE_FIELDS).create({
        clinic_id: data.clinic_id,
        patient_id: data.patient_id,
        appointment_id: data.appointment_id,
        title: data.title,
        total_amount: asMoney(data.payment.amount),
        status: InvoiceStatus.Paid,
      });
      const payment = await tx.orm.public.Payment.select(...PAYMENT_FIELDS).create({
        ...data.payment,
        amount: asMoney(data.payment.amount),
        clinic_id: data.clinic_id,
        invoice_id: invoice.id,
        appointment_id: data.appointment_id,
      });
      return { invoice, payment };
    });
  }
}
