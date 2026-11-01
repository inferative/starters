import { Database } from "@heximon/persistence";
import { Module } from "@heximon/runtime";
import { ActivityRecorderModule } from "@inferative/activity/recorder";
import { ActivityModule } from "@inferative/activity/server";
import { ActivityCapabilitiesModule } from "@inferative/activity/capabilities";
import {
  AgentsModule,
  AgentsQuestionsModule,
  AgentsTrialModule,
  AgentWakeTimersModule,
  RunnerCapacityModule,
  RunnerLeaseTimersModule,
  RunnerPushModule,
  RunnersModule
} from "@inferative/agents/server";
import { AgentsCapabilitiesModule } from "@inferative/agents/capabilities";
import { AppletsModule } from "@inferative/applets/server";
import { AppletsCapabilitiesModule } from "@inferative/applets/capabilities";
import {
  CloudflareAssistantInfrastructure,
  CloudflareAttachmentTextInfrastructure
} from "@inferative/assistant/infrastructure/cloudflare";
import { AssistantConfigModule } from "@inferative/assistant/config";
import { AssistantModule } from "@inferative/assistant/server";
import { AssistantCapabilitiesModule } from "@inferative/assistant/capabilities";
import {
  CloudflareRateLimitInfrastructure,
  CloudflareSagaTimerInfrastructure,
  CloudflareStorageInfrastructure
} from "@inferative/base/infrastructure/cloudflare";
import {
  ModelConnectionsModule,
  ModelProxiesModule,
  SecretStoreModelConnectionCredentialsModule
} from "@inferative/base/models";
import {
  ModelProxiesCapabilitiesModule,
  SanitizerReleasesCapabilitiesModule
} from "@inferative/base/capabilities";
import {
  HostCheck,
  HostCheckFallthrough,
  HostCheckMiddleware,
  HostCheckSeat
} from "@inferative/base/origin";
import { RenderFrameFallthrough } from "@inferative/base/render";
import { WideEventConsoleDrain } from "@heximon/logging";
import { ReadOnlyDispatchMiddleware, RequestReadsMiddleware } from "@inferative/base/request";
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
import { ChannelsCapabilitiesModule } from "@inferative/channels/capabilities";
import { CloningModule } from "@inferative/cloning/server";
import { CloningCapabilitiesModule } from "@inferative/cloning/capabilities";
import { ConnectorsModule, ConnectorTriggersModule } from "@inferative/connectors/server";
import { ContentModule, ContentPublishableSourcesModule } from "@inferative/content/server";
import { ContentCapabilitiesModule } from "@inferative/content/capabilities";
import {
  AppletHostCallJointModule,
  AssistantPresenceJointModule,
  AssistantOpinionReviewerJointModule,
  AssistantTranslationJointModule,
  ContentPagesJointModule,
  ContentPublishingJointModule,
  ContentTaxonomyJointModule,
  DashboardModule
} from "@inferative/dashboard/server";
import { DecisionsModule, DecisionsTimersModule } from "@inferative/decisions/server";
import { DecisionsCapabilitiesModule } from "@inferative/decisions/capabilities";
import { CloudflareFilesStoreInfrastructure } from "@inferative/files/infrastructure/cloudflare";
import { FilesR2DevelopmentStore } from "@inferative/files/infrastructure/cloudflare/development";
import { FilesModule, IsolateResponseCacheModule } from "@inferative/files/server";
import { FilesCapabilitiesModule } from "@inferative/files/capabilities";
import { IdentityKeysModule, RenderSessionMiddleware } from "@inferative/identity/keys";
import {
  IdentityActorsModule,
  IdentityDiscoveryModule,
  IdentityModule,
  OrganizationChartModule,
  OrganizationChartRoutesModule
} from "@inferative/identity/server";
import { OrganizationChartCapabilitiesModule } from "@inferative/identity/capabilities";
import { LocaleNegotiationFallthrough, LocalizationModule } from "@inferative/localization/server";
import { LocalizationCapabilitiesModule } from "@inferative/localization/capabilities";
import { McpModule } from "@inferative/mcp/server";
import { McpCapabilitiesModule } from "@inferative/mcp/capabilities";
import { MemoryModule } from "@inferative/memory/server";
import { MemoryCapabilitiesModule } from "@inferative/memory/capabilities";
import {
  ChatDeliveryTimersModule,
  ChatModule,
  MailKeySettingsModule,
  NotificationsModule
} from "@inferative/notifications/server";
import {
  ChatCapabilitiesModule,
  NotificationsCapabilitiesModule
} from "@inferative/notifications/capabilities";
import { PagesModule } from "@inferative/pages/server";
import { PagesCapabilitiesModule } from "@inferative/pages/capabilities";
import { ProjectsModule } from "@inferative/projects/server";
import { ProjectsCapabilitiesModule } from "@inferative/projects/capabilities";
import { PublishingModule } from "@inferative/publishing/server";
import { PublishingCapabilitiesModule } from "@inferative/publishing/capabilities";
import { CloudflareRealtimeInfrastructure } from "@inferative/realtime/infrastructure/cloudflare";
import {
  RealtimeBroadcastModule,
  RealtimeModule,
  RealtimeSweepModule
} from "@inferative/realtime/server";
import { RealtimeCapabilitiesModule } from "@inferative/realtime/capabilities";
import { SearchModule } from "@inferative/search/server";
import { SearchCapabilitiesModule } from "@inferative/search/capabilities";
import { SeoModule } from "@inferative/seo/server";
import { SeoCapabilitiesModule } from "@inferative/seo/capabilities";
import { TaxonomyModule } from "@inferative/taxonomy/server";
import { TaxonomyCapabilitiesModule } from "@inferative/taxonomy/capabilities";
import { VisualEditingModule } from "@inferative/visual-editing/server";
import { VisualEditingCapabilitiesModule } from "@inferative/visual-editing/capabilities";
import { IdentityHostModule, RouteScopeGuard, WorkspaceModule } from "@inferative/workspace/server";
import { WorkspaceCapabilitiesModule } from "@inferative/workspace/capabilities";
import { PgActivityPersistence } from "@inferative/activity/persistence/pg";
import { PgAgentsPersistence } from "@inferative/agents/persistence/pg";
import { PgAppletsPersistence } from "@inferative/applets/persistence/pg";
import { PgAssistantPersistence } from "@inferative/assistant/persistence/pg";
import {
  PgBasePersistence,
  PgModelConnectionsPersistence,
  PgModelProxiesPersistence,
  PgSanitizerReleasesPersistence,
  PgSecretsPersistence
} from "@inferative/base/persistence/pg";
import { PgDurableTimerTier } from "@inferative/base/persistence/pg/durable-timers";
import { PgChannelsPersistence } from "@inferative/channels/persistence/pg";
import { PgCloningPersistence } from "@inferative/cloning/persistence/pg";
import { PgConnectorsPersistence } from "@inferative/connectors/persistence/pg";
import { PgContentPersistence } from "@inferative/content/persistence/pg";
import { PgDecisionsPersistence } from "@inferative/decisions/persistence/pg";
import { PgFilesPersistence } from "@inferative/files/persistence/pg";
import { PgIdentityPersistence } from "@inferative/identity/persistence/pg";
import { PgLocalizationPersistence } from "@inferative/localization/persistence/pg";
import { PgMemoryPersistence } from "@inferative/memory/persistence/pg";
import {
  PgChatPersistence,
  PgInboxPersistence,
  PgNotificationsPersistence
} from "@inferative/notifications/persistence/pg";
import { PgPagesPersistence } from "@inferative/pages/persistence/pg";
import { PgProjectsPersistence } from "@inferative/projects/persistence/pg";
import { PgPublishingPersistence } from "@inferative/publishing/persistence/pg";
import { PgRealtimePersistence } from "@inferative/realtime/persistence/pg";
import { PgSearchPersistence } from "@inferative/search/persistence/pg";
import { PgSeoPersistence } from "@inferative/seo/persistence/pg";
import { PgTaxonomyPersistence } from "@inferative/taxonomy/persistence/pg";
import { PgVisualEditingPersistence } from "@inferative/visual-editing/persistence/pg";
import { PgWorkspacePersistence } from "@inferative/workspace/persistence/pg";
import { DemoSeedModule } from "./demo/demo-seed.module";
import { PersistenceModule } from "./persistence/pg/persistence.module";

