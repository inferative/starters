import { Module } from "@heximon/runtime";
import { MysqlActivityPersistence } from "@inferative/activity/persistence/mysql2";
import { LiveEntityAnnouncer } from "@inferative/base/entity";
import { RevisionPurgeDeliveries } from "@inferative/base/revisions";
import { MysqlBasePersistence } from "@inferative/base/persistence/mysql2";
import { MysqlMigrations } from "@inferative/base/persistence/mysql2/migrations";
import { MysqlChannelsPersistence } from "@inferative/channels/persistence/mysql2";
import { MysqlContentPersistence } from "@inferative/content/persistence/mysql2";
import { MysqlFilesPersistence } from "@inferative/files/persistence/mysql2";
import { MysqlIdentityPersistence } from "@inferative/identity/persistence/mysql2";
import {
  MysqlInboxPersistence,
  MysqlNotificationsPersistence
} from "@inferative/notifications/persistence/mysql2";
import { MysqlPagesPersistence } from "@inferative/pages/persistence/mysql2";
import { MysqlPublishingPersistence } from "@inferative/publishing/persistence/mysql2";
import { MysqlSearchPersistence } from "@inferative/search/persistence/mysql2";
import { MysqlSeoPersistence } from "@inferative/seo/persistence/mysql2";
import { MysqlVisualEditingPersistence } from "@inferative/visual-editing/persistence/mysql2";
import { MysqlWorkspacePersistence } from "@inferative/workspace/persistence/mysql2";
import { DatabaseModule } from "./database.module";

/** The database of the site: the one connection, the migrations and the persistence module of each package. */
export class PersistenceModule extends Module({
  requires: [LiveEntityAnnouncer, RevisionPurgeDeliveries],
  imports: [
    DatabaseModule,
    MysqlMigrations,
    MysqlBasePersistence,
    MysqlIdentityPersistence,
    MysqlWorkspacePersistence,
    MysqlNotificationsPersistence,
    MysqlInboxPersistence,
    MysqlActivityPersistence,
    MysqlSearchPersistence,
    MysqlChannelsPersistence,
    MysqlContentPersistence,
    MysqlPagesPersistence,
    MysqlFilesPersistence,
    MysqlPublishingPersistence,
    MysqlSeoPersistence,
    MysqlVisualEditingPersistence
  ],
  exports: [
    DatabaseModule,
    MysqlBasePersistence,
    MysqlIdentityPersistence,
    MysqlWorkspacePersistence,
    MysqlNotificationsPersistence,
    MysqlInboxPersistence,
    MysqlActivityPersistence,
    MysqlSearchPersistence,
    MysqlChannelsPersistence,
    MysqlContentPersistence,
    MysqlPagesPersistence,
    MysqlFilesPersistence,
    MysqlPublishingPersistence,
    MysqlSeoPersistence,
    MysqlVisualEditingPersistence
  ]
}) {}
