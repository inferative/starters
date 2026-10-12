import { DrizzleHyperdrivePgDatabase } from "@heximon/drizzle/hyperdrive-pg";
import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

/** The relational config over the composed schema. */
export const relations = defineRelations(schema);

/** The one Postgres connection of the site, typed over the composed schema. */
export class HostDatabase extends DrizzleHyperdrivePgDatabase<typeof schema, typeof relations> {}
