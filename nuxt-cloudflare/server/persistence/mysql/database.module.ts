import { Database, MigrationConfig } from "@heximon/persistence";
import { Context, Module } from "@heximon/runtime";
import { RuntimeConfig } from "@heximon/runtime/config";
import { MysqlDatabase } from "@inferative/base/persistence/mysql2";
import { MysqlHostConfig } from "@inferative/base/persistence/mysql2/migrations";
import { TenantContext } from "@inferative/base/tenant";
import { databaseConfig } from "./database.config";
import { MysqlHostDatabase } from "./database";

/**
 * Binds the one connection as {@link MysqlDatabase} and as `Database`, so a write and the outbox row it buffers
 * commit together. It sits apart from the persistence module, which imports the modules that require it.
 * The connection is bound `coResident: "host"`: on Node, a Durable Object copy of the app takes the host app's
 * instance, so the process keeps one pool and a copy opens no connection of its own.
 */
export class DatabaseModule extends Module({
  providers: [
    TenantContext,
    { provide: MigrationConfig, useValue: databaseConfig },
    {
      provide: MysqlHostDatabase,
      useFactory: (context: Context, runtimeConfig: RuntimeConfig): MysqlHostDatabase =>
        new MysqlHostDatabase(MysqlHostConfig.sized(databaseConfig, runtimeConfig), context),
      coResident: "host"
    },
    { provide: [MysqlDatabase, Database], useExisting: MysqlHostDatabase }
  ],
  exports: [MysqlHostDatabase, MysqlDatabase, Database, MigrationConfig, TenantContext]
}) {}
