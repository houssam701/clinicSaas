import { defineContract, enumType, member, nativeEnum, pg } from '@prisma/orm-postgres/contract-builder';

// ─── Native Postgres Enums ───────────────────────────────────────────────────

const UserRole = nativeEnum('UserRole', 'SuperAdmin', 'Admin', 'Staff');

const AppointmentStatus = nativeEnum(
  'AppointmentStatus',
  'Scheduled',
  'Completed',
  'Canceled',
  'NoShow',
);

const InvoiceStatus = nativeEnum('InvoiceStatus', 'Unpaid', 'Partial', 'Paid');

const PaymentMethod = nativeEnum('PaymentMethod', 'Cash', 'Card', 'Transfer', 'Insurance');

// ─── Contract ────────────────────────────────────────────────────────────────

export const contract = defineContract({}, ({ field, model, rel }) => {
  // ─── Models ────────────────────────────────────────────────────────────────

  const Clinic = model('Clinic', {
    fields: {
      id: field.id.uuidv4String(),
      name: field.text(),
      clinic_type: field.text(),
      created_at: field.temporal.createdAtString(),
      updated_at: field.temporal.updatedAtString(),
    },
  });

  const User = model('User', {
    fields: {
      id: field.id.uuidv4String(),
      clinic_id: field.uuidString().optional(),
      role: field.column(pg.enum(UserRole)),
      first_name: field.text(),
      last_name: field.text(),
      email: field.text().unique(),
      password_hash: field.text(),
      created_at: field.temporal.createdAtString(),
      updated_at: field.temporal.updatedAtString(),
    },
  });

  const UserPermission = model('UserPermission', {
    fields: {
      id: field.id.uuidv4String(),
      user_id: field.uuidString(),
      module_name: field.text(),
      can_view: field.boolean().default(false),
      can_create: field.boolean().default(false),
      can_edit: field.boolean().default(false),
      can_delete: field.boolean().default(false),
      updated_at: field.temporal.updatedAtString(),
    },
  });

  const Patient = model('Patient', {
    fields: {
      id: field.id.uuidv4String(),
      clinic_id: field.uuidString(),
      first_name: field.text(),
      last_name: field.text(),
      email: field.text().optional(),
      phone: field.text().optional(),
      date_of_birth: field.text().optional(),
      gender: field.text().optional(),
      specialized_data: field.json().optional(),
      created_at: field.temporal.createdAtString(),
      updated_at: field.temporal.updatedAtString(),
    },
  });

  const SharedMedicalHistory = model('SharedMedicalHistory', {
    fields: {
      id: field.id.uuidv4String(),
      patient_id: field.uuidString().unique(),
      blood_type: field.text().optional(),
      allergies: field.text().optional(),
      chronic_conditions: field.text().optional(),
      current_medications: field.text().optional(),
      last_updated: field.temporal.updatedAtString(),
    },
  });

  const PatientDocument = model('PatientDocument', {
    fields: {
      id: field.id.uuidv4String(),
      patient_id: field.uuidString(),
      name: field.text(),
      file_url: field.text(),
      document_type: field.text().optional(),
      uploaded_at: field.temporal.createdAtString(),
    },
  });

  const Appointment = model('Appointment', {
    fields: {
      id: field.id.uuidv4String(),
      clinic_id: field.uuidString(),
      patient_id: field.uuidString(),
      user_id: field.uuidString().optional(),
      scheduled_time: field.text(),
      duration_minutes: field.int().default(30),
      status: field.column(pg.enum(AppointmentStatus)).default('Scheduled'),
      reason_for_visit: field.text().optional(),
      created_at: field.temporal.createdAtString(),
      updated_at: field.temporal.updatedAtString(),
    },
  });

  const Invoice = model('Invoice', {
    fields: {
      id: field.id.uuidv4String(),
      clinic_id: field.uuidString(),
      patient_id: field.uuidString(),
      appointment_id: field.uuidString().optional(),
      total_amount: field.decimal(),
      status: field.column(pg.enum(InvoiceStatus)).default('Unpaid'),
      due_date: field.text().optional(),
      created_at: field.temporal.createdAtString(),
      updated_at: field.temporal.updatedAtString(),
    },
  });

  const Payment = model('Payment', {
    fields: {
      id: field.id.uuidv4String(),
      clinic_id: field.uuidString(),
      invoice_id: field.uuidString(),
      amount: field.decimal(),
      payment_method: field.column(pg.enum(PaymentMethod)),
      payment_date: field.temporal.createdAtString(),
      notes: field.text().optional(),
    },
  });

  // ─── Relations ─────────────────────────────────────────────────────────────

  return {
    models: {
      Clinic: Clinic.relations({
        users: rel.hasMany(User, { by: 'clinic_id' }),
        patients: rel.hasMany(Patient, { by: 'clinic_id' }),
        appointments: rel.hasMany(Appointment, { by: 'clinic_id' }),
        invoices: rel.hasMany(Invoice, { by: 'clinic_id' }),
        payments: rel.hasMany(Payment, { by: 'clinic_id' }),
      }),

      User: User.relations({
        clinic: rel.belongsTo(Clinic, { from: 'clinic_id', to: 'id' }),
        permissions: rel.hasMany(UserPermission, { by: 'user_id' }),
        appointments: rel.hasMany(Appointment, { by: 'user_id' }),
      }),

      UserPermission: UserPermission.relations({
        user: rel.belongsTo(User, { from: 'user_id', to: 'id' }),
      }),

      Patient: Patient.relations({
        clinic: rel.belongsTo(Clinic, { from: 'clinic_id', to: 'id' }),
        medicalHistory: rel.hasOne(SharedMedicalHistory, { by: 'patient_id' }),
        documents: rel.hasMany(PatientDocument, { by: 'patient_id' }),
        appointments: rel.hasMany(Appointment, { by: 'patient_id' }),
        invoices: rel.hasMany(Invoice, { by: 'patient_id' }),
      }),

      SharedMedicalHistory: SharedMedicalHistory.relations({
        patient: rel.belongsTo(Patient, { from: 'patient_id', to: 'id' }),
      }),

      PatientDocument: PatientDocument.relations({
        patient: rel.belongsTo(Patient, { from: 'patient_id', to: 'id' }),
      }),

      Appointment: Appointment.relations({
        clinic: rel.belongsTo(Clinic, { from: 'clinic_id', to: 'id' }),
        patient: rel.belongsTo(Patient, { from: 'patient_id', to: 'id' }),
        staff: rel.belongsTo(User, { from: 'user_id', to: 'id' }),
        invoices: rel.hasMany(Invoice, { by: 'appointment_id' }),
      }),

      Invoice: Invoice.relations({
        clinic: rel.belongsTo(Clinic, { from: 'clinic_id', to: 'id' }),
        patient: rel.belongsTo(Patient, { from: 'patient_id', to: 'id' }),
        appointment: rel.belongsTo(Appointment, { from: 'appointment_id', to: 'id' }),
        payments: rel.hasMany(Payment, { by: 'invoice_id' }),
      }),

      Payment: Payment.relations({
        clinic: rel.belongsTo(Clinic, { from: 'clinic_id', to: 'id' }),
        invoice: rel.belongsTo(Invoice, { from: 'invoice_id', to: 'id' }),
      }),
    },
  };
});
