import { Database, MigrationConfig } from "@heximon/persistence";
import { Context, Module } from "@heximon/runtime";
import { MysqlDatabase } from "@inferative/base/persistence/mysql2";
import { TenantContext } from "@inferative/base/tenant";
import { databaseConfig } from "./database.config";
import { MysqlHostDatabase } from "./database";

/**
 * Binds the one connection as {@link MysqlDatabase} and as `Database`, so a write and the outbox row it buffers
 * commit together. It sits apart from the persistence module, which imports the modules that require it.
 */
export class DatabaseModule extends Module({
  providers: [
    TenantContext,
    { provide: MigrationConfig, useValue: databaseConfig },
    {
      provide: MysqlHostDatabase,
      useFactory: (context: Context): MysqlHostDatabase =>
        new MysqlHostDatabase(databaseConfig, context)
    },
    { provide: [MysqlDatabase, Database], useExisting: MysqlHostDatabase }
  ],
  exports: [MysqlHostDatabase, MysqlDatabase, Database, MigrationConfig, TenantContext]
}) {}
