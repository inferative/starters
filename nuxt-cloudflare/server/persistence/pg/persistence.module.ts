import { Module } from "@heximon/runtime";
import { PgActivityPersistence } from "@inferative/activity/persistence/pg";
import { LiveEntityAnnouncer } from "@inferative/base/entity";
import { PgBasePersistence } from "@inferative/base/persistence/pg";
import { PgMigrations } from "@inferative/base/persistence/pg/migrations";
import { PgChannelsPersistence } from "@inferative/channels/persistence/pg";
import { PgContentPersistence } from "@inferative/content/persistence/pg";
import { PgFilesPersistence } from "@inferative/files/persistence/pg";
import { PgIdentityPersistence } from "@inferative/identity/persistence/pg";
import {
  PgInboxPersistence,
  PgNotificationsPersistence
} from "@inferative/notifications/persistence/pg";
import { PgPagesPersistence } from "@inferative/pages/persistence/pg";
import { PgPublishingPersistence } from "@inferative/publishing/persistence/pg";
import { PgSearchPersistence } from "@inferative/search/persistence/pg";
import { PgSeoPersistence } from "@inferative/seo/persistence/pg";
import { PgVisualEditingPersistence } from "@inferative/visual-editing/persistence/pg";
import { PgWorkspacePersistence } from "@inferative/workspace/persistence/pg";
import { DatabaseModule } from "./database.module";

/** The database of the site: the one connection, the migrations and the persistence module of each package. */
export class PersistenceModule extends Module({
  requires: [LiveEntityAnnouncer],
  imports: [
    DatabaseModule,
    PgMigrations,
    PgBasePersistence,
    PgIdentityPersistence,
    PgWorkspacePersistence,
    PgNotificationsPersistence,
    PgInboxPersistence,
    PgActivityPersistence,
    PgSearchPersistence,
    PgChannelsPersistence,
    PgContentPersistence,
    PgPagesPersistence,
    PgFilesPersistence,
    PgPublishingPersistence,
    PgSeoPersistence,
    PgVisualEditingPersistence
  ],
  exports: [
    DatabaseModule,
    PgBasePersistence,
    PgIdentityPersistence,
    PgWorkspacePersistence,
    PgNotificationsPersistence,
    PgInboxPersistence,
    PgActivityPersistence,
    PgSearchPersistence,
    PgChannelsPersistence,
    PgContentPersistence,
    PgPagesPersistence,
    PgFilesPersistence,
    PgPublishingPersistence,
    PgSeoPersistence,
    PgVisualEditingPersistence
  ]
}) {}
