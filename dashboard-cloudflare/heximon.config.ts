import { defineHeximonConfig } from "@heximon/build";
import type {} from "@heximon/cloudflare/compiler";
import { WorkflowPlugin } from "@heximon/workflow/compiler";
import { inferativeServerPlugins } from "@inferative/base/compiler";
import { WorkerTopology } from "./workers/worker-topology.ts";

/** Whether `INFERATIVE_WORKERS` moves the visual editor to the Worker of `workers/visual-editing/`. */
const visualEditingApart = WorkerTopology.isSeparate("visual-editing");

/**
 * The compiler config. `inferativeServerPlugins` is the plugin set that every Inferative package declares its
 * concepts under; `saga` adds the decision timers and `websocket` the runner connection. `WorkflowPlugin` runs the
 * assistant's API runs as Cloudflare Workflows on the Worker and in process under `nuxt dev`. `schedule` puts the
 * whole schedule tier on one platform cron trigger, the minute tick. The deploy platform comes from the Nitro preset
 * in `nuxt.config.ts`, not from this file. `cloudflare` holds the name and the bindings of the Worker; the type import
 * above gives the config type that key.
 *
 * `INFERATIVE_WORKERS` picks the topology when you build (`workers/worker-topology.ts`). Unset, the root is
 * `AppModule` of `server/`, and the dashboard is one Worker. With `visual-editing`, the root is `SplitAppModule` of
 * `server-split/` (the server directory of `nuxt.config.ts` follows the same setting), and the dashboard is the service
 * `dashboard` of a deployment whose other services are the hosts under `workers/`: an integration event that a host of
 * `workers/` subscribes to goes to its queue. The dashboard Worker then binds the Worker of each separate part
 * (`cloudflare.services`), and a server render calls the contracts of that Worker over the binding. `heximon check`
 * reads `server/` unless `--src server-split` names the other directory.
 *
 * In the split topology the dashboard Worker owns the shared state of the deployment: it applies the migrations, it
 * exports the one `StorageRoom` that the other Workers bind, and its outbox relay drains only the rows of the service
 * `dashboard`. Each Worker claims the tick of a job that two Workers compose in that room, so the job runs once.
 */
export default defineHeximonConfig({
  root: visualEditingApart ? "SplitAppModule" : "AppModule",
  ...(visualEditingApart
    ? {
        sourceDirectory: "server-split",
        service: "dashboard",
        crossService: { workspaceRoot: "." }
      }
    : {}),
  plugins: [...inferativeServerPlugins({ saga: true, websocket: true }), new WorkflowPlugin()],
  schedule: { trigger: "single", tick: "* * * * *" },
  runtimeConfig: { file: "./inferative.config.ts", env: { prefix: "INFERATIVE_" } },
  cloudflare: {
    // The name of the Worker, in `workers/worker-topology.ts`.
    name: WorkerTopology.dashboardWorker,
    // The database. Replace `id` with the id of your Hyperdrive configuration (`wrangler hyperdrive create`). Keep
    // caching off: with caching on, a person can save a change and then read old data.
    hyperdrive: [{ binding: "HYPERDRIVE", id: "00000000000000000000000000000000" }],
    // The file store: the files, and the large model-history rows, tool results and session events of the assistant.
    // Create the bucket with `wrangler r2 bucket create my-inferative-dashboard-files`. The binding name is fixed.
    r2Buckets: [{ binding: "FILES_BUCKET", bucketName: "my-inferative-dashboard-files" }],
    // The applet supervisor (`server/applets/host-applet.object.ts`), and the Worker Loader that it runs each applet in.
    // In one Worker this Worker exports the class with SQLite storage. With `INFERATIVE_WORKERS=applets` the Worker of
    // `workers/applets/` exports it, and this Worker binds it there by name. The packages read the binding names.
    durableObjects: WorkerTopology.dashboardDurableObjects(),
    workerLoaders: WorkerTopology.dashboardWorkerLoaders(),
    // The Workers of the parts that `INFERATIVE_WORKERS` moves out (`workers/worker-topology.ts`); none for one Worker.
    ...(visualEditingApart ? { services: WorkerTopology.services() } : {})
  }
});
