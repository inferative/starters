import { DrizzleHyperdrivePgDatabase } from "@heximon/drizzle/hyperdrive-pg";
import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

/** The relational config over the schema of this Worker. */
export const relations = defineRelations(schema);

/** The Postgres connection of this Worker, through the Hyperdrive configuration of the dashboard. */
export class WorkerDatabase extends DrizzleHyperdrivePgDatabase<typeof schema, typeof relations> {}
