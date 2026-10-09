#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1a0d3668c8549e01bf7c0b5333b10e990569c225c85e0f4258507f68016c851d/contract';
import endContract from '../../snapshots/1a0d3668c8549e01bf7c0b5333b10e990569c225c85e0f4258507f68016c851d/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/6b9ccd02771aa9cdb89ac3132fa71a0e774c23ade6642035247a65fdf8466771/contract';
import startContract from '../../snapshots/6b9ccd02771aa9cdb89ac3132fa71a0e774c23ade6642035247a65fdf8466771/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, placeholder } from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';

const { sql: db, contract } = postgres<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Payment',
        column: col('created_at', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Payment',
        column: col('updated_at', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.dataTransform(contract, 'backfill-Payment-created_at', {
        check: () => db.public.Payment.select('id').where((f, fns) => fns.eq(f.created_at, null)).limit(1),
        run: () => db.public.Payment.update({ created_at: '2026-10-09T00:00:00Z', updated_at: '2026-10-09T00:00:00Z' }).where((f, fns) => fns.eq(f.created_at, null)),
      }),
      this.dataTransform(contract, 'backfill-Payment-updated_at', {
        check: () => db.public.Payment.select('id').where((f, fns) => fns.eq(f.updated_at, null)).limit(1),
        run: () => db.public.Payment.update({ updated_at: '2026-10-09T00:00:00Z' }).where((f, fns) => fns.eq(f.updated_at, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'Payment', column: 'created_at' }),
      this.setNotNull({ schema: 'public', table: 'Payment', column: 'updated_at' }),
      this.addUnique({
        schema: 'public',
        table: 'UserPermission',
        constraint: 'UserPermission_user_id_module_name_key',
        columns: ['user_id', 'module_name'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
