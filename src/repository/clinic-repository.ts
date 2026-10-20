import { db } from "../prisma/db";
import type {
  ClinicModel,
  ClinicType,
  CreateClinicData,
  UpdateClinicData,
} from "../types/clinics";

export class ClinicRepository {
  // ── Queries ──────────────────────────────────────────────────────────────────

  /**
   * Retrieves a clinic by its unique UUID.
   */
  static async findById(id: string): Promise<ClinicModel | null> {
    const clinic = await db.orm.public.Clinic
      .select("id", "name", "clinic_type", "created_at", "updated_at")
      .first({ id });
    return clinic ?? null;
  }

  /**
   * Finds a clinic by its exact name.
   */
  static async findByName(name: string): Promise<ClinicModel | null> {
    const clinic = await db.orm.public.Clinic
      .where((c) => c.name.eq(name))
      .first();
    return clinic ?? null;
  }

  /**
   * Lists all clinics with optional filtering by clinic_type and case-insensitive search on name.
   * Results are sorted by creation date descending.
   */
  static async findAll(filter?: {
    clinic_type?: ClinicType;
    search?: string;
  }): Promise<ClinicModel[]> {
    let query = db.orm.public.Clinic.select(
      "id",
      "name",
      "clinic_type",
      "created_at",
      "updated_at"
    );

    if (filter?.clinic_type) {
      query = query.where({ clinic_type: filter.clinic_type });
    }

    if (filter?.search) {
      const search = filter.search;
      query = query.where((c) => c.name.ilike(`%${search}%`));
    }

    const clinics = await query.orderBy((c) => c.created_at.desc()).all();
    return clinics;
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  /**
   * Creates a new clinic record in the database.
   */
  static async createClinic(data: CreateClinicData): Promise<ClinicModel> {
    const clinic = await db.orm.public.Clinic
      .select("id", "name", "clinic_type", "created_at", "updated_at")
      .create({
        name: data.name,
        clinic_type: data.clinic_type,
      });
    return clinic;
  }

  /**
   * Updates an existing clinic's details.
   */
  static async updateClinic(
    id: string,
    data: UpdateClinicData
  ): Promise<ClinicModel | null> {
    const updated = await db.orm.public.Clinic
      .where({ id })
      .select("id", "name", "clinic_type", "created_at", "updated_at")
      .update(data);
    return updated ?? null;
  }

  /**
   * Deletes a clinic and cleanly cascades through its multi-tenant relationships
   * (payments, invoices, appointments, patients with records, and associated staff/users)
   * in strict topological order within a database transaction.
   */
  static async deleteClinic(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // 1. Delete all payments associated with this clinic
      await tx.orm.public.Payment.where({ clinic_id: id }).delete();

      // 2. Delete all invoices associated with this clinic
      await tx.orm.public.Invoice.where({ clinic_id: id }).delete();

      // 3. Delete all appointments belonging to this clinic
      await tx.orm.public.Appointment.where({ clinic_id: id }).delete();

      // 4. Clean up patient documents and medical history before removing patients
      const patients = await tx.orm.public.Patient
        .where({ clinic_id: id })
        .select("id")
        .all();

      for (const patient of patients) {
        await tx.orm.public.SharedMedicalHistory.where({ patient_id: patient.id }).delete();
        await tx.orm.public.PatientDocument.where({ patient_id: patient.id }).delete();
      }

      await tx.orm.public.Patient.where({ clinic_id: id }).delete();

      // 5. Delete permissions for users tied to this clinic before removing the users
      const users = await tx.orm.public.User
        .where({ clinic_id: id })
        .select("id")
        .all();

      for (const user of users) {
        await tx.orm.public.UserPermission.where({ user_id: user.id }).delete();
      }

      await tx.orm.public.User.where({ clinic_id: id }).delete();

      // 6. Delete the clinic itself
      await tx.orm.public.Clinic.where({ id }).delete();

      return true;
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Checks whether a clinic exists with the given ID.
   */
  static async exists(id: string): Promise<boolean> {
    const result = await db.orm.public.Clinic
      .where({ id })
      .aggregate((a) => ({ count: a.count() }));
    return result.count > 0;
  }

  /**
   * Returns total count of clinics in the system.
   */
  static async count(): Promise<number> {
    const result = await db.orm.public.Clinic.aggregate((a) => ({ count: a.count() }));
    return result.count;
  }
}
