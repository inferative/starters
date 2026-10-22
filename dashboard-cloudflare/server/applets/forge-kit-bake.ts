import { join } from "node:path";

/**
 * Bakes the packages that an applet may import into `forge-kit.generated.js` beside this file: the applet supervisor
 * builds each applet against them. The kit comes from the `node_modules` of the project, so it follows the installed
 * versions. The build of the Worker that runs the applets calls it; `nuxt dev` runs no supervisor and bakes nothing.
 */
export class ForgeKitBake {
  /**
   * @param projectRoot - The folder of the dashboard project, which holds `node_modules`.
   * @returns The path of the baked kit.
   */
  public static async write(projectRoot: string): Promise<string> {
    // Imported here, so that loading a config file does not load the bake.
    const { AppletForgeKitBuilder } = await import("@inferative/applets/forge-kit");

    return AppletForgeKitBuilder.write(join(projectRoot, "server", "applets"), projectRoot);
  }
}
