import { Module } from "@heximon/runtime";
import { WorkflowEventStore, WorkflowInstanceStore, WorkflowStepStore } from "@heximon/workflow";
import {
  DrizzleWorkflowEventStore,
  DrizzleWorkflowInstanceStore,
  DrizzleWorkflowStepStore
} from "@heximon/workflow/node";
import { PgActivityPersistence } from "@inferative/activity/persistence/pg";
import { PgAgentsPersistence } from "@inferative/agents/persistence/pg";
import { PgAppletsPersistence } from "@inferative/applets/persistence/pg";
import { PgAssistantPersistence } from "@inferative/assistant/persistence/pg";
import {
  WorkflowEvents,
  WorkflowInstances,
  WorkflowSteps
} from "@inferative/assistant/persistence/pg/schema";
import { ChannelContext } from "@inferative/base/channel";
import { LiveEntityAnnouncer } from "@inferative/base/entity";
import { PgBasePersistence, PgSecretsPersistence } from "@inferative/base/persistence/pg";
import { PgDurableTimerTier } from "@inferative/base/persistence/pg/durable-timers";
import { PgMigrations } from "@inferative/base/persistence/pg/migrations";
import { PolicyCheck } from "@inferative/base/policy";
import { PgChannelsPersistence } from "@inferative/channels/persistence/pg";
import { PgCloningPersistence } from "@inferative/cloning/persistence/pg";
import { PgContentPersistence } from "@inferative/content/persistence/pg";
import { PgDecisionsPersistence } from "@inferative/decisions/persistence/pg";
import { PgFilesPersistence } from "@inferative/files/persistence/pg";
import { PgIdentityPersistence } from "@inferative/identity/persistence/pg";
import { PgLocalizationPersistence } from "@inferative/localization/persistence/pg";
import {
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
import { HostDatabase } from "./database";
import { DatabaseModule } from "./database.module";

/**
 * The database of the dashboard: the one connection, the migrations, the persistence module of each package and the
 * three stores of the assistant's API runs.
 */
export class PersistenceModule extends Module({
  requires: [LiveEntityAnnouncer, PolicyCheck, ChannelContext],
  imports: [
    DatabaseModule,
    PgMigrations,
    PgActivityPersistence,
    PgAgentsPersistence,
    PgAppletsPersistence,
    PgAssistantPersistence,
    PgBasePersistence,
    PgSecretsPersistence,
    PgDurableTimerTier,
    PgChannelsPersistence,
    PgCloningPersistence,
    PgContentPersistence,
    PgDecisionsPersistence,
    PgFilesPersistence,
    PgIdentityPersistence,
    PgInboxPersistence,
    PgLocalizationPersistence,
    PgNotificationsPersistence,
    PgPagesPersistence,
    PgProjectsPersistence,
    PgPublishingPersistence,
    PgRealtimePersistence,
    PgSearchPersistence,
    PgSeoPersistence,
    PgTaxonomyPersistence,
    PgVisualEditingPersistence,
    PgWorkspacePersistence
  ],
  providers: [
    // The workflow engine of `nuxt dev` resolves its `Database` and its timer store in the scope of the module that
    // owns these stores, so they sit here, where both are in scope.
    {
      provide: WorkflowStepStore,
      useFactory: (database: HostDatabase): WorkflowStepStore =>
        new DrizzleWorkflowStepStore(database, WorkflowSteps)
    },
    {
      provide: WorkflowInstanceStore,
      useFactory: (database: HostDatabase): WorkflowInstanceStore =>
        new DrizzleWorkflowInstanceStore(database, WorkflowInstances)
    },
    {
      provide: WorkflowEventStore,
      useFactory: (database: HostDatabase): WorkflowEventStore =>
        new DrizzleWorkflowEventStore(database, WorkflowEvents)
    }
  ],
  exports: [
    DatabaseModule,
    PgActivityPersistence,
    PgAgentsPersistence,
    PgAppletsPersistence,
    PgAssistantPersistence,
    PgBasePersistence,
    PgSecretsPersistence,
    PgDurableTimerTier,
    PgChannelsPersistence,
    PgCloningPersistence,
    PgContentPersistence,
    PgDecisionsPersistence,
    PgFilesPersistence,
    PgIdentityPersistence,
    PgInboxPersistence,
    PgLocalizationPersistence,
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
    WorkflowStepStore,
    WorkflowInstanceStore,
    WorkflowEventStore
  ]
}) {}
