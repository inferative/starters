import { defineHeximonConfig } from "@heximon/build";
import { CloudflareWorkersStrategy } from "@heximon/cloudflare";
import type {} from "@heximon/cloudflare/compiler";
import { AppletForgeKitConfig } from "@inferative/applets/forge-kit";

/**
 * The compiler config of the applets Worker. `vite build` writes `dist/worker.js` and `dist/wrangler.json`. The Worker
 * exports the applet supervisor (`src/host-applet.object.ts`) with SQLite storage and binds the Worker Loader that runs
 * each applet. The dashboard Worker binds the class here by the name of this Worker. The build bakes the packages that
 * an applet may import (`forge.kit`) from the `node_modules` of the project root. This Worker serves no route and reads
 * no database: the dashboard Worker serves the routes of the applets and keeps their records. The Worker also exports
 * the reader of the text of attached files (`src/attachment-text.entrypoint.ts`, an RPC entrypoint), which runs each
 * file in a Dynamic Worker of the same Worker Loader.
 */
export default defineHeximonConfig({
  platform: new CloudflareWorkersStrategy({
    // The same date as the dashboard Worker. At this date workerd turns Node compatibility on by itself, so the
    // Worker names no `nodejs_compat` flag.
    compatibilityDate: "2026-09-07",
    // Workers Logs keeps the log of the Worker, as for the dashboard Worker. Read it on the Observability page of the
    // Worker in the Cloudflare dashboard.
    wrangler: { base: { observability: { enabled: true } } }
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
    // The dashboard Worker calls it over the `ATTACHMENT_TEXT` service binding: keep the class name.
    entrypoints: [
      { className: "AttachmentTextEntrypoint", module: "./src/attachment-text.entrypoint.ts" }
    ],
    workerLoaders: [{ binding: "APPLET_LOADER" }],
    forge: { kit: AppletForgeKitConfig.forHost("../..") }
  }
});
