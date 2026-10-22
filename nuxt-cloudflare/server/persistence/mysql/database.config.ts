import { MySQLInListJsonForm } from "@heximon/drizzle/mysql-core";
import { MysqlHostConfig } from "@inferative/base/persistence/mysql2/migrations";
import { relations } from "./database";
import * as schema from "./schema";

/** The drizzle config of the site: it serves the runtime and `drizzle-kit` (through `drizzle.config.ts`). */
export const databaseConfig = MysqlHostConfig.create(schema, relations, {
  moduleUrl: import.meta.url,
  sourceDirectory: "server/persistence/mysql",
  migrationsDirectory: "migrations",
  developmentUrl: "mysql://root:root@127.0.0.1:3306/site?timezone=Z&dateStrings=true",
  // PlanetScale MySQL (Vitess) refuses `json_table` in a sharded keyspace, so a long `in` list reads through
  // `member of`. A list of strings on a plain string column binds one parameter for each member.
  inListJsonForm: MySQLInListJsonForm.MemberOf
});

export default databaseConfig;
