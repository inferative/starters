import { defineHeximonConfig } from "@heximon/build";
import type {} from "@heximon/cloudflare/compiler";
import { WorkerTopology } from "../worker-topology.ts";

// This Worker exists in the split topology only. In one Worker, the dashboard Worker exports the applet supervisor.
if (!WorkerTopology.isSeparate("applets")) {
  throw new Error(
    `The Worker of the applets builds only when ${WorkerTopology.variable} names applets.`
  );
}

/** The part of the dashboard that this Worker runs. */
const part = WorkerTopology.part("applets");

/**
 * The compiler config of the Worker of the applet supervisor. The Worker exports the supervisor class of
 * `server/applets/` of the project root, with SQLite storage, and binds the Worker Loader that runs each applet. The
 * dashboard Worker binds the class here by the name of this Worker. This Worker serves no route and reads no database:
 * the dashboard Worker serves the routes of the applets and keeps their records. It sets no `service`, because no
 * integration event goes to it. The deploy platform comes from the Nitro preset in `nitro.config.ts`.
 */
export default defineHeximonConfig({
  root: "AppModule",
  plugins: [],
  cloudflare: {
    name: part.worker,
    durableObjects: WorkerTopology.partDurableObjects("applets"),
    workerLoaders: WorkerTopology.partWorkerLoaders("applets")
  }
});
