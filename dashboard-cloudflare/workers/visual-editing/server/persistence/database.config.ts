import { PgHostConfig } from "@inferative/base/persistence/pg/migrations";
import { relations } from "./database";
import * as schema from "./schema";

/** The drizzle config of this Worker. It runs no migration: the dashboard applies them all. */
export const databaseConfig = PgHostConfig.create(schema, relations, {
  moduleUrl: import.meta.url,
  sourceDirectory: "workers/visual-editing/server/persistence",
  migrationsDirectory: "migrations",
  developmentUrl: "postgres://postgres:postgres@127.0.0.1:5432/postgres"
});
