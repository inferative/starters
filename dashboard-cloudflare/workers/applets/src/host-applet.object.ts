import { loadForgeKit } from "@heximon/cloudflare/forge/kit/baked";
import {
  AppletObject,
  type AppletSupervisorContext,
  type AppletSupervisorEnv
} from "@inferative/applets/infrastructure/cloudflare";

/**
 * The applet supervisor: one Durable Object for each applet. It builds the sources of an applet against the kit that
 * the build bakes (`cloudflare.forge.kit` in `heximon.config.ts`), keeps each version, and runs the live version.
 *
 * The capability catalog is empty, so no applet gets a grant: each applet runs with no call back to the dashboard.
 */
export class HostAppletObject extends AppletObject {
  public constructor(ctx: AppletSupervisorContext, env: AppletSupervisorEnv) {
    // The first build loads the kit, so an instance that builds nothing never decodes it.
    super(ctx, env, loadForgeKit);
  }
}
