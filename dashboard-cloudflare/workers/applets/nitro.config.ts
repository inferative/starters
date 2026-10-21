import { join } from "node:path";
import { heximonNitroModule } from "@heximon/nitro/module";
import { defineNitroConfig } from "nitro/config";
import type { Nitro } from "nitro/types";
import { ForgeKitBake } from "../../server/applets/forge-kit-bake.ts";

/**
 * The Worker of the applet supervisor in the split topology (`INFERATIVE_WORKERS=applets`). `heximonNitroModule`
 * compiles `server/` and writes the exports and the bindings of `heximon.config.ts`. Its name is in
 * `workers/worker-topology.ts`. It serves no path of the hostname: the dashboard Worker reaches it through the
 * `APPLET_SUPERVISOR` binding only.
 */
export default defineNitroConfig({
  compatibilityDate: "2025-07-04",
  serverDir: "server",
  modules: [
    // Before the build, bake the packages that an applet may import, from the `node_modules` of the project root.
    async (nitro: Nitro) => {
      if (!nitro.options.dev) {
        await ForgeKitBake.write(join(nitro.options.rootDir, "..", ".."));
      }
    },
    heximonNitroModule
  ],
  preset: "cloudflare-module",
  // The esbuild and oxc wasm and the kit are about 21 MiB minified, of the 64 MiB that Cloudflare takes for one Worker.
  minify: true,
  cloudflare: {
    wrangler: {
      // Keep it at 2026-04-01 or later, as the dashboard Worker does.
      compatibility_date: "2026-04-01"
    }
  }
});
