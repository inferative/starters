import { loadForgeKit } from "@heximon/cloudflare/forge/kit/baked";
import {
  AppletObject,
  type AppletSupervisorContext,
  type AppletSupervisorEnv
} from "@inferative/applets/infrastructure/cloudflare";

/**
 * The applet supervisor: one Durable Object for each applet. It builds an applet against the baked kit and runs the
 * live version. The capability catalog is empty, so no applet calls back to the dashboard.
 */
export class HostAppletObject extends AppletObject {
  public constructor(ctx: AppletSupervisorContext, env: AppletSupervisorEnv) {
    // The first build loads the kit, so an instance that builds nothing never decodes it.
    super(ctx, env, loadForgeKit);
  }
}
