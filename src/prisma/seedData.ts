import "dotenv/config";
import { db, connectDatabase } from "./db"; // Import your initialized Prisma 8 client

async function main() {
  await connectDatabase();
  console.log("🌱 Seeding database...");

  // 1. Create a Clinic
  const clinic = await db.orm.public.Clinic.create({
    name: "Healthy Smiles Dentistry",
    clinic_type: "Dentistry",
  });
  console.log(`✅ Created Clinic: ${clinic.name}`);

  // 2. Create a SuperAdmin User (Not attached to a specific clinic)
  const superAdmin = await db.orm.public.User.create({
    role: "SuperAdmin",
    first_name: "System",
    last_name: "Admin",
    email: "admin@healthysmiles.com",
    password_hash: "hashed_password_placeholder", // In production, use bcrypt/argon2
  });
  console.log(`✅ Created SuperAdmin: ${superAdmin.email}`);

  // 3. Create a Staff User (Attached to the clinic)
  const doctor = await db.orm.public.User.create({
    clinic_id: clinic.id,
    role: "Staff",
    first_name: "Jane",
    last_name: "Doe",
    email: "dr.jane@healthysmiles.com",
    password_hash: "hashed_password_placeholder",
  });
  console.log(`✅ Created Staff/Doctor: ${doctor.email}`);

  // 4. Create User Permissions for the Staff Member
  await db.orm.public.UserPermission.create({
    user_id: doctor.id,
    module_name: "Appointments",
    can_view: true,
    can_create: true,
    can_edit: true,
    can_delete: false,
  });

  // 5. Create a Patient
  const patient = await db.orm.public.Patient.create({
    clinic_id: clinic.id,
    first_name: "John",
    last_name: "Smith",
    email: "john.smith@example.com",
    phone: "+1234567890",
    date_of_birth: "1985-06-15", // DateString format
    gender: "Male",
  });
  console.log(`✅ Created Patient: ${patient.first_name} ${patient.last_name}`);

  // 6. Create a Shared Medical History for the Patient
  await db.orm.public.SharedMedicalHistory.create({
    patient_id: patient.id,
    blood_type: "O+",
    allergies: "Penicillin",
    current_medications: "None",
  });

  // 7. Create an Appointment for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const appointment = await db.orm.public.Appointment.create({
    clinic_id: clinic.id,
    patient_id: patient.id,
    user_id: doctor.id,
    scheduled_time: tomorrow.toISOString(), // TimestamptzString format
    duration_minutes: 60,
    status: "Scheduled",
    reason_for_visit: "Routine Checkup and Cleaning",
  });
  console.log(`✅ Created Appointment for: ${appointment.scheduled_time}`);

  // 8. Create an Invoice for the Appointment
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const invoice = await db.orm.public.Invoice.create({
    clinic_id: clinic.id,
    patient_id: patient.id,
    appointment_id: appointment.id,
    total_amount: "150.00" as any, // Prisma 8 requires string representation for Numeric fields to prevent precision loss
    status: "Unpaid",
    due_date: nextWeek.toISOString().split("T")[0], // YYYY-MM-DD DateString
  });
  console.log(`✅ Created Invoice for amount: $${invoice.total_amount}`);

  // 9. Process a Payment for the Invoice
  await db.orm.public.Payment.create({
    clinic_id: clinic.id,
    invoice_id: invoice.id,
    amount: "150.00" as any,
    payment_method: "Card",
    notes: "Paid in full via Visa ending in 4242",
    payment_date: new Date().toISOString(),
  });

  // 10. Update the Invoice Status to 'Paid' using the v8 chaining API
  await db.orm.public.Invoice
    .where({ id: invoice.id })
    .update({ status: "Paid" });
  console.log(`✅ Marked Invoice as Paid`);

  console.log("🎉 Database seeded successfully!");
}

// Execute the function and ensure the DB connection is closed safely
main()
  .then(async () => {
    await db.close();
  })
  .catch(async (e) => {
    console.error("❌ Seeding failed:", e);
    await db.close();
    process.exit(1);
  });