/**
 * The root module of this dashboard. Each line of `imports` adds one capability: delete a line to remove it, and add
 * the module of another package, its persistence module (and its layer in `nuxt.config.ts`) to add one.
 * `inferative.config.ts` holds the values.
 */
export class AppModule extends Module({
  imports: [
    // The connection, the migrations and the stores of the assistant's API runs.
    PersistenceModule,
    // The Postgres persistence module of each package. They are lines of this module: a first request then loads only
    // the persistence modules that it uses.
    PgActivityPersistence,
    PgAgentsPersistence,
    PgAppletsPersistence,
    PgAssistantPersistence,
    PgBasePersistence,
    PgSecretsPersistence,
    PgModelConnectionsPersistence,
    PgModelProxiesPersistence,
    PgSanitizerReleasesPersistence,
    PgDurableTimerTier,
    PgChannelsPersistence,
    PgCloningPersistence,
    PgConnectorsPersistence,
    PgContentPersistence,
    PgDecisionsPersistence,
    PgFilesPersistence,
    PgIdentityPersistence,
    PgChatPersistence,
    PgInboxPersistence,
    PgLocalizationPersistence,
    PgMemoryPersistence,
    PgNotificationsPersistence,
    PgPagesPersistence,
    PgProjectsPersistence,
    PgPublishingPersistence,
    PgRealtimePersistence,
    PgSearchPersistence,
    PgSeoPersistence,
    PgTaxonomyPersistence,
    PgVisualEditingPersistence,
    PgWorkspacePersistence,
    BaseModule,
    // The secret store.
    SecretsModule,
    // The calls through the model proxies (connections at a typed address), which the assistant and the agents reach
    // models through.
    ModelProxiesModule,
    ModelProxiesCapabilitiesModule,
    // The model connections, with each credential in the secret store, and the move of the keys and proxies from
    // before them.
    SecretStoreModelConnectionCredentialsModule,
    ModelConnectionsModule,
    // The sanitizer releases an organization keeps, and Settings › AI › Sanitizers.
    SanitizerReleasesModule,
    SanitizerReleasesCapabilitiesModule,
    // The one `Storage` of the Worker, in a Durable Object that every isolate reaches: the claims of command
    // idempotency, the approval latches and the session cache.
    CloudflareStorageInfrastructure,
    // The response cache, in the memory of each isolate within the `responseCache` bounds. An edit empties it in its
    // isolate at once and in every other isolate within a second, through a hint in the `Storage` above.
    IsolateResponseCacheModule,
    // The R2 bucket of the files and of the large assistant rows.
    CloudflareFilesStoreInfrastructure,
    // The S3 path to the same bucket, for `nuxt dev`. `dev: true` drops it, and the AWS SDK, from a production build.
    { module: FilesR2DevelopmentStore, dev: true },
    CloudflareRateLimitInfrastructure,
    CloudflareSagaTimerInfrastructure,
    CloudflareAssistantInfrastructure,
    // The text of attached PDF and Office files, read in the applets Worker over the `ATTACHMENT_TEXT` binding.
    CloudflareAttachmentTextInfrastructure,
    CloudflareRealtimeInfrastructure,
    IdentityKeysModule,
    IdentityModule,
    IdentityDiscoveryModule,
    IdentityActorsModule,
    IdentityHostModule,
    OrganizationChartModule,
    OrganizationChartCapabilitiesModule,
    OrganizationChartRoutesModule,
    WorkspaceModule,
    WorkspaceCapabilitiesModule,
    DashboardModule,
    ActivityRecorderModule,
    ActivityModule,
    ActivityCapabilitiesModule,
    NotificationsModule,
    NotificationsCapabilitiesModule,
    // The screen of the mail provider's key, for an operator of the platform organization.
    MailKeySettingsModule,
    // A member's linked Telegram chat: on once the three `INFERATIVE_NOTIFICATIONS_CHAT_TELEGRAM_*` values are set.
    ChatModule,
    ChatCapabilitiesModule,
    // The timer that sends a chat item at its slot in the chat's pace (one message a second).
    ChatDeliveryTimersModule,
    SearchModule,
    SearchCapabilitiesModule,
    AssistantModule,
    AssistantCapabilitiesModule,
    AppletsModule,
    AppletsCapabilitiesModule,
    McpModule,
    McpCapabilitiesModule,
    ChannelsModule,
    ChannelsCapabilitiesModule,
    ContentModule,
    ContentCapabilitiesModule,
    ContentPublishableSourcesModule,
    LocalizationModule,
    LocalizationCapabilitiesModule,
    CloningModule,
    CloningCapabilitiesModule,
    RealtimeModule,
    RealtimeCapabilitiesModule,
    RealtimeBroadcastModule,
    RealtimeSweepModule,
    PublishingModule,
    PublishingCapabilitiesModule,
    FilesModule,
    FilesCapabilitiesModule,
    TaxonomyModule,
    TaxonomyCapabilitiesModule,
    PagesModule,
    PagesCapabilitiesModule,
    SeoModule,
    SeoCapabilitiesModule,
    VisualEditingModule,
    VisualEditingCapabilitiesModule,
    ProjectsModule,
    ProjectsCapabilitiesModule,
    DecisionsTimersModule,
    DecisionsModule,
    DecisionsCapabilitiesModule,
    // What agents and assistants remember: the memory library, its proposals and search, and the data map.
    MemoryModule,
    MemoryCapabilitiesModule,
    // The organization's forge connections, its outside connections (My connections, Settings › Organization ›
    // Connections) and the webhook route of the deployment's GitHub App, which reports a failed CI check to the
    // agent that pushed. The App is a host setting: README.md, "GitHub".
    ConnectorsModule,
    ConnectorTriggersModule,
    AgentsModule,
    AgentsCapabilitiesModule,
    AgentsQuestionsModule,
    AgentsTrialModule,
    RunnersModule,
    RunnerCapacityModule,
    RunnerPushModule,
    RunnerLeaseTimersModule,
    // The timer that starts an agent's retry at the instant it waits for, not up to a minute late at the sweep.
    AgentWakeTimersModule,
    ContentPagesJointModule,
    ContentPublishingJointModule,
    ContentTaxonomyJointModule,
    AssistantPresenceJointModule,
    // The `assistant` section on its own, which the translation and opinion reviewer joints read: their first read
    // then loads this module and not the whole assistant.
    AssistantConfigModule,
    AssistantTranslationJointModule,
    AssistantOpinionReviewerJointModule,
    AppletHostCallJointModule,
    // The demo data of a test install, which `heximon task run DemoSeedModule SeedDemo` loads. No route runs it.
    DemoSeedModule
  ],
  // The streams and the CORS preflights, which the middlewares do not wrap, check the host through this check.
  contributes: [{ to: HostCheckSeat, useClass: HostCheck }],
  http: {
    // The host check comes first: a request on a host that the deployment does not serve does nothing else. A tool
    // call of a route that declares itself a read runs in a read transaction, so a write in it fails.
    middlewares: [HostCheckMiddleware, RequestReadsMiddleware, ReadOnlyDispatchMiddleware],
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
      // A page on a host that the deployment does not serve is refused first. A page render starts in the negotiated
      // locale and from the visitor's session. The render scope opens before them, so the session read already goes
      // through the memo of the render.
      fallthrough: [
        HostCheckFallthrough,
        RenderFrameFallthrough,
        LocaleNegotiationFallthrough,
        RenderSessionMiddleware
      ],
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
    },
    // One wide event for each request that a route serves, with its request id, written as one JSON line to the
    // standard output (Workers Logs on Cloudflare).
    logging: {
      drains: [new WideEventConsoleDrain()],
      wideEvents: true
    }
  }
}) {}
