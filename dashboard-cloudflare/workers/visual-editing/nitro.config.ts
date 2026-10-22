import { heximonNitroModule } from "@heximon/nitro/module";
import { defineNitroConfig } from "nitro/config";
import { WorkerTopology } from "../worker-topology.ts";

/**
 * The Worker of the visual editor in the split topology (`INFERATIVE_WORKERS=visual-editing`). `heximonNitroModule`
 * compiles `server/` and serves its routes inside Nitro. Its name and its bindings are in `heximon.config.ts`. Its name
 * and its paths come from `workers/worker-topology.ts`: a route sends `/api/visual-editing/*` of `INFERATIVE_HOSTNAME`
 * here, and every other path of the hostname to the dashboard Worker.
 */
export default defineNitroConfig({
  compatibilityDate: "2025-07-04",
  serverDir: "server",
  modules: [heximonNitroModule],
  preset: "cloudflare-module",
  minify: true,
  cloudflare: {
    wrangler: {
      routes: WorkerTopology.routes("visual-editing"),
      // Keep it at 2026-04-01 or later, as the dashboard Worker does.
      compatibility_date: "2026-04-01"
    }
  }
});
