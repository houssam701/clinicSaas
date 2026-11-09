import { db } from "../prisma/db";
import { or } from "@prisma/orm-postgres/orm-client";
import { searchPatterns } from "../lib/search-words";
import { fromCents, sumCents, toCents } from "../lib/money";
import { pageOffset, type PaginatedResult } from "../types/pagination";
import type { Numeric } from "@prisma/orm-postgres/target/codec-types";
import {
  InvoiceStatus,
  type CreateInvoiceData,
  type InvoiceModel,
  type InvoiceSummary,
  type UpdateInvoiceData,
} from "../types/invoices";

const INVOICE_FIELDS = [
  "id", "clinic_id", "patient_id", "appointment_id", "total_amount",
  "status", "due_date", "created_at", "updated_at", "deleted_at",
] as const;

const PERSON_FIELDS = ["id", "first_name", "last_name"] as const;

/** A validated amount string ("150.00") as the Numeric(12, 2) column type. */
const asMoney = (amount: string) => amount as unknown as Numeric<12, 2>;

export type InvoiceListFilter = {
  clinic_id?:  string;
  patient_id?: string;
  status?:     InvoiceStatus;
  search?:     string;
  page:        number;
  limit:       number;
};

/** The status that follows from what is paid: nothing, some, or all of it. */
export function statusFor(totalCents: number, paidCents: number): InvoiceStatus {
  if (paidCents <= 0) return InvoiceStatus.Unpaid;
  return paidCents >= totalCents ? InvoiceStatus.Paid : InvoiceStatus.Partial;
}

type InvoiceRow = InvoiceModel & {
  patient: InvoiceSummary["patient"];
  payments: { amount: string; deleted_at: string | null }[];
};

/** Adds paid_amount and balance (exact, in cents) and drops the payment rows. */
function summarize(row: InvoiceRow): InvoiceSummary {
  const { payments, ...invoice } = row;
  const paid = sumCents(payments.filter((p) => !p.deleted_at).map((p) => p.amount));
  return {
    ...invoice,
    paid_amount: fromCents(paid),
    balance: fromCents(toCents(invoice.total_amount) - paid),
  };
}

export class InvoiceRepository {
  // ── Queries ──────────────────────────────────────────────────────────────────

  /** One active invoice with its patient and paid amount, or null. */
  static async findById(id: string): Promise<InvoiceSummary | null> {
    const row = await db.orm.public.Invoice
      .select(...INVOICE_FIELDS)
      .where((i) => i.deleted_at.isNull())
      .include("patient", (p) => p.select(...PERSON_FIELDS))
      .include("payments", (p) => p.select("amount", "deleted_at"))
      .first({ id });
    return row ? summarize(row as unknown as InvoiceRow) : null;
  }

  /**
   * One page of active invoices, newest first, each with its patient and paid
   * amount. `search`: every word must match the patient's name, phone or email.
   */
  static async findPage(filter: InvoiceListFilter): Promise<PaginatedResult<InvoiceSummary>> {
    let query = db.orm.public.Invoice.select(...INVOICE_FIELDS).where((i) => i.deleted_at.isNull());
    if (filter.clinic_id)  query = query.where({ clinic_id: filter.clinic_id });
    if (filter.patient_id) query = query.where({ patient_id: filter.patient_id });
    if (filter.status)     query = query.where({ status: filter.status });
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
        .include("payments", (p) => p.select("amount", "deleted_at"))
        .orderBy([(i) => i.created_at.desc(), (i) => i.id.desc()])
        .limit(filter.limit)
        .offset(pageOffset(filter))
        .all(),
      query.aggregate((a) => ({ count: a.count() })),
    ]);
    return { data: (rows as unknown as InvoiceRow[]).map(summarize), total: agg.count };
  }

  /** Whether an appointment belongs to this clinic and patient (to link it to an invoice). */
  static async appointmentMatches(appointmentId: string, clinicId: string, patientId: string): Promise<boolean> {
    const result = await db.orm.public.Appointment
      .where({ id: appointmentId, clinic_id: clinicId, patient_id: patientId })
      .aggregate((a) => ({ count: a.count() }));
    return result.count > 0;
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  /** Creates an unpaid invoice. */
  static async create(data: CreateInvoiceData): Promise<InvoiceModel> {
    return db.orm.public.Invoice.select(...INVOICE_FIELDS).create({
      ...data,
      total_amount: asMoney(data.total_amount),
      status: InvoiceStatus.Unpaid,
    });
  }

  /** Updates an invoice; returns it or null. */
  static async update(id: string, data: UpdateInvoiceData): Promise<InvoiceModel | null> {
    const { total_amount, ...rest } = data;
    const updated = await db.orm.public.Invoice
      .where({ id })
      .select(...INVOICE_FIELDS)
      .update({ ...rest, ...(total_amount ? { total_amount: asMoney(total_amount) } : {}) });
    return updated ?? null;
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
}
