import { Module } from "@heximon/runtime";
import { PgActivityPersistence } from "@inferative/activity/persistence/pg";
import { LiveEntityAnnouncer } from "@inferative/base/entity";
import { RevisionPurgeDeliveries } from "@inferative/base/revisions";
import { PgBasePersistence, PgStoragePersistence } from "@inferative/base/persistence/pg";
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
import { InboxKindRegistry } from "@inferative/base/notify";
import { PolicyCheck } from "@inferative/base/policy";

// The time-limit filter of this dialect, which the root module lists.
export { PgTimeLimitFilter as HostTimeLimitFilter } from "@inferative/base/persistence/pg";

/** The database of the site: the one connection, the migrations and the persistence module of each package. */
export class PersistenceModule extends Module({
  requires: [
    LiveEntityAnnouncer,
    RevisionPurgeDeliveries,
    // Which written inbox items their recipient hears of.
    { provide: PolicyCheck, optional: true },
    { provide: InboxKindRegistry, optional: true }
  ],
  imports: [
    DatabaseModule,
    PgMigrations,
    PgBasePersistence,
    PgStoragePersistence,
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
    PgStoragePersistence,
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
