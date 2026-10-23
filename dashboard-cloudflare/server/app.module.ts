import { Database } from "@heximon/persistence";
import { Module } from "@heximon/runtime";
import { ActivityModule } from "@inferative/activity/server";
import {
  AgentsModule,
  AgentsQuestionsModule,
  AgentsTrialModule,
  RunnerCapacityModule,
  RunnerLeaseTimersModule,
  RunnerPushModule,
  RunnersModule
} from "@inferative/agents/server";
import { AppletsModule } from "@inferative/applets/server";
import { CloudflareAssistantInfrastructure } from "@inferative/assistant/infrastructure/cloudflare";
import { AssistantModule } from "@inferative/assistant/server";
import {
  CloudflareRateLimitInfrastructure,
  CloudflareSagaTimerInfrastructure,
  CloudflareStorageInfrastructure
} from "@inferative/base/infrastructure/cloudflare";
import {
  ModelProxiesModule,
  SecretStoreModelProxyCredentialsModule
} from "@inferative/base/models";
import { RenderFrameFallthrough } from "@inferative/base/render";
import { RequestReadsMiddleware } from "@inferative/base/request";
import { SanitizerReleasesModule } from "@inferative/base/policy";
import { SecretsModule } from "@inferative/base/secrets";
import { BaseModule } from "@inferative/base/server";
import { TenantSeed } from "@inferative/base/tenant";
import {
  ChannelAdministrationCorsPolicy,
  ChannelFrameSourcePolicy,
  ChannelVaryHeaderContributor
} from "@inferative/channels/administration";
import { ChannelHttpCachePolicy, ChannelsModule } from "@inferative/channels/server";
import { CloningModule } from "@inferative/cloning/server";
import { ContentModule, ContentPublishableSourcesModule } from "@inferative/content/server";
import {
  AppletHostCallJointModule,
  AssistantPresenceJointModule,
  AssistantTranslationJointModule,
  ContentPagesJointModule,
  ContentPublishingJointModule,
  ContentTaxonomyJointModule,
  DashboardModule
} from "@inferative/dashboard/server";
import { DecisionsModule, DecisionsTimersModule } from "@inferative/decisions/server";
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
  OrganizationChartModule,
  OrganizationChartRoutesModule,
  RenderSessionMiddleware
} from "@inferative/identity/server";
import { LocaleNegotiationFallthrough, LocalizationModule } from "@inferative/localization/server";
import { McpModule } from "@inferative/mcp/server";
import { NotificationsModule } from "@inferative/notifications/server";
import { PagesModule } from "@inferative/pages/server";
import { ProjectsModule } from "@inferative/projects/server";
import { PublishingModule } from "@inferative/publishing/server";
import { CloudflareRealtimeInfrastructure } from "@inferative/realtime/infrastructure/cloudflare";
import {
  RealtimeBroadcastModule,
  RealtimeModule,
  RealtimeSweepModule
} from "@inferative/realtime/server";
import { SearchModule } from "@inferative/search/server";
import { SeoModule } from "@inferative/seo/server";
import { TaxonomyModule } from "@inferative/taxonomy/server";
import { VisualEditingModule } from "@inferative/visual-editing/server";
import { IdentityHostModule, RouteScopeGuard, WorkspaceModule } from "@inferative/workspace/server";
import { PersistenceModule } from "./persistence/pg/persistence.module";

/**
 * The root module of this dashboard. Each line of `imports` adds one capability: delete a line to remove it, and add
 * the module of another package (and its layer in `nuxt.config.ts`) to add one. `inferative.config.ts` holds the
 * values.
 */
