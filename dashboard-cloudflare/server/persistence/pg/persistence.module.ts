import { Module } from "@heximon/runtime";
import { DurableTimerStore } from "@heximon/saga";
import { WorkflowEventStore, WorkflowInstanceStore, WorkflowStepStore } from "@heximon/workflow";
import {
  DrizzleWorkflowEventStore,
  DrizzleWorkflowInstanceStore,
  DrizzleWorkflowStepStore
} from "@heximon/workflow/node";
import {
  WorkflowEvents,
  WorkflowInstances,
  WorkflowSteps
} from "@inferative/assistant/persistence/pg/schema";
import { PgMigrations } from "@inferative/base/persistence/pg/migrations";
import { HostDatabase } from "./database";
import { DatabaseModule } from "./database.module";

/**
 * The database of the dashboard: the one connection, the migrations and the three stores of the assistant's API runs.
 * The persistence module of each package is a line of `server/app.module.ts`, not of this module: the root reads every
 * export of a module of this app when it loads, so through this module the first request that reaches the root would
 * load the persistence of every package.
 */
export class PersistenceModule extends Module({
  requires: [DurableTimerStore],
  imports: [DatabaseModule, PgMigrations],
  providers: [
    // The workflow engine of `nuxt dev` resolves its `Database` and its timer store in the scope of the module that
    // owns these stores, so they sit here: the connection is an import, and the timer store a requirement that the
    // root fills from `PgDurableTimerTier`.
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
  exports: [DatabaseModule, WorkflowStepStore, WorkflowInstanceStore, WorkflowEventStore]
}) {}
