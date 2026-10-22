import { defineHeximonConfig } from "@heximon/build";
import type {} from "@heximon/cloudflare/compiler";
import { inferativeServerPlugins } from "@inferative/base/compiler";
import { WorkerTopology } from "../worker-topology.ts";

// This Worker exists in the split topology only. A build without the setting would read the dashboard as one Worker
// and send the events of this Worker to a service that the deployment does not run.
if (!WorkerTopology.isSeparate("visual-editing")) {
  throw new Error(
    `The Worker of the visual editor builds only with ${WorkerTopology.variable}=visual-editing.`
  );
}

/**
 * The compiler config of the Worker of the visual editor. It is the service `visual-editing` of the deployment, whose
 * services are the dashboard at the project root and the hosts under `workers/` (`crossService.workspaceRoot`): the
 * build reads which events each one subscribes to. The Worker drains its own queue, `heximon-ie-visual-editing`, and
 * sends an event that the dashboard subscribes to into `heximon-ie-dashboard`. Its outbox relay drains only the rows
 * of the service `visual-editing` from the one outbox table. The deploy platform comes from the Nitro preset in
 * `nitro.config.ts`.
 */
export default defineHeximonConfig({
  service: "visual-editing",
  crossService: { workspaceRoot: "../.." },
  root: "AppModule",
  plugins: inferativeServerPlugins(),
  schedule: { trigger: "single", tick: "* * * * *" },
  runtimeConfig: { file: "./inferative.config.ts", env: { prefix: "INFERATIVE_" } },
  cloudflare: {
    name: WorkerTopology.part("visual-editing").worker,
    // The database of the dashboard: the same Hyperdrive configuration as in the `heximon.config.ts` of the root.
    hyperdrive: [{ binding: "HYPERDRIVE", id: "00000000000000000000000000000000" }],
    // The `Storage` of the dashboard Worker (`CloudflareRemoteStorageInfrastructure`): one session cache, one set of
    // command idempotency keys and one claim for each scheduled tick for both Workers. Deploy the dashboard Worker
    // once before this Worker: the binding needs its class.
    durableObjects: [
      {
        binding: "STORAGE_ROOM",
        className: "StorageRoomDO",
        scriptName: WorkerTopology.dashboardWorker
      }
    ]
  }
});
