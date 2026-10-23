import { defineHeximonConfig } from "@heximon/build";
import { CloudflareWorkersStrategy } from "@heximon/cloudflare";
import type {} from "@heximon/cloudflare/compiler";
import { AppletForgeKitConfig } from "@inferative/applets/forge-kit";

/**
 * The compiler config of the applets Worker. `vite build` writes `dist/worker.js` and `dist/wrangler.json`. The Worker
 * exports the applet supervisor (`src/host-applet.object.ts`) with SQLite storage and binds the Worker Loader that runs
 * each applet. The dashboard Worker binds the class here by the name of this Worker. The build bakes the packages that
 * an applet may import (`forge.kit`) from the `node_modules` of the project root. This Worker serves no route and reads
 * no database: the dashboard Worker serves the routes of the applets and keeps their records.
 */
export default defineHeximonConfig({
  platform: new CloudflareWorkersStrategy({
    compatibilityDate: "2026-04-01",
    // The same date and flag as the dashboard Worker.
    wrangler: { base: { compatibility_date: "2026-04-01", compatibility_flags: ["nodejs_compat"] } }
  }),
  plugins: [],
  cloudflare: {
    name: "my-inferative-applets",
    // The packages read the two binding names: keep them.
    durableObjects: [
      {
        binding: "APPLET_SUPERVISOR",
        className: "HostAppletObject",
        module: "./src/host-applet.object.ts"
      }
    ],
    workerLoaders: [{ binding: "APPLET_LOADER" }],
    forge: { kit: AppletForgeKitConfig.forHost("../..") }
  }
});
