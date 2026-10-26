import { z } from "zod";
import type { FieldOutputTypes } from "../prisma/generated/contract";

// ─── DB Model — derived directly from Prisma 8 generated contract ──────────────
export type InvoiceModel = FieldOutputTypes["public"]["Invoice"];
export type PaymentModel = FieldOutputTypes["public"]["Payment"];

// ─── Enums (mirrors contract.prisma) ──────────────────────────────────────────
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

// ─── Invoice Zod Schemas ────────────────────────────────────────────────────────

export const CreateInvoiceSchema = z.object({
  clinic_id:      z.string().uuid("Invalid clinic_id format"),
  patient_id:     z.string().uuid("Invalid patient_id format"),
  appointment_id: z.string().uuid("Invalid appointment_id format").optional().nullable(),
  total_amount:   z.number().positive("total_amount must be a positive number"),
  status:         z.nativeEnum(InvoiceStatus).optional(),
  due_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "due_date must be a valid date (YYYY-MM-DD)").optional().nullable(),
});

export const UpdateInvoiceSchema = z
  .object({
    appointment_id: z.string().uuid().optional().nullable(),
    total_amount:   z.number().positive().optional(),
    status:         z.nativeEnum(InvoiceStatus).optional(),
    due_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field must be provided for update",
  });

export const ListInvoicesQuerySchema = z.object({
  page:           z.coerce.number().int().min(1).default(1),
  limit:          z.coerce.number().int().min(1).max(200).default(20),
  clinic_id:      z.string().uuid().optional(),
  patient_id:     z.string().uuid().optional(),
  appointment_id: z.string().uuid().optional(),
  status:         z.nativeEnum(InvoiceStatus).optional(),
  from:           z.string().optional(), // ISO-8601 date-time
  to:             z.string().optional(), // ISO-8601 date-time
});

// ─── Payment Zod Schemas ────────────────────────────────────────────────────────

export const CreatePaymentSchema = z.object({
  clinic_id:      z.string().uuid("Invalid clinic_id format"),
  invoice_id:     z.string().uuid("Invalid invoice_id format"),
  amount:         z.number().positive("amount must be a positive number"),
  payment_method: z.nativeEnum(PaymentMethod),
  payment_date:   z.string().datetime({ message: "payment_date must be a valid ISO-8601 datetime" }).optional(),
  notes:          z.string().optional().nullable(),
});

export const UpdatePaymentSchema = z
  .object({
    amount:         z.number().positive().optional(),
    payment_method: z.nativeEnum(PaymentMethod).optional(),
    payment_date:   z.string().datetime({ message: "payment_date must be a valid ISO-8601 datetime" }).optional(),
    notes:          z.string().optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field must be provided for update",
  });

export const ListPaymentsQuerySchema = z.object({
  page:           z.coerce.number().int().min(1).default(1),
  limit:          z.coerce.number().int().min(1).max(200).default(20),
  clinic_id:      z.string().uuid().optional(),
  invoice_id:     z.string().uuid().optional(),
  payment_method: z.nativeEnum(PaymentMethod).optional(),
  from:           z.string().optional(), // ISO-8601 date-time
  to:             z.string().optional(), // ISO-8601 date-time
});

// ─── Inferred Types ────────────────────────────────────────────────────────────
export type CreateInvoiceInput     = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceInput     = z.infer<typeof UpdateInvoiceSchema>;
export type ListInvoicesQueryInput = z.infer<typeof ListInvoicesQuerySchema>;

export type CreatePaymentInput     = z.infer<typeof CreatePaymentSchema>;
export type UpdatePaymentInput     = z.infer<typeof UpdatePaymentSchema>;
export type ListPaymentsQueryInput = z.infer<typeof ListPaymentsQuerySchema>;

// ─── Repository Data Shapes ────────────────────────────────────────────────────
export type CreateInvoiceData = {
  clinic_id:       string;
  patient_id:      string;
  appointment_id?: string | null;
  total_amount:    number;
  status?:         InvoiceStatus;
  due_date?:       string | null;
};

export type UpdateInvoiceData = {
  appointment_id?: string | null;
  total_amount?:   number;
  status?:         InvoiceStatus;
  due_date?:       string | null;
};

export type CreatePaymentData = {
  clinic_id:      string;
  invoice_id:     string;
  amount:         number;
  payment_method: PaymentMethod;
  payment_date?:  string;
  notes?:         string | null;
};

export type UpdatePaymentData = {
  amount?:         number;
  payment_method?: PaymentMethod;
  payment_date?:   string;
  notes?:          string | null;
};
