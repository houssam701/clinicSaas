#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/ad88bf8a783f510367b76a59a57634a09f40b9bb18d192c920e53f35c59ca5fa/contract';
import endContract from '../../snapshots/ad88bf8a783f510367b76a59a57634a09f40b9bb18d192c920e53f35c59ca5fa/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e2a95c79f288f62a4d749a103a5d0c6b0f5a2fdc01b70f4ab2bcd3141eff5337/contract';
import startContract from '../../snapshots/e2a95c79f288f62a4d749a103a5d0c6b0f5a2fdc01b70f4ab2bcd3141eff5337/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Invoice',
        column: col('deleted_at', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Patient',
        column: col('deleted_at', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Payment',
        column: col('deleted_at', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
