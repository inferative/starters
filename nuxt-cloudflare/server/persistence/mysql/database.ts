import { DrizzleHyperdriveMySQLDatabase } from "@heximon/drizzle/hyperdrive-mysql";
import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

/** The relational config over the composed schema. */
export const relations = defineRelations(schema);

/** The one MySQL connection of the site, typed over the composed schema. */
export class MysqlHostDatabase extends DrizzleHyperdriveMySQLDatabase<
  typeof schema,
  typeof relations
> {}
