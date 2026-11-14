import { NextRequest, NextResponse } from "next/server";
import { InvoiceRepository } from "@/repository/invoice-repository";
import { PatientRepository } from "@/repository/patient-repository";
import { ClinicRepository } from "@/repository/clinic-repository";
import { CreateInvoiceSchema, ListInvoicesQuerySchema } from "@/types/invoices";
import { UserRole } from "@/types/users";
import { authenticateForModule, canAccessClinic, checkModulePermission } from "@/services";
import { invoiceFieldError } from "@/services/invoice-rules";

/**
 * GET /api/invoices
 *
 * Lists active invoices, newest first, each with its patient and what is paid.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_view on "Finances"
 *   - Admin/Staff: always scoped to their own clinic
 *   - One patient's treatments (?patient_id=) need only "Finances"; a list
 *     across every patient is a clinic-wide figure and also needs can_view
 *     on "Reports"
 *   - SuperAdmin: may filter by ?clinic_id
 *
 * Query Params:
 *   page?, limit?   pagination (limit max 200)
 *   clinic_id?      UUID (SuperAdmin only)
 *   patient_id?     UUID
 *   status?         Unpaid | Partial | Paid
 *   open?           "1": only invoices with something left to pay
 *   search?         every word must match the patient's name, phone or email
 *
 * Responses:
 *   200  { invoices: InvoiceSummary[], total, page, limit }
 *   400  Invalid query parameters
 *   401  Unauthorized
 *   403  Forbidden
 */
export async function GET(request: NextRequest) {
  const { session, error } = await authenticateForModule("Finances", "can_view");
  if (error) return error;
  const caller = session.user;

  const sp = request.nextUrl.searchParams;
  const parsed = ListInvoicesQuerySchema.safeParse({
    page:       sp.get("page")       ?? undefined,
    limit:      sp.get("limit")      ?? undefined,
    clinic_id:  sp.get("clinic_id")  ?? undefined,
    patient_id: sp.get("patient_id") ?? undefined,
    status:     sp.get("status")     ?? undefined,
    open:       sp.get("open")       ?? undefined,
    search:     sp.get("search")     ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, { status: 400 });
  }

  let clinic_id: string | undefined;
  if (caller.role !== UserRole.SuperAdmin) {
    if (!caller.clinic_id) {
      return NextResponse.json({ error: "Forbidden: User is not associated with a clinic" }, { status: 403 });
    }
    clinic_id = caller.clinic_id;
    // Every patient's treatments at once is a report, not one patient's record
    if (!parsed.data.patient_id) {
      const reportsError = await checkModulePermission(caller.id, "Reports", "can_view");
      if (reportsError) return reportsError;
    }
  } else {
    clinic_id = parsed.data.clinic_id;
  }

  const { page, limit } = parsed.data;
  const result = await InvoiceRepository.findPage({ ...parsed.data, clinic_id });
  return NextResponse.json({ invoices: result.data, total: result.total, page, limit }, { status: 200 });
}

/**
 * POST /api/invoices
 *
 * Creates an unpaid invoice for a patient, optionally linked to one of their
 * appointments.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_create on "Finances"
 *   - Admin/Staff: invoiced in their own clinic (clinic_id may be left out)
 *   - SuperAdmin: clinic_id is required and must exist
 *   The patient must be in that clinic, and a linked appointment must be
 *   that patient's, in that clinic.
 *
 * Body: { patient_id, title, total_amount ("150.00" or 150), appointment_id?, due_date? }
 *
 * Responses:
 *   201  { invoice: InvoiceModel }
 *   400  Invalid JSON
 *   401  Unauthorized
 *   403  Forbidden
 *   422  Validation error
 */
export async function POST(request: NextRequest) {
  const { session, error } = await authenticateForModule("Finances", "can_create");
  if (error) return error;
  const caller = session.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const parsed = CreateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  let clinicId: string;
  if (caller.role !== UserRole.SuperAdmin) {
    if (!caller.clinic_id) {
      return NextResponse.json({ error: "Forbidden: User is not associated with a clinic" }, { status: 403 });
    }
    if (parsed.data.clinic_id) {
      const clinicAccessError = canAccessClinic(caller.role, caller.clinic_id, parsed.data.clinic_id, "Forbidden: You can only invoice in your own clinic");
      if (clinicAccessError) return clinicAccessError;
    }
    clinicId = caller.clinic_id;
  } else {
    if (!parsed.data.clinic_id || !(await ClinicRepository.exists(parsed.data.clinic_id))) {
      return invoiceFieldError("clinic_id", "Choose an existing clinic.");
    }
    clinicId = parsed.data.clinic_id;
  }

  const { patient_id, appointment_id } = parsed.data;
  if (!(await PatientRepository.belongsToClinic(patient_id, clinicId))) {
    return invoiceFieldError("patient_id", "This patient is not in this clinic.");
  }
  if (appointment_id && !(await InvoiceRepository.appointmentMatches(appointment_id, clinicId, patient_id))) {
    return invoiceFieldError("appointment_id", "This appointment is not this patient's.");
  }

  const invoice = await InvoiceRepository.create({ ...parsed.data, clinic_id: clinicId });
  return NextResponse.json({ invoice }, { status: 201 });
}
