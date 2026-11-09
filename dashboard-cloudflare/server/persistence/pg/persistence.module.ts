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
 * The connection, the migrations and the stores of the assistant's API runs. Each package's persistence module stays a
 * line of `server/app.module.ts`: here, the first request would load them all.
 */
export class PersistenceModule extends Module({
  requires: [DurableTimerStore],
  imports: [DatabaseModule, PgMigrations],
  providers: [
    // The workflow engine of `nuxt dev` resolves its `Database` and its timer store in the scope of these stores.
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
