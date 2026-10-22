import {
  AppletObject,
  type AppletSupervisorContext,
  type AppletSupervisorEnv
} from "@inferative/applets/infrastructure/cloudflare";
import { FORGE_KIT } from "./forge-kit.generated.js";

/**
 * The applet supervisor: one Durable Object for each applet. It builds the sources of an applet against the baked
 * kit, keeps each version, and runs the live version. The Worker that runs the applets exports it: the dashboard
 * Worker, or the Worker of `workers/applets/` when `INFERATIVE_WORKERS` names `applets` (`workers/worker-topology.ts`).
 *
 * The capability catalog is empty, so no applet gets a grant: each applet runs with no call back to the dashboard.
 */
export class HostAppletObject extends AppletObject {
  public constructor(ctx: AppletSupervisorContext, env: AppletSupervisorEnv) {
    // The kit decodes on its first read, so an instance that builds nothing never decodes it.
    super(ctx, env, FORGE_KIT);
  }
}
