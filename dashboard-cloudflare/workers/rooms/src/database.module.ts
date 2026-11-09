import { DrizzleHyperdrivePgDatabase } from "@heximon/drizzle/hyperdrive-pg";
import { Context, Module } from "@heximon/runtime";
import { RuntimeConfig } from "@heximon/runtime/config";
import { PgDatabase } from "@inferative/base/persistence/pg";
import { PgHostConfig } from "@inferative/base/persistence/pg/migrations";
import * as baseSchema from "@inferative/base/persistence/pg/schema";
import { RealtimeMessages } from "@inferative/realtime/persistence/pg/schema";
import { defineRelations } from "drizzle-orm";

/** The tables this Worker reads: those of the base, which hold the access states, and the realtime log. */
const schema = { ...baseSchema, RealtimeMessages };

/** The relational config over those tables. */
const relations = defineRelations(schema);

/** The connection of the dashboard database, through `HYPERDRIVE`. This Worker only reads it and runs no migration. */
export class RoomsDatabase extends DrizzleHyperdrivePgDatabase<typeof schema, typeof relations> {
  /** The connection config. `DATABASE_URL` wins over the binding, as in the dashboard Worker. */
  public static readonly config = PgHostConfig.create(schema, relations, {
    moduleUrl: undefined,
    developmentUrl: "postgres://postgres:postgres@127.0.0.1:5432/postgres"
  });
}

/** Binds {@link RoomsDatabase} as `PgDatabase`, the database that `PgPolicyPersistence` and `PgRealtimeLogReader` read. */
export class DatabaseModule extends Module({
  providers: [
    {
      provide: RoomsDatabase,
      useFactory: (context: Context, runtimeConfig: RuntimeConfig): RoomsDatabase =>
        new RoomsDatabase(
          PgHostConfig.withRuntimeSettings(RoomsDatabase.config, runtimeConfig),
          context
        )
    },
    { provide: PgDatabase, useExisting: RoomsDatabase }
  ],
  exports: [PgDatabase]
}) {}
