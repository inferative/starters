import { Database, MigrationConfig } from "@heximon/persistence";
import { Context, Module } from "@heximon/runtime";
import { RuntimeConfig } from "@heximon/runtime/config";
import { PgDatabase } from "@inferative/base/persistence/pg";
import { PgHostConfig } from "@inferative/base/persistence/pg/migrations";
import { TenantContext } from "@inferative/base/tenant";
import { databaseConfig } from "./database.config";
import { HostDatabase } from "./database";

/**
 * Binds the one connection as {@link PgDatabase} and as `Database`, so a write and its outbox row commit together.
 * `coResident: "host"` keeps one pool on Node: a Durable Object copy of the app takes the host's connection.
 */
export class DatabaseModule extends Module({
  providers: [
    TenantContext,
    { provide: MigrationConfig, useValue: databaseConfig },
    {
      provide: HostDatabase,
      useFactory: (context: Context, runtimeConfig: RuntimeConfig): HostDatabase =>
        new HostDatabase(PgHostConfig.withRuntimeSettings(databaseConfig, runtimeConfig), context),
      coResident: "host"
    },
    { provide: [PgDatabase, Database], useExisting: HostDatabase }
  ],
  exports: [HostDatabase, PgDatabase, Database, MigrationConfig, TenantContext]
}) {}
