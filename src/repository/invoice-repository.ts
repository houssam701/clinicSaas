import { db } from "../prisma/db";
import type {
  InvoiceModel,
  PaymentModel,
  CreateInvoiceData,
  UpdateInvoiceData,
  CreatePaymentData,
  UpdatePaymentData,
} from "../types/invoices";
import { InvoiceStatus, PaymentMethod } from "../types/invoices";
import type { Numeric } from "@prisma/orm-postgres/target/codec-types";

// ─── Invoice Repository ───────────────────────────────────────────────────────

const INVOICE_FIELDS = [
  "id",
  "clinic_id",
  "patient_id",
  "appointment_id",
  "total_amount",
  "status",
  "due_date",
  "created_at",
  "updated_at",
  "deleted_at",
] as const;

const PAYMENT_FIELDS = [
  "id",
  "clinic_id",
  "invoice_id",
  "amount",
  "payment_method",
  "payment_date",
  "notes",
  "created_at",
  "updated_at",
  "deleted_at",
] as const;

export class InvoiceRepository {
  // ── Queries ──────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single invoice by ID.
   * Returns null if not found or soft-deleted.
   */
  static async findById(id: string): Promise<InvoiceModel | null> {
    const invoice = await db.orm.public.Invoice
      .select(...INVOICE_FIELDS)
      .where((i) => i.deleted_at.isNull())
      .first({ id });
    return invoice ?? null;
  }

  /**
   * Retrieves an invoice by ID together with its payments and computed balance_due.
   */
  static async findByIdWithPayments(id: string): Promise<
    (InvoiceModel & { payments: PaymentModel[]; balance_due: number }) | null
  > {
    const invoice = await InvoiceRepository.findById(id);
    if (!invoice) return null;

    const payments = await PaymentRepository.findByInvoice(id);

    const paid = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );
    const balance_due = Math.max(0, Number(invoice.total_amount) - paid);

    return { ...invoice, payments, balance_due };
  }

  /**
   * Paginated list of invoices with optional filters.
   *  - clinic_id:      scope to a specific clinic
   *  - patient_id:     scope to a specific patient
   *  - appointment_id: scope to a specific appointment
   *  - status:         filter by invoice status
   *  - from / to:      filter by created_at range (ISO-8601 strings)
   */
  static async findAll(filter?: {
    clinic_id?:      string;
    patient_id?:     string;
    appointment_id?: string;
    status?:         InvoiceStatus;
    from?:           string;
    to?:             string;
    page?:           number;
    limit?:          number;
  }): Promise<{ data: InvoiceModel[]; total: number }> {
    const page  = filter?.page  ?? 1;
    const limit = filter?.limit ?? 20;
    const skip  = (page - 1) * limit;

    let query = db.orm.public.Invoice
      .select(...INVOICE_FIELDS)
      .where((i) => i.deleted_at.isNull());

    if (filter?.clinic_id)      query = query.where({ clinic_id:      filter.clinic_id      });
    if (filter?.patient_id)     query = query.where({ patient_id:     filter.patient_id     });
    if (filter?.appointment_id) query = query.where({ appointment_id: filter.appointment_id });
    if (filter?.status)         query = query.where({ status:         filter.status         });

    if (filter?.from) {
      query = query.where((i) => i.created_at.gte(filter.from!));
    }
    if (filter?.to) {
      query = query.where((i) => i.created_at.lte(filter.to!));
    }

    const [data, agg] = await Promise.all([
      query.orderBy((i) => i.created_at.desc()).limit(limit).offset(skip).all(),
      query.aggregate((i) => ({ count: i.count() })),
    ]);

    return { data, total: agg.count };
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  /** Creates and returns a new invoice (status defaults to Unpaid). */
  static async createInvoice(data: CreateInvoiceData): Promise<InvoiceModel> {
    return db.orm.public.Invoice
      .select(...INVOICE_FIELDS)
      .create({
        clinic_id:      data.clinic_id,
        patient_id:     data.patient_id,
        appointment_id: data.appointment_id ?? null,
        total_amount:   String(data.total_amount) as Numeric<12, 2>,
        status:         data.status ?? InvoiceStatus.Unpaid,
        due_date:       data.due_date ?? null,
      });
  }

  /** Updates an invoice by ID; returns the updated record or null if not found. */
  static async updateInvoice(
    id:   string,
    data: UpdateInvoiceData
  ): Promise<InvoiceModel | null> {
    const payload: Record<string, unknown> = {};
    if (data.appointment_id !== undefined) payload.appointment_id = data.appointment_id;
    if (data.total_amount   !== undefined) payload.total_amount   = String(data.total_amount) as Numeric<12, 2>;
    if (data.status         !== undefined) payload.status         = data.status;
    if (data.due_date       !== undefined) payload.due_date       = data.due_date;

    const updated = await db.orm.public.Invoice
      .where({ id })
      .where((i) => i.deleted_at.isNull())
      .select(...INVOICE_FIELDS)
      .update(payload as Parameters<typeof db.orm.public.Invoice.update>[0]);
    return updated ?? null;
  }

  /**
   * Soft-deletes an invoice by ID.
   * Returns false if the invoice was not found.
   */
  static async deleteInvoice(id: string): Promise<boolean> {
    const result = await db.orm.public.Invoice
      .where({ id })
      .where((i) => i.deleted_at.isNull())
      .update({ deleted_at: new Date().toISOString() });
    return !!result;
  }

  /**
   * Recalculates and persists the invoice status (Unpaid / Partial / Paid)
   * based on the sum of all non-deleted payments attached to it.
   *
   * Must be called after every payment create / update / delete.
   */
  static async recalculateStatus(invoiceId: string): Promise<void> {
    const invoice = await InvoiceRepository.findById(invoiceId);
    if (!invoice) return;

    const payments = await db.orm.public.Payment
      .select("amount")
      .where({ invoice_id: invoiceId })
      .where((p) => p.deleted_at.isNull())
      .all();

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const total     = Number(invoice.total_amount);

    let newStatus: InvoiceStatus;
    if (totalPaid <= 0)         newStatus = InvoiceStatus.Unpaid;
    else if (totalPaid < total) newStatus = InvoiceStatus.Partial;
    else                        newStatus = InvoiceStatus.Paid;

    await db.orm.public.Invoice
      .where({ id: invoiceId })
      .update({ status: newStatus });
  }
}

