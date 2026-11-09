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

/** clinic_id is only read for the SuperAdmin; Admin and Staff invoice in their own clinic. */
export const CreateInvoiceSchema = z.object({
  clinic_id:      z.string().uuid("Please select a valid clinic.").optional(),
  patient_id:     z.string().uuid("Choose a patient."),
  appointment_id: z.string().uuid("Choose a valid appointment.").nullable().optional(),
  total_amount:   AmountSchema,
  due_date:       DueDateSchema.nullable().optional(),
});

/** The status is not editable: it follows from the payments. */
export const UpdateInvoiceSchema = z
  .object({
    total_amount: AmountSchema.optional(),
    due_date:     DueDateSchema.nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Change at least one field before saving." });

export const ListInvoicesQuerySchema = PaginationQuerySchema.extend({
  clinic_id:  z.string().uuid().optional(),
  patient_id: z.string().uuid().optional(),
  status:     z.nativeEnum(InvoiceStatus).optional(),
  /** Words matched against the patient's name, phone and email */
  search:     z.string().trim().max(100).optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type CreateInvoiceInput     = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceInput     = z.infer<typeof UpdateInvoiceSchema>;
export type ListInvoicesQueryInput = z.infer<typeof ListInvoicesQuerySchema>;

// ─── Repository data shapes ───────────────────────────────────────────────────
export type CreateInvoiceData = {
  clinic_id:       string;
  patient_id:      string;
  appointment_id?: string | null;
  total_amount:    string;
  due_date?:       string | null;
};

export type UpdateInvoiceData = {
  total_amount?: string;
  due_date?:     string | null;
  status?:       InvoiceStatus;
};
