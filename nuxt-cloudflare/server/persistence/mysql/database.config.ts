import { MysqlHostConfig } from "@inferative/base/persistence/mysql2/migrations";
import { relations } from "./database";
import * as schema from "./schema";

/** The drizzle config of the site: it serves the runtime and `drizzle-kit` (through `drizzle.config.ts`). */
export const databaseConfig = MysqlHostConfig.create(schema, relations, {
  moduleUrl: import.meta.url,
  sourceDirectory: "server/persistence/mysql",
  migrationsDirectory: "migrations",
  developmentUrl: "mysql://root:root@127.0.0.1:3306/site?timezone=Z&dateStrings=true",
  // Every `in` list binds one parameter for each member: a longer list reads through `json_table`, which
  // PlanetScale MySQL (Vitess) refuses in a sharded keyspace. Remove when Heximon serves it (#2754).
  inListBindThreshold: Number.POSITIVE_INFINITY
});

export default databaseConfig;