// ─── Payment Repository ───────────────────────────────────────────────────────

export class PaymentRepository {
  // ── Queries ──────────────────────────────────────────────────────────────────

  /** Retrieves a single payment by ID. Returns null if not found or soft-deleted. */
  static async findById(id: string): Promise<PaymentModel | null> {
    const payment = await db.orm.public.Payment
      .select(...PAYMENT_FIELDS)
      .where((p) => p.deleted_at.isNull())
      .first({ id });
    return payment ?? null;
  }

  /**
   * Paginated list of payments with optional filters.
   *  - clinic_id:      scope to a specific clinic
   *  - invoice_id:     scope to a specific invoice
   *  - payment_method: filter by payment method
   *  - from / to:      filter by payment_date range
   */
  static async findAll(filter?: {
    clinic_id?:      string;
    invoice_id?:     string;
    payment_method?: PaymentMethod;
    from?:           string;
    to?:             string;
    page?:           number;
    limit?:          number;
  }): Promise<{ data: PaymentModel[]; total: number }> {
    const page  = filter?.page  ?? 1;
    const limit = filter?.limit ?? 20;
    const skip  = (page - 1) * limit;

    let query = db.orm.public.Payment
      .select(...PAYMENT_FIELDS)
      .where((p) => p.deleted_at.isNull());

    if (filter?.clinic_id)      query = query.where({ clinic_id:      filter.clinic_id      });
    if (filter?.invoice_id)     query = query.where({ invoice_id:     filter.invoice_id     });
    if (filter?.payment_method) query = query.where({ payment_method: filter.payment_method });

    if (filter?.from) {
      query = query.where((p) => p.payment_date.gte(filter.from!));
    }
    if (filter?.to) {
      query = query.where((p) => p.payment_date.lte(filter.to!));
    }

    const [data, agg] = await Promise.all([
      query.orderBy((p) => p.payment_date.desc()).limit(limit).offset(skip).all(),
      query.aggregate((p) => ({ count: p.count() })),
    ]);

    return { data, total: agg.count };
  }

  /** Lists all non-deleted payments for a given invoice (ordered by payment_date asc). */
  static async findByInvoice(invoiceId: string): Promise<PaymentModel[]> {
    return db.orm.public.Payment
      .select(...PAYMENT_FIELDS)
      .where({ invoice_id: invoiceId })
      .where((p) => p.deleted_at.isNull())
      .orderBy((p) => p.payment_date.asc())
      .all();
  }

  /**
   * Sums all non-deleted payment amounts for a given invoice.
   * Used for balance / overpayment checks.
   */
  static async sumByInvoice(invoiceId: string): Promise<number> {
    const payments = await db.orm.public.Payment
      .select("amount")
      .where({ invoice_id: invoiceId })
      .where((p) => p.deleted_at.isNull())
      .all();
    return payments.reduce((sum, p) => sum + Number(p.amount), 0);
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  /** Creates and returns a new payment. */
  static async createPayment(data: CreatePaymentData): Promise<PaymentModel> {
    return db.orm.public.Payment
      .select(...PAYMENT_FIELDS)
      .create({
        clinic_id:      data.clinic_id,
        invoice_id:     data.invoice_id,
        amount:         String(data.amount) as Numeric<12, 2>,
        payment_method: data.payment_method,
        payment_date:   data.payment_date ?? new Date().toISOString(),
        notes:          data.notes ?? null,
      });
  }

  /** Updates a payment by ID; returns the updated record or null. */
  static async updatePayment(
    id:   string,
    data: UpdatePaymentData
  ): Promise<PaymentModel | null> {
    const payload: Record<string, unknown> = {};
    if (data.amount         !== undefined) payload.amount         = String(data.amount) as Numeric<12, 2>;
    if (data.payment_method !== undefined) payload.payment_method = data.payment_method;
    if (data.payment_date   !== undefined) payload.payment_date   = data.payment_date;
    if (data.notes          !== undefined) payload.notes          = data.notes;

    const updated = await db.orm.public.Payment
      .where({ id })
      .where((p) => p.deleted_at.isNull())
      .select(...PAYMENT_FIELDS)
      .update(payload as Parameters<typeof db.orm.public.Payment.update>[0]);
    return updated ?? null;
  }

  /**
   * Soft-deletes a payment by ID.
   * Returns false if the payment was not found.
   */
  static async deletePayment(id: string): Promise<boolean> {
    const result = await db.orm.public.Payment
      .where({ id })
      .where((p) => p.deleted_at.isNull())
      .update({ deleted_at: new Date().toISOString() });
    return !!result;
  }
}
