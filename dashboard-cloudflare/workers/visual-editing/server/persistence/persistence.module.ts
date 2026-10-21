import { Module } from "@heximon/runtime";
import { PgBasePersistence } from "@inferative/base/persistence/pg";
import { PgIdentityPersistence } from "@inferative/identity/persistence/pg";
import { PgVisualEditingPersistence } from "@inferative/visual-editing/persistence/pg";
import { DatabaseModule } from "./database.module";

/**
 * The database of this Worker: the connection, the stores of the base (the outbox included), the stores of identity
 * (to resolve a caller) and the stores of the visual editor. It runs no migration: the dashboard Worker applies them
 * all. The outbox is the one table of the dashboard, and the relay of this Worker drains only the rows of its own
 * service, `visual-editing`.
 */
export class PersistenceModule extends Module({
  imports: [DatabaseModule, PgBasePersistence, PgIdentityPersistence, PgVisualEditingPersistence],
  exports: [DatabaseModule, PgBasePersistence, PgIdentityPersistence, PgVisualEditingPersistence]
}) {}
