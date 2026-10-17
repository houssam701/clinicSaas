#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1a0d3668c8549e01bf7c0b5333b10e990569c225c85e0f4258507f68016c851d/contract';
import startContract from '../../snapshots/1a0d3668c8549e01bf7c0b5333b10e990569c225c85e0f4258507f68016c851d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e2a95c79f288f62a4d749a103a5d0c6b0f5a2fdc01b70f4ab2bcd3141eff5337/contract';
import endContract from '../../snapshots/e2a95c79f288f62a4d749a103a5d0c6b0f5a2fdc01b70f4ab2bcd3141eff5337/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addCheckConstraint({
        schema: 'public',
        table: 'Clinic',
        constraint: 'Clinic_clinic_type_check_fe1cbc12',
        expression: "\"clinic_type\" IN ('Dentistry', 'Therapy')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
