import { defineHeximonConfig } from "@heximon/build";
import { CloudflareWorkersStrategy } from "@heximon/cloudflare";
import type {} from "@heximon/cloudflare/compiler";
import { AppletForgeKitConfig } from "@inferative/applets/forge-kit";

/**
 * The compiler config of the applets Worker: the applet supervisor and the reader of attached files. It serves no
 * route and reads no database. `forge.kit` bakes the packages that an applet may import.
 */
export default defineHeximonConfig({
  platform: new CloudflareWorkersStrategy({
    // The same date as the dashboard Worker.
    compatibilityDate: "2026-09-07",
    wrangler: { base: { observability: { enabled: true } } }
  }),
  plugins: [],
  cloudflare: {
    name: "my-inferative-applets",
    // The packages read the binding and class names below; keep them.
    durableObjects: [
      {
        binding: "APPLET_SUPERVISOR",
        className: "HostAppletObject",
        module: "./src/host-applet.object.ts"
      }
    ],
    entrypoints: [
      { className: "AttachmentTextEntrypoint", module: "./src/attachment-text.entrypoint.ts" }
    ],
    workerLoaders: [{ binding: "APPLET_LOADER" }],
    forge: { kit: AppletForgeKitConfig.forHost("../..") }
  }
});
