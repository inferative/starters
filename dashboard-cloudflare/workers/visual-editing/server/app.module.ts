import { Database } from "@heximon/persistence";
import { Module } from "@heximon/runtime";
import { ScheduleLease } from "@heximon/schedule";
import { ActingContextGate } from "@inferative/base/actors";
import { CloudflareRemoteStorageInfrastructure } from "@inferative/base/infrastructure/cloudflare";
import { RequestReadsMiddleware } from "@inferative/base/request";
import { BaseModule } from "@inferative/base/server";
import { SecondaryScheduleLease } from "@inferative/base/storage/shared";
import { DashboardModule } from "@inferative/dashboard/server";
import { IdentityModule } from "@inferative/identity/server";
import { TenantSeed } from "@inferative/base/tenant";
import { VisualEditingModule } from "@inferative/visual-editing/server";
import { PersistenceModule } from "./persistence/persistence.module";

/**
 * The root module of the Worker of the visual editor: the base, the `Storage` of the dashboard Worker and
 * `VisualEditingModule`. The dashboard Worker publishes `channel.archived` and `channel.disabled`, and the reactors of
 * the visual editor here stop the live editing sessions of that channel.
 *
 * A route of the hostname sends `/api/visual-editing/*` here, and the dashboard Worker calls the same routes over its
 * service binding during a server render, with the caller's cookie or `authorization`. This Worker resolves the caller
 * itself, from the database that both Workers share: `IdentityModule` validates the session or the key, and
 * `DashboardModule` gives the acting context of the base to the gates of the visual editor. No other route of identity
 * is reachable: no route of the hostname sends one here.
 *
 * The dashboard Worker owns the shared state. This Worker runs no migration. Its `Storage` is the `StorageRoom` of
 * the dashboard Worker, so a session that the dashboard ends is gone here too. The base and identity run the same
 * scheduled jobs in both Workers: {@link SecondaryScheduleLease} claims each tick in that room, so one Worker runs it,
 * and it leaves the model-proxy probes to the dashboard, whose secret store holds their keys.
 */
export class AppModule extends Module({
  imports: [
    PersistenceModule,
    BaseModule,
    CloudflareRemoteStorageInfrastructure,
    IdentityModule,
    DashboardModule,
    VisualEditingModule
  ],
  // One Worker of the deployment runs each tick of a job that both Workers compose; the owner jobs stay with the
  // dashboard Worker.
  providers: [{ provide: ScheduleLease, useClass: SecondaryScheduleLease }],
  http: { middlewares: [RequestReadsMiddleware] },
  app: {
    // Each command handler runs in a transaction on this database; a nested one joins it.
    cqrs: { autoTransaction: Database },
    // A single-message handler runs in the tenant of its event.
    context: { seeds: [TenantSeed] },
    http: {
      // A request under the API mount that no route serves answers a problem document.
      owns: ["/api"],
      // The gate of the routes of this Worker. The build fails for a composed package that records no scope check.
      scopeEnforcer: ActingContextGate,
      requireCheckedPackages: true
    }
  }
}) {}
