import { z } from "../lib/zod";
import { PaginationQuerySchema } from "./pagination";
import { AMOUNT_PATTERN, MAX_CENTS, fromCents, toCents } from "../lib/money";
import type { FieldOutputTypes } from "../prisma/generated/contract";

// ─── DB Models — derived from the Prisma 8 generated contract ─────────────────
export type InvoiceModel = FieldOutputTypes["public"]["Invoice"];
export type PaymentModel = FieldOutputTypes["public"]["Payment"];

// ─── Enums (mirror contract.prisma) ───────────────────────────────────────────
export enum InvoiceStatus {
  Unpaid  = "Unpaid",
  Partial = "Partial",
  Paid    = "Paid",
}

export enum PaymentMethod {
  Cash      = "Cash",
  Card      = "Card",
  Transfer  = "Transfer",
  Insurance = "Insurance",
}

/** An invoice with what a list or page needs: the patient's name and what is paid. */
export type InvoiceSummary = InvoiceModel & {
  patient: { id: string; first_name: string; last_name: string } | null;
  /** Sum of the invoice's (non-deleted) payments, as an exact amount string */
  paid_amount: string;
  /** total_amount − paid_amount */
  balance: string;
};

/** A payment taken at a visit, with the treatment it went to. */
export type VisitPayment = PaymentModel & { invoice: { id: string; title: string | null } | null };

/** An invoice with its (non-deleted) payments, newest first. */
export type InvoiceDetail = InvoiceSummary & { payments: PaymentModel[] };

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: "Cash",
  [PaymentMethod.Card]: "Card",
  [PaymentMethod.Transfer]: "Bank transfer",
  [PaymentMethod.Insurance]: "Insurance",
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

/**
 * A positive amount with at most 2 decimals that fits Numeric(12, 2). Accepts
 * a number or text and always yields text ("150" → "150.00"), so it is stored
 * exactly.
 */
export const AmountSchema = z
  .union([z.string().trim(), z.number()])
  .transform((v, ctx) => {
    const text = typeof v === "number" ? v.toFixed(2) : v;
    // One check at a time: text that is not an amount never reaches toCents
    if (!AMOUNT_PATTERN.test(text)) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 150 or 150.50." });
      return z.NEVER;
    }
    const cents = toCents(text);
    if (cents <= 0) {
      ctx.addIssue({ code: "custom", message: "The amount must be more than 0." });
      return z.NEVER;
    }
    if (cents > MAX_CENTS) {
      ctx.addIssue({ code: "custom", message: "The amount is too large." });
      return z.NEVER;
    }
    return fromCents(cents); // "150.5" → "150.50", exact
  });

const DueDateSchema = z.iso.date({ error: "Due date must be a valid date (YYYY-MM-DD)." });

const TitleSchema = z.string().trim().min(1, "Describe what is charged.").max(200, "Keep it under 200 characters.");

const NotesSchema = z.string().trim().max(500, "Notes must be at most 500 characters.");

/** When the money was received; defaults to now. */
const PaymentDateSchema = z.iso.datetime({ offset: true, error: "Choose a valid date and time." });

/** clinic_id is only read for the SuperAdmin; Admin and Staff invoice in their own clinic. */
export const CreateInvoiceSchema = z.object({
  clinic_id:      z.string().uuid("Please select a valid clinic.").optional(),
  patient_id:     z.string().uuid("Choose a patient."),
  appointment_id: z.string().uuid("Choose a valid appointment.").nullable().optional(),
  title:          TitleSchema,
  total_amount:   AmountSchema,
  due_date:       DueDateSchema.nullable().optional(),
});

/** The status is not editable: it follows from the payments. */
export const UpdateInvoiceSchema = z
  .object({
    title:        TitleSchema.optional(),
    total_amount: AmountSchema.optional(),
    due_date:     DueDateSchema.nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Change at least one field before saving." });

export const ListInvoicesQuerySchema = PaginationQuerySchema.extend({
  clinic_id:  z.string().uuid().optional(),
  patient_id: z.string().uuid().optional(),
  status:     z.nativeEnum(InvoiceStatus).optional(),
  /** "1": only invoices with something left to pay */
  open:       z.enum(["1"]).optional().transform((v) => v === "1"),
  /** Words matched against the patient's name, phone and email */
  search:     z.string().trim().max(100).optional(),
});

/** Money received on an invoice. Overpaying is refused by the API. */
export const CreatePaymentSchema = z.object({
  amount:         AmountSchema,
  payment_method: z.nativeEnum(PaymentMethod, { error: "Choose how it was paid." }),
  payment_date:   PaymentDateSchema.optional(),
  notes:          NotesSchema.nullable().optional(),
  /** The visit it was received at (same patient and clinic) */
  appointment_id: z.string().uuid().nullable().optional(),
});

/**
 * Money received during an appointment: applied to one of the patient's open
 * invoices (invoice_id), or, without one, recorded as a paid visit charge.
 */
export const AppointmentPaymentSchema = z.object({
  amount:         AmountSchema,
  payment_method: z.nativeEnum(PaymentMethod, { error: "Choose how it was paid." }),
  invoice_id:     z.string().uuid("Choose a valid treatment.").nullable().optional(),
  notes:          NotesSchema.nullable().optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type CreateInvoiceInput     = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceInput     = z.infer<typeof UpdateInvoiceSchema>;
export type ListInvoicesQueryInput = z.infer<typeof ListInvoicesQuerySchema>;
export type CreatePaymentInput     = z.infer<typeof CreatePaymentSchema>;
export type AppointmentPaymentInput = z.infer<typeof AppointmentPaymentSchema>;

// ─── Repository data shapes ───────────────────────────────────────────────────
export type CreateInvoiceData = {
  clinic_id:       string;
  patient_id:      string;
  appointment_id?: string | null;
  title:           string;
  total_amount:    string;
  due_date?:       string | null;
};

export type UpdateInvoiceData = {
  title?:        string;
  total_amount?: string;
  due_date?:     string | null;
};

export type CreatePaymentData = {
  clinic_id:       string;
  invoice_id:      string;
  appointment_id?: string | null;
  amount:          string;
  payment_method:  PaymentMethod;
  payment_date:    string;
  notes?:          string | null;
};
