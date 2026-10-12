import { Database } from "@heximon/persistence";
import { Module } from "@heximon/runtime";
import { ActivityModule } from "@inferative/activity/server";
import {
  CloudflareRateLimitInfrastructure,
  CloudflareStorageInfrastructure
} from "@inferative/base/infrastructure/cloudflare";
import { BaseModule } from "@inferative/base/server";
import { ChannelVaryHeaderContributor } from "@inferative/channels/administration";
import { ChannelHttpCachePolicy, ChannelsModule } from "@inferative/channels/server";
import { ContentModule, ContentPublishableSourcesModule } from "@inferative/content/server";
import {
  ContentPagesJointModule,
  ContentPublishingJointModule,
  DashboardModule
} from "@inferative/dashboard/server";
import {
  CloudflareFilesStoreInfrastructure,
  CloudflareResponseCacheInfrastructure
} from "@inferative/files/infrastructure/cloudflare";
import { FilesR2DevelopmentStore } from "@inferative/files/infrastructure/cloudflare/development";
import { FilesModule } from "@inferative/files/server";
import {
  IdentityActorsModule,
  IdentityDiscoveryModule,
  IdentityModule
} from "@inferative/identity/server";
import { NotificationsModule } from "@inferative/notifications/server";
import { PagesModule } from "@inferative/pages/server";
import { PublishingModule } from "@inferative/publishing/server";
import { SearchModule } from "@inferative/search/server";
import { SeoModule } from "@inferative/seo/server";
import { SiteModule } from "@inferative/site/server";
import { VisualEditingModule } from "@inferative/visual-editing/server";
import { IdentityHostModule, WorkspaceModule } from "@inferative/workspace/server";
// The database setup this site runs on (Postgres). To use MySQL, change this import: see "Use MySQL" in README.md.
import { PersistenceModule } from "./persistence/pg/persistence.module";

/**
 * The root module of this site. Each line of `imports` adds one capability: delete a line to remove it, and add
 * the module of another package (and its layer in `nuxt.config.ts`) to add one. `inferative.config.ts` holds the
 * values. The agent that sets up the site owns this list.
 */
export class AppModule extends Module({
  imports: [
    PersistenceModule,
    BaseModule,
    CloudflareStorageInfrastructure,
    CloudflareResponseCacheInfrastructure,
    CloudflareFilesStoreInfrastructure,
    // The S3 path to the same bucket, for `nuxt dev`. `dev: true` drops it, and the AWS SDK, from a production build.
    { module: FilesR2DevelopmentStore, dev: true },
    CloudflareRateLimitInfrastructure,
    IdentityModule,
    IdentityDiscoveryModule,
    IdentityActorsModule,
    IdentityHostModule,
    WorkspaceModule,
    DashboardModule,
    ActivityModule,
    NotificationsModule,
    SearchModule,
    ChannelsModule,
    ContentModule,
    ContentPublishableSourcesModule,
    PagesModule,
    FilesModule,
    PublishingModule,
    SeoModule,
    VisualEditingModule,
    SiteModule,
    ContentPagesJointModule,
    ContentPublishingJointModule
  ],
  http: { headers: [ChannelVaryHeaderContributor] },
  app: {
    cqrs: { autoTransaction: Database },
    http: { cache: ChannelHttpCachePolicy }
  }
}) {}
