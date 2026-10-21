import { Database } from "@heximon/persistence";
import { Module } from "@heximon/runtime";
import { ActivityModule } from "@inferative/activity/server";
import {
  CloudflareRateLimitInfrastructure,
  CloudflareStorageInfrastructure
} from "@inferative/base/infrastructure/cloudflare";
import { RenderFrameFallthrough } from "@inferative/base/render";
import { BaseModule } from "@inferative/base/server";
import { TenantSeed } from "@inferative/base/tenant";
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
  IdentityModule,
  RenderSessionMiddleware
} from "@inferative/identity/server";
import { NotificationsModule } from "@inferative/notifications/server";
import { PagesModule } from "@inferative/pages/server";
import { PublishingModule } from "@inferative/publishing/server";
import { SearchModule } from "@inferative/search/server";
import { SeoModule } from "@inferative/seo/server";
import { LocalizationConfig } from "@inferative/base/config";
import { LocaleNegotiationFallthrough } from "@inferative/localization/server";
import { SitePageFallthrough } from "@inferative/site/render";
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
  // The languages a page render is negotiated in. No module of this site lists the section, so the root does.
  config: { localization: LocalizationConfig },
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
  http: {
    headers: [ChannelVaryHeaderContributor]
  },
  app: {
    // The API that the Vue app calls (`INFERATIVE_API_*`) and the locale facts (`INFERATIVE_LOCALIZATION_*`): the
    // server render and the browser read one value.
    config: { public: ["api", "localization"] },
    cqrs: { autoTransaction: Database },
    // A single-message handler runs in the tenant of its event: one seed stores it in the message frame, for every channel.
    context: {
      seeds: [TenantSeed]
    },
    http: {
      // A page render starts in the negotiated locale and from the visitor's session (`useAuth`). The render scope
      // opens first, so the session read already goes through the memo of the render. The site's page lane runs
      // last: its Markdown answer reads the session, and its redirect lookup reads the locale.
      fallthrough: [
        RenderFrameFallthrough,
        LocaleNegotiationFallthrough,
        RenderSessionMiddleware,
        SitePageFallthrough
      ],
      // A request under the API mount that no route serves answers a problem document, never a page.
      owns: ["/api"],
      cache: ChannelHttpCachePolicy
    }
  }
}) {}
