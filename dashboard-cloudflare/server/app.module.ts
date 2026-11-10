import { Database } from "@heximon/persistence";
import { Module } from "@heximon/runtime";
import { ScheduleTickRoom, ScheduleTickRoomFactory } from "@heximon/schedule/durable";
import { ScheduleRecoveryMiddleware } from "@heximon/schedule/durable/http";
import { StorageModule, StorageRateLimitModule } from "@inferative/base/storage";
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
import {
  AgentsCapabilitiesModule,
  AgentsQuestionsCapabilitiesModule,
  AgentsTrialCapabilitiesModule,
  RunnerPushCapabilitiesModule,
  RunnersCapabilitiesModule
} from "@inferative/agents/capabilities";
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
  CloudflareLocationCacheInfrastructure,
  CloudflareSagaTimerInfrastructure
} from "@inferative/base/infrastructure/cloudflare";
import {
  ModelConnectionsModule,
  ModelProxiesModule,
  SecretStoreModelConnectionCredentialsModule
} from "@inferative/base/models";
import {
  ModelConnectionsCapabilitiesModule,
  ModelProxiesCapabilitiesModule,
  SanitizerReleasesCapabilitiesModule
} from "@inferative/base/capabilities";
import {
  HostCheck,
  HostCheckFallthrough,
  HostCheckMiddleware,
  HostCheckSeat
} from "@inferative/base/origin";
import { LocationCacheMiddleware, LocationCacheModule } from "@inferative/base/location-cache";
import { RenderFrameFallthrough } from "@inferative/base/render";
import { WideEventConsoleDrain } from "@heximon/logging";
import {
  ReadOnlyDispatchMiddleware,
  RequestReadsMiddleware,
  TableViewsCarryMiddleware
} from "@inferative/base/request";
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
import { ChannelStampReadModule } from "@inferative/channels/stamp-read";
import { CloningModule } from "@inferative/cloning/server";
import { CloningCapabilitiesModule } from "@inferative/cloning/capabilities";
import {
  ConnectorTriggersModule,
  ConnectorsCapabilitiesModule,
  ConnectorsModule
} from "@inferative/connectors/server";
import { ContentModule, ContentPublishableSourcesModule } from "@inferative/content/server";
import { ContentCapabilitiesModule } from "@inferative/content/capabilities";
import {
  AppletHostCallJointModule,
  AssistantOpinionReviewerJointModule,
  AssistantPresenceJointModule,
  AssistantTranslationJointModule,
  ContentPagesJointModule,
  ContentPublishingJointModule,
  ContentTaxonomyJointModule,
  DashboardCapabilitiesModule,
  DashboardModule
} from "@inferative/dashboard/server";
import { DecisionsModule, DecisionsTimersModule } from "@inferative/decisions/server";
import { DecisionsCapabilitiesModule } from "@inferative/decisions/capabilities";
import {
  CloudflareFilesDeliveryCacheInfrastructure,
  CloudflareFilesStoreInfrastructure
} from "@inferative/files/infrastructure/cloudflare";
import { FilesR2DevelopmentStore } from "@inferative/files/infrastructure/cloudflare/development";
import { FilesModule, IsolateResponseCacheModule } from "@inferative/files/server";
import { FilesCapabilitiesModule } from "@inferative/files/capabilities";
import { FormsModule } from "@inferative/forms/server";
import { FormsCapabilitiesModule } from "@inferative/forms/capabilities";
import { IdentityKeysModule, RenderSessionMiddleware } from "@inferative/identity/keys";
import {
  IdentityActorsModule,
  IdentityDiscoveryModule,
  IdentityModule,
  OrganizationChartModule,
  OrganizationChartRoutesModule,
  OrganizationEngagementsModule
} from "@inferative/identity/server";
import {
  OrganizationChartCapabilitiesModule,
  OrganizationEngagementsCapabilitiesModule
} from "@inferative/identity/capabilities";
import { LocaleNegotiationFallthrough, LocalizationModule } from "@inferative/localization/server";
import { LocalizationCapabilitiesModule } from "@inferative/localization/capabilities";
import { McpModule } from "@inferative/mcp/server";
import { McpCapabilitiesModule } from "@inferative/mcp/capabilities";
import { MemoryModule } from "@inferative/memory/server";
import { MemoryCapabilitiesModule } from "@inferative/memory/capabilities";
import {
  ChatDeliveryTimersModule,
  ChatLinkSeatModule,
  ChatModule,
  NotificationTemplatesModule,
  NotificationsModule,
  SendingSettingsModule
} from "@inferative/notifications/server";
import {
  ChatCapabilitiesModule,
  NotificationTemplatesCapabilitiesModule,
  NotificationsCapabilitiesModule,
  SendingSettingsCapabilitiesModule
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
  PgStoragePersistence,
  PgModelConnectionsPersistence,
  PgModelProxiesPersistence,
  PgTimeLimitFilter,
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
import { PgFormsPersistence } from "@inferative/forms/persistence/pg";
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
import { EmailEventsHandler } from "./email-events.handler";
import { PersistenceModule } from "./persistence/pg/persistence.module";

/**
 * The root module of this dashboard. Each line of `imports` adds one capability: delete a line to remove it.
 * `inferative.config.ts` holds the values.
 */
export class AppModule extends Module({
  imports: [
    PersistenceModule,
    // One line per package, so a first request loads only the persistence modules that it uses.
    PgActivityPersistence,
    PgAgentsPersistence,
    PgAppletsPersistence,
    PgAssistantPersistence,
    PgBasePersistence,
    PgStoragePersistence,
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
    PgFormsPersistence,
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
    SecretsModule,
    ModelProxiesModule,
    ModelProxiesCapabilitiesModule,
    SecretStoreModelConnectionCredentialsModule,
    ModelConnectionsModule,
    ModelConnectionsCapabilitiesModule,
    SanitizerReleasesModule,
    SanitizerReleasesCapabilitiesModule,
    // The one `Storage` of the Worker, which every isolate shares: the `storage_entries` table of the database
    // (`base.storage.driver: "database"`). The rate limits count in it.
    StorageModule,
    StorageRateLimitModule,
    // The response cache lives in each isolate; an edit empties every isolate through a hint in the `Storage`.
    IsolateResponseCacheModule,
    // The public reads stay in each location of the platform, purged by tag; the platform settings switch it on.
    LocationCacheModule,
    CloudflareLocationCacheInfrastructure,
    CloudflareFilesStoreInfrastructure,
    // The S3 path to the R2 bucket for `nuxt dev`. `dev: true` keeps it, and the AWS SDK, out of a production build.
    { module: FilesR2DevelopmentStore, dev: true },
    // The Workers Cache keeps public file bytes (`server/files-delivery.entrypoint.ts`); a change purges them by tag.
    CloudflareFilesDeliveryCacheInfrastructure,
    CloudflareSagaTimerInfrastructure,
    CloudflareAssistantInfrastructure,
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
    OrganizationEngagementsModule,
    OrganizationEngagementsCapabilitiesModule,
    WorkspaceModule,
    WorkspaceCapabilitiesModule,
    DashboardModule,
    DashboardCapabilitiesModule,
    ActivityRecorderModule,
    ActivityModule,
    ActivityCapabilitiesModule,
    NotificationsModule,
    // The mail templates of each organization: the block editor, the brand layout, the preview and the test.
    NotificationTemplatesModule,
    NotificationTemplatesCapabilitiesModule,
    NotificationsCapabilitiesModule,
    SendingSettingsModule,
    SendingSettingsCapabilitiesModule,
    ChatModule,
    ChatCapabilitiesModule,
    ChatLinkSeatModule,
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
    // The stamp read as a graph of its own: the stamp fill route of `heximon.config.ts` builds it, not the app.
    ChannelStampReadModule,
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
    MemoryModule,
    MemoryCapabilitiesModule,
    FormsModule,
    FormsCapabilitiesModule,
    ConnectorsModule,
    ConnectorsCapabilitiesModule,
    ConnectorTriggersModule,
    AgentsModule,
    AgentsCapabilitiesModule,
    AgentsQuestionsModule,
    AgentsQuestionsCapabilitiesModule,
    AgentsTrialModule,
    AgentsTrialCapabilitiesModule,
    RunnersModule,
    RunnersCapabilitiesModule,
    RunnerCapacityModule,
    RunnerPushModule,
    RunnerPushCapabilitiesModule,
    RunnerLeaseTimersModule,
    AgentWakeTimersModule,
    ContentPagesJointModule,
    ContentPublishingJointModule,
    ContentTaxonomyJointModule,
    AssistantPresenceJointModule,
    // The `assistant` section alone: the joints below read it without loading the whole assistant.
    AssistantConfigModule,
    AssistantTranslationJointModule,
    AssistantOpinionReviewerJointModule,
    AppletHostCallJointModule
  ],
  // The streams and the CORS preflights, which no middleware wraps, check the host through this.
  contributes: [{ to: HostCheckSeat, useClass: HostCheck }],
  // The queue that Cloudflare Email Service writes its delivery events to. Delete the line and the file to remove it.
  queue: { raw: [EmailEventsHandler] },
  // The clock of the scheduled jobs: one Durable Object of this Worker whose alarm fires the minute tick
  // (`schedule` in `heximon.config.ts`). It keeps only the time of its last tick.
  durable: { objects: [ScheduleTickRoom], factories: [ScheduleTickRoomFactory] },
  http: {
    // A public read that a location keeps is answered first. Then the host check. Then the clock check: when the
    // Worker's start did not arm the clock's alarm, a request arms it. A tool call of a read route runs in a read
    // transaction. A table's row read that asks for it carries the table's saved views listing.
    middlewares: [
      LocationCacheMiddleware,
      HostCheckMiddleware,
      ScheduleRecoveryMiddleware,
      RequestReadsMiddleware,
      TableViewsCarryMiddleware,
      ReadOnlyDispatchMiddleware
    ],
    // A statement over a time limit of the pool is a 503 that offers a retry only for a safe method.
    errorFilters: [PgTimeLimitFilter],
    headers: [ChannelVaryHeaderContributor]
  },
  app: {
    // The server render and the browser read one value of these sections.
    config: { public: ["api", "localization"] },
    cqrs: { autoTransaction: Database },
    context: {
      seeds: [TenantSeed]
    },
    http: {
      // The render scope opens before the locale and the session, so the session read goes through its memo.
      fallthrough: [
        HostCheckFallthrough,
        RenderFrameFallthrough,
        LocaleNegotiationFallthrough,
        RenderSessionMiddleware
      ],
      owns: ["/api"],
      // The channel websites call the channel routes from other origins, and the visual editor frames them.
      cors: ChannelAdministrationCorsPolicy,
      securityHeaders: ChannelFrameSourcePolicy,
      cache: ChannelHttpCachePolicy,
      scopeEnforcer: RouteScopeGuard,
      requireCheckedPackages: true,
      // The server mints every request id: a client header does not choose it.
      requestId: { trustIncoming: false }
    },
    logging: {
      drains: [new WideEventConsoleDrain()],
      wideEvents: true
    }
  }
}) {}
