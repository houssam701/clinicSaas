#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6b9ccd02771aa9cdb89ac3132fa71a0e774c23ade6642035247a65fdf8466771/contract';
import endContract from '../../snapshots/6b9ccd02771aa9cdb89ac3132fa71a0e774c23ade6642035247a65fdf8466771/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'Appointment',
        columns: [
          col('clinic_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('duration_minutes', 'int4', {
            notNull: true,
            default: lit(30),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('patient_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason_for_visit', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('scheduled_time', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('Scheduled'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('user_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Appointment_status_check_9d570c59',
            "\"status\" IN ('Scheduled', 'Completed', 'Canceled', 'NoShow')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Clinic',
        columns: [
          col('clinic_type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Invoice',
        columns: [
          col('appointment_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clinic_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('due_date', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('patient_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('Unpaid'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('total_amount', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Invoice_status_check_ee68904d',
            "\"status\" IN ('Unpaid', 'Partial', 'Paid')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Patient',
        columns: [
          col('clinic_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('date_of_birth', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('first_name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('gender', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('last_name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('specialized_data', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'PatientDocument',
        columns: [
          col('document_type', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('file_url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('patient_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('uploaded_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Payment',
        columns: [
          col('amount', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('clinic_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('invoice_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('payment_date', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('payment_method', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Payment_payment_method_check_d203589d',
            "\"payment_method\" IN ('Cash', 'Card', 'Transfer', 'Insurance')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'SharedMedicalHistory',
        columns: [
          col('allergies', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('blood_type', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('chronic_conditions', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('current_medications', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('last_updated', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('patient_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('clinic_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('first_name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('last_name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('password_hash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'User_role_check_0a39af16',
            "\"role\" IN ('SuperAdmin', 'Admin', 'Staff')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'UserPermission',
        columns: [
          col('can_create', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('can_delete', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('can_edit', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('can_view', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('module_name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('user_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'SharedMedicalHistory',
        constraint: 'SharedMedicalHistory_patient_id_key',
        columns: ['patient_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Appointment',
        index: 'Appointment_clinic_id_idx_4265e318',
        columns: ['clinic_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Appointment',
        index: 'Appointment_clinic_id_scheduled_time_idx_691e13c2',
        columns: ['clinic_id', 'scheduled_time'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Appointment',
        index: 'Appointment_patient_id_idx_2f641dda',
        columns: ['patient_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Appointment',
        index: 'Appointment_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_appointment_id_idx_5a77e0f0',
        columns: ['appointment_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_clinic_id_idx_4265e318',
        columns: ['clinic_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_patient_id_idx_2f641dda',
        columns: ['patient_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Patient',
        index: 'Patient_clinic_id_idx_4265e318',
        columns: ['clinic_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PatientDocument',
        index: 'PatientDocument_patient_id_idx_2f641dda',
        columns: ['patient_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Payment',
        index: 'Payment_clinic_id_idx_4265e318',
        columns: ['clinic_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Payment',
        index: 'Payment_invoice_id_idx_a3b7555d',
        columns: ['invoice_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_clinic_id_idx_4265e318',
        columns: ['clinic_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UserPermission',
        index: 'UserPermission_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Appointment',
        foreignKey: {
          name: 'Appointment_clinic_id_fkey',
          columns: ['clinic_id'],
          references: { schema: 'public', table: 'Clinic', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Appointment',
        foreignKey: {
          name: 'Appointment_patient_id_fkey',
          columns: ['patient_id'],
          references: { schema: 'public', table: 'Patient', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Appointment',
        foreignKey: {
          name: 'Appointment_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Invoice',
        foreignKey: {
          name: 'Invoice_clinic_id_fkey',
          columns: ['clinic_id'],
          references: { schema: 'public', table: 'Clinic', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Invoice',
        foreignKey: {
          name: 'Invoice_patient_id_fkey',
          columns: ['patient_id'],
          references: { schema: 'public', table: 'Patient', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Invoice',
        foreignKey: {
          name: 'Invoice_appointment_id_fkey',
          columns: ['appointment_id'],
          references: { schema: 'public', table: 'Appointment', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Patient',
        foreignKey: {
          name: 'Patient_clinic_id_fkey',
          columns: ['clinic_id'],
          references: { schema: 'public', table: 'Clinic', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PatientDocument',
        foreignKey: {
          name: 'PatientDocument_patient_id_fkey',
          columns: ['patient_id'],
          references: { schema: 'public', table: 'Patient', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Payment',
        foreignKey: {
          name: 'Payment_clinic_id_fkey',
          columns: ['clinic_id'],
          references: { schema: 'public', table: 'Clinic', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Payment',
        foreignKey: {
          name: 'Payment_invoice_id_fkey',
          columns: ['invoice_id'],
          references: { schema: 'public', table: 'Invoice', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SharedMedicalHistory',
        foreignKey: {
          name: 'SharedMedicalHistory_patient_id_fkey',
          columns: ['patient_id'],
          references: { schema: 'public', table: 'Patient', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'User',
        foreignKey: {
          name: 'User_clinic_id_fkey',
          columns: ['clinic_id'],
          references: { schema: 'public', table: 'Clinic', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UserPermission',
        foreignKey: {
          name: 'UserPermission_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
