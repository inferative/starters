import { Database, MigrationConfig } from "@heximon/persistence";
import { Context, Module } from "@heximon/runtime";
import { PgDatabase } from "@inferative/base/persistence/pg";
import { TenantContext } from "@inferative/base/tenant";
import { databaseConfig } from "./database.config";
import { HostDatabase } from "./database";

/**
 * Binds the one connection as {@link PgDatabase} and as `Database`, so a write and the outbox row it buffers
 * commit together. It sits apart from the persistence module, which imports the modules that require it.
 */
export class DatabaseModule extends Module({
  providers: [
    TenantContext,
    { provide: MigrationConfig, useValue: databaseConfig },
    {
      provide: HostDatabase,
      useFactory: (context: Context): HostDatabase => new HostDatabase(databaseConfig, context)
    },
    { provide: [PgDatabase, Database], useExisting: HostDatabase }
  ],
  exports: [HostDatabase, PgDatabase, Database, MigrationConfig, TenantContext]
}) {}
