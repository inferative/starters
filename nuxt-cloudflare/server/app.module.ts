import { Database } from "@heximon/persistence";
import { Module } from "@heximon/runtime";
import { ActivityRecorderModule } from "@inferative/activity/recorder";
import { ActivityModule } from "@inferative/activity/server";
import { ActivityCapabilitiesModule } from "@inferative/activity/capabilities";
import {
  CloudflareRateLimitInfrastructure,
  CloudflareStorageInfrastructure
} from "@inferative/base/infrastructure/cloudflare";
import { WideEventConsoleDrain } from "@heximon/logging";
import { RenderFrameFallthrough } from "@inferative/base/render";
import { BaseModule } from "@inferative/base/server";
import { TenantSeed } from "@inferative/base/tenant";
import { ChannelVaryHeaderContributor } from "@inferative/channels/administration";
import { ChannelHttpCachePolicy, ChannelsModule } from "@inferative/channels/server";
import { ChannelsCapabilitiesModule } from "@inferative/channels/capabilities";
import { ContentModule, ContentPublishableSourcesModule } from "@inferative/content/server";
import { ContentCapabilitiesModule } from "@inferative/content/capabilities";
import {
  ContentPagesJointModule,
  ContentPublishingJointModule,
  DashboardModule
} from "@inferative/dashboard/server";
import { CloudflareFilesStoreInfrastructure } from "@inferative/files/infrastructure/cloudflare";
import { FilesR2DevelopmentStore } from "@inferative/files/infrastructure/cloudflare/development";
import { FilesModule, IsolateResponseCacheModule } from "@inferative/files/server";
import { FilesCapabilitiesModule } from "@inferative/files/capabilities";
import { IdentityKeysModule, RenderSessionMiddleware } from "@inferative/identity/keys";
import {
  IdentityActorsModule,
  IdentityDiscoveryModule,
  IdentityModule
} from "@inferative/identity/server";
import { NotificationsModule } from "@inferative/notifications/server";
import { NotificationsCapabilitiesModule } from "@inferative/notifications/capabilities";
import { PagesModule } from "@inferative/pages/server";
import { PagesCapabilitiesModule } from "@inferative/pages/capabilities";
import { PublishingModule } from "@inferative/publishing/server";
import { PublishingCapabilitiesModule } from "@inferative/publishing/capabilities";
import { SearchModule } from "@inferative/search/server";
import { SearchCapabilitiesModule } from "@inferative/search/capabilities";
import { SeoModule } from "@inferative/seo/server";
import { SeoCapabilitiesModule } from "@inferative/seo/capabilities";
import { LocalizationConfig } from "@inferative/base/config";
import { LocaleNegotiationFallthrough } from "@inferative/localization/server";
import { SitePageFallthrough } from "@inferative/site/render";
import { SiteModule } from "@inferative/site/server";
import { VisualEditingModule } from "@inferative/visual-editing/server";
import { VisualEditingCapabilitiesModule } from "@inferative/visual-editing/capabilities";
import { IdentityHostModule, WorkspaceModule } from "@inferative/workspace/server";
import { WorkspaceCapabilitiesModule } from "@inferative/workspace/capabilities";
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
    // The response cache, in the memory of each isolate within the `responseCache` bounds. An edit empties it in its
    // isolate at once and in every other isolate within a second, through a hint in the `Storage` above.
    IsolateResponseCacheModule,
    CloudflareFilesStoreInfrastructure,
    // The S3 path to the same bucket, for `nuxt dev`. `dev: true` drops it, and the AWS SDK, from a production build.
    { module: FilesR2DevelopmentStore, dev: true },
    CloudflareRateLimitInfrastructure,
    IdentityKeysModule,
    IdentityModule,
    IdentityDiscoveryModule,
    IdentityActorsModule,
    IdentityHostModule,
    WorkspaceModule,
    WorkspaceCapabilitiesModule,
    DashboardModule,
    ActivityRecorderModule,
    ActivityModule,
    ActivityCapabilitiesModule,
    NotificationsModule,
    NotificationsCapabilitiesModule,
    SearchModule,
    SearchCapabilitiesModule,
    ChannelsModule,
    ChannelsCapabilitiesModule,
    ContentModule,
    ContentCapabilitiesModule,
    ContentPublishableSourcesModule,
    PagesModule,
    PagesCapabilitiesModule,
    FilesModule,
    FilesCapabilitiesModule,
    PublishingModule,
    PublishingCapabilitiesModule,
    SeoModule,
    SeoCapabilitiesModule,
    VisualEditingModule,
    VisualEditingCapabilitiesModule,
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
      cache: ChannelHttpCachePolicy,
      // The server mints every request id: a client's `x-request-id` or `traceparent` does not choose it.
      requestId: { trustIncoming: false }
    },
    // One wide event for each request that a route serves, with its request id, written as one JSON line to the
    // standard output (Workers Logs on Cloudflare).
    logging: {
      drains: [new WideEventConsoleDrain()],
      wideEvents: true
    }
  }
}) {}