export class AppModule extends Module({
  imports: [
    PersistenceModule,
    BaseModule,
    // The secret store, and the model proxy tokens kept in it.
    SecretsModule,
    SecretStoreModelProxyCredentialsModule,
    // The model proxy registry, which the assistant and the agents reach models through.
    ModelProxiesModule,
    // The sanitizer releases an organization keeps, and Settings › Organization › Sanitizers.
    SanitizerReleasesModule,
    // The one `Storage` of the Worker, in a Durable Object that every isolate reaches: the claims of command
    // idempotency, the approval latches and the session cache.
    CloudflareStorageInfrastructure,
    // The response cache, in its own Durable Object, so an edit in one isolate clears it for all.
    CloudflareResponseCacheInfrastructure,
    // The R2 bucket of the files and of the large assistant rows.
    CloudflareFilesStoreInfrastructure,
    // The S3 path to the same bucket, for `nuxt dev`. `dev: true` drops it, and the AWS SDK, from a production build.
    { module: FilesR2DevelopmentStore, dev: true },
    CloudflareRateLimitInfrastructure,
    CloudflareSagaTimerInfrastructure,
    CloudflareAssistantInfrastructure,
    CloudflareRealtimeInfrastructure,
    IdentityModule,
    IdentityDiscoveryModule,
    IdentityActorsModule,
    IdentityHostModule,
    OrganizationChartModule,
    OrganizationChartRoutesModule,
    WorkspaceModule,
    DashboardModule,
    ActivityModule,
    NotificationsModule,
    SearchModule,
    AssistantModule,
    AppletsModule,
    McpModule,
    ChannelsModule,
    ContentModule,
    ContentPublishableSourcesModule,
    LocalizationModule,
    CloningModule,
    RealtimeModule,
    RealtimeBroadcastModule,
    RealtimeSweepModule,
    PublishingModule,
    FilesModule,
    TaxonomyModule,
    PagesModule,
    SeoModule,
    VisualEditingModule,
    ProjectsModule,
    DecisionsTimersModule,
    DecisionsModule,
    AgentsModule,
    AgentsQuestionsModule,
    AgentsTrialModule,
    RunnersModule,
    RunnerCapacityModule,
    RunnerPushModule,
    RunnerLeaseTimersModule,
    ContentPagesJointModule,
    ContentPublishingJointModule,
    ContentTaxonomyJointModule,
    AssistantPresenceJointModule,
    AssistantTranslationJointModule,
    AppletHostCallJointModule
  ],
  http: {
    middlewares: [RequestReadsMiddleware],
    headers: [ChannelVaryHeaderContributor]
  },
  app: {
    // The API that the Vue app calls (`INFERATIVE_API_*`) and the locale facts (`INFERATIVE_LOCALIZATION_*`): the
    // server render and the browser read one value.
    config: { public: ["api", "localization"] },
    // Each command handler runs in a transaction on this database; a nested one joins it.
    cqrs: { autoTransaction: Database },
    // A single-message handler runs in the tenant of its event: one seed stores it in the message frame, for every channel.
    context: {
      seeds: [TenantSeed]
    },
    http: {
      // A page render starts in the negotiated locale and from the visitor's session. The render scope opens first,
      // so the session read already goes through the memo of the render.
      fallthrough: [RenderFrameFallthrough, LocaleNegotiationFallthrough, RenderSessionMiddleware],
      // A request under the API mount that no route serves answers a problem document, never a page.
      owns: ["/api"],
      // The websites of the channels live on other origins: they call the channel routes, and the visual editor
      // frames them. `INFERATIVE_CHANNELS_ADMINISTRATION_ORIGINS` lists the origins.
      cors: ChannelAdministrationCorsPolicy,
      securityHeaders: ChannelFrameSourcePolicy,
      cache: ChannelHttpCachePolicy,
      // A route's declared scopes enforce nothing until a guard reads them. The build fails for a composed package
      // that records no such check.
      scopeEnforcer: RouteScopeGuard,
      requireCheckedPackages: true,
      // The server mints every request id: a client's `x-request-id` or `traceparent` does not choose it.
      requestId: { trustIncoming: false }
    }
  }
}) {}
