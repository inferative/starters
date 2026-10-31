import { PgHostConfig } from "@inferative/base/persistence/pg/migrations";
import { relations } from "./database";
import * as schema from "./schema";

/** The drizzle config of the dashboard: it serves the runtime and `drizzle-kit` (through `drizzle.config.ts`). */
export const databaseConfig = PgHostConfig.create(schema, relations, {
  moduleUrl: import.meta.url,
  sourceDirectory: "server/persistence/pg",
  migrationsDirectory: "migrations",
  developmentUrl: "postgres://postgres:postgres@127.0.0.1:5432/postgres"
});

export default databaseConfig;
