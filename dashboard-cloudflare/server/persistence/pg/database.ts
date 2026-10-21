import { DrizzleHyperdrivePgDatabase } from "@heximon/drizzle/hyperdrive-pg";
import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

/** The relational config over the composed schema. */
export const relations = defineRelations(schema);

/**
 * The one Postgres connection of the dashboard, typed over the composed schema. The Hyperdrive dialect keeps a small
 * pool per request on Workers, and one pool for the process when a direct `DATABASE_URL` resolves on Node.
 */
export class HostDatabase extends DrizzleHyperdrivePgDatabase<typeof schema, typeof relations> {}
