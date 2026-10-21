import { db } from "../prisma/db";
import { or } from "@prisma/orm-postgres/orm-client";
import type {
  PatientModel,
  MedicalHistoryModel,
  PatientDocumentModel,
  CreatePatientData,
  UpdatePatientData,
  MedicalHistoryData,
  CreateDocumentData,
  UpdateDocumentData,
} from "../types/patients";

// ─── Patient Repository ───────────────────────────────────────────────────────

export class PatientRepository {
  // ── Queries ─────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single patient by ID (excluding soft-deleted records).
   * Returns null if not found.
   */
  static async findById(id: string): Promise<PatientModel | null> {
    const patient = await db.orm.public.Patient
      .select(
        "id", "clinic_id", "first_name", "last_name", "email", "phone",
        "date_of_birth", "gender", "specialized_data", "created_at", "updated_at", "deleted_at"
      )
      .where((p) => p.deleted_at.isNull())
      .first({ id });
    return patient ?? null;
  }

  /**
   * Paginated list of active (non-deleted) patients with optional filters.
   *  - clinic_id: filter to a specific clinic
   *  - search:    case-insensitive match on first_name, last_name, email, or phone
   */
  static async findAll(filter?: {
    clinic_id?: string;
    search?:    string;
    page?:      number;
    limit?:     number;
  }): Promise<{ data: PatientModel[]; total: number }> {
    const page  = filter?.page  ?? 1;
    const limit = filter?.limit ?? 20;
    const skip  = (page - 1) * limit;

    let query = db.orm.public.Patient
      .select(
        "id", "clinic_id", "first_name", "last_name", "email", "phone",
        "date_of_birth", "gender", "specialized_data", "created_at", "updated_at", "deleted_at"
      )
      .where((p) => p.deleted_at.isNull());

    if (filter?.clinic_id) {
      query = query.where({ clinic_id: filter.clinic_id });
    }

    if (filter?.search) {
      const s = filter.search;
      query = query.where((p) =>
        or(
          p.first_name.ilike(`%${s}%`),
          p.last_name.ilike(`%${s}%`),
          p.email.ilike(`%${s}%`),
          p.phone.ilike(`%${s}%`)
        )
      );
    }

    const [data, agg] = await Promise.all([
      query.orderBy((p) => p.created_at.desc()).limit(limit).offset(skip).all(),
      query.aggregate((a) => ({ count: a.count() })),
    ]);

    return { data, total: agg.count };
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  /** Creates and returns a new patient. */
  static async createPatient(data: CreatePatientData): Promise<PatientModel> {
    return db.orm.public.Patient
      .select(
        "id", "clinic_id", "first_name", "last_name", "email", "phone",
        "date_of_birth", "gender", "specialized_data", "created_at", "updated_at", "deleted_at"
      )
      .create(data);
  }

  /** Updates an active patient by ID; returns the updated record or null if not found. */
  static async updatePatient(
    id:   string,
    data: UpdatePatientData
  ): Promise<PatientModel | null> {
    const updated = await db.orm.public.Patient
      .where({ id })
      .where((p) => p.deleted_at.isNull())
      .select(
        "id", "clinic_id", "first_name", "last_name", "email", "phone",
        "date_of_birth", "gender", "specialized_data", "created_at", "updated_at", "deleted_at"
      )
      .update(data);
    return updated ?? null;
  }

  /**
   * Deletes a patient and handles dependent records inside a transaction:
   *  - Shared medical history and uploaded documents are purged.
   *  - Associated appointments are unlinked from invoices and deleted.
   *  - Financial records (invoices and payments) are soft-deleted with a timestamp
   *    to comply with financial retention and audit requirements.
   *  - The patient record is soft-deleted with a timestamp, preserving referential
   *    integrity for audit history while removing it from active queries.
   */
  static async deletePatient(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    return db.transaction(async (tx) => {
      // 1. Remove shared medical history (1:1)
      await tx.orm.public.SharedMedicalHistory.where({ patient_id: id }).delete();

      // 2. Remove uploaded documents
      await tx.orm.public.PatientDocument.where({ patient_id: id }).delete();

      // 3. Unlink and delete appointments
      const appointments = await tx.orm.public.Appointment
        .where({ patient_id: id })
        .select("id")
        .all();

      for (const appt of appointments) {
        // Null-out appointment_id on linked invoices (nullable FK)
        await tx.orm.public.Invoice
          .where({ appointment_id: appt.id })
          .update({ appointment_id: null });
      }

      await tx.orm.public.Appointment.where({ patient_id: id }).delete();

      // 4. Soft-delete invoices and their payments for accounting/audit retention
      const invoices = await tx.orm.public.Invoice
        .where({ patient_id: id })
        .select("id")
        .all();

      for (const inv of invoices) {
        await tx.orm.public.Payment
          .where({ invoice_id: inv.id })
          .update({ deleted_at: now });
      }

      await tx.orm.public.Invoice
        .where({ patient_id: id })
        .update({ deleted_at: now });

      // 5. Soft-delete the patient itself to retain referential integrity with financial records
      await tx.orm.public.Patient
        .where({ id })
        .update({ deleted_at: now });

      return true;
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Returns true if the active patient belongs to the given clinic. */
  static async belongsToClinic(
    patientId: string,
    clinicId:  string
  ): Promise<boolean> {
    const result = await db.orm.public.Patient
      .where({ id: patientId, clinic_id: clinicId })
      .where((p) => p.deleted_at.isNull())
      .aggregate((a) => ({ count: a.count() }));
    return result.count > 0;
  }
}

// ─── Medical History Repository ───────────────────────────────────────────────

export class MedicalHistoryRepository {
  /** Fetches the shared medical history for a patient. */
  static async findByPatientId(patientId: string): Promise<MedicalHistoryModel | null> {
    const record = await db.orm.public.SharedMedicalHistory
      .select("id", "patient_id", "blood_type", "allergies", "chronic_conditions", "current_medications", "last_updated")
      .first({ patient_id: patientId });
    return record ?? null;
  }

  /**
   * Upsert: creates or fully replaces the shared medical history for a patient.
   * Because patient_id is @unique, we try to update first and create on miss.
   */
  static async upsert(
    patientId: string,
    data:      MedicalHistoryData
  ): Promise<MedicalHistoryModel> {
    const existing = await db.orm.public.SharedMedicalHistory
      .first({ patient_id: patientId });

    if (existing) {
      const updated = await db.orm.public.SharedMedicalHistory
        .where({ patient_id: patientId })
        .select("id", "patient_id", "blood_type", "allergies", "chronic_conditions", "current_medications", "last_updated")
        .update(data);
      return updated!;
    }

    return db.orm.public.SharedMedicalHistory
      .select("id", "patient_id", "blood_type", "allergies", "chronic_conditions", "current_medications", "last_updated")
      .create({ patient_id: patientId, ...data });
  }

  /** Deletes the medical history record for the given patient. */
  static async deleteByPatientId(patientId: string): Promise<boolean> {
    const existing = await db.orm.public.SharedMedicalHistory
      .first({ patient_id: patientId });
    if (!existing) return false;
    await db.orm.public.SharedMedicalHistory
      .where({ patient_id: patientId })
      .delete();
    return true;
  }
}

// ─── Patient Document Repository ─────────────────────────────────────────────

export class PatientDocumentRepository {
  /** Paginated list of documents for a patient with optional type filter. */
  static async findAll(
    patientId: string,
    filter?: {
      document_type?: string;
      page?:          number;
      limit?:         number;
    }
  ): Promise<{ data: PatientDocumentModel[]; total: number }> {
    const page  = filter?.page  ?? 1;
    const limit = filter?.limit ?? 20;
    const skip  = (page - 1) * limit;

    let query = db.orm.public.PatientDocument
      .select("id", "patient_id", "name", "file_url", "document_type", "uploaded_at")
      .where({ patient_id: patientId });

    if (filter?.document_type) {
      query = query.where({ document_type: filter.document_type });
    }

    const [data, agg] = await Promise.all([
      query.orderBy((d) => d.uploaded_at.desc()).limit(limit).offset(skip).all(),
      query.aggregate((a) => ({ count: a.count() })),
    ]);

    return { data, total: agg.count };
  }

  /** Retrieves a single document by its own ID. */
  static async findById(id: string): Promise<PatientDocumentModel | null> {
    const doc = await db.orm.public.PatientDocument
      .select("id", "patient_id", "name", "file_url", "document_type", "uploaded_at")
      .first({ id });
    return doc ?? null;
  }

  /** Creates and returns a new patient document. */
  static async create(data: CreateDocumentData): Promise<PatientDocumentModel> {
    return db.orm.public.PatientDocument
      .select("id", "patient_id", "name", "file_url", "document_type", "uploaded_at")
      .create(data);
  }

  /** Updates document metadata; returns updated record or null. */
  static async update(
    id:   string,
    data: UpdateDocumentData
  ): Promise<PatientDocumentModel | null> {
    const updated = await db.orm.public.PatientDocument
      .where({ id })
      .select("id", "patient_id", "name", "file_url", "document_type", "uploaded_at")
      .update(data);
    return updated ?? null;
  }

  /** Deletes a document by ID. */
  static async delete(id: string): Promise<void> {
    await db.orm.public.PatientDocument.where({ id }).delete();
  }
}
