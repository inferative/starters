import { Database, MigrationConfig } from "@heximon/persistence";
import { Context, Module } from "@heximon/runtime";
import { RuntimeConfig } from "@heximon/runtime/config";
import { PgDatabase } from "@inferative/base/persistence/pg";
import { PgHostConfig } from "@inferative/base/persistence/pg/migrations";
import { TenantContext } from "@inferative/base/tenant";
import { databaseConfig } from "./database.config";
import { WorkerDatabase } from "./database";

/** Binds the one connection of this Worker as {@link PgDatabase} and as `Database`. */
export class DatabaseModule extends Module({
  providers: [
    TenantContext,
    { provide: MigrationConfig, useValue: databaseConfig },
    {
      provide: WorkerDatabase,
      useFactory: (context: Context, runtimeConfig: RuntimeConfig): WorkerDatabase =>
        new WorkerDatabase(PgHostConfig.sized(databaseConfig, runtimeConfig), context),
      coResident: "host"
    },
    { provide: [PgDatabase, Database], useExisting: WorkerDatabase }
  ],
  exports: [WorkerDatabase, PgDatabase, Database, MigrationConfig, TenantContext]
}) {}
