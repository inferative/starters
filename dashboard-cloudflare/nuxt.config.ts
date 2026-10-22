import type { Nuxt } from "nuxt/schema";
import { ForgeKitBake } from "./server/applets/forge-kit-bake.ts";
import { WorkerTopology } from "./workers/worker-topology.ts";

/**
 * The Inferative dashboard at the root of one Cloudflare Worker. `@heximon/nuxt` compiles `server/` and serves
 * its routes inside the Nitro of Nuxt.
 */
export default defineNuxtConfig({
  compatibilityDate: "2025-07-04",
  srcDir: "app",
  // With `INFERATIVE_WORKERS=visual-editing`, the server directory holds the root of the split topology, which imports
  // the rest of `server/`. The visual editor then runs in the Worker of `workers/visual-editing/`.
  ...(WorkerTopology.isSeparate("visual-editing") ? { serverDir: "server-split" } : {}),
  // `nuxt dev` answers on this machine only. Without a host it listens on all interfaces.
  devServer: { host: "localhost" },
  // One layer for each package of `server/app.module.ts` that brings screens. The dashboard layer brings the shell,
  // the assistant and the identity screens; each of the others brings its own area.
  extends: [
    "@inferative/dashboard",
    "@inferative/content",
    "@inferative/publishing",
    "@inferative/files",
    "@inferative/pages",
    "@inferative/taxonomy",
    "@inferative/seo",
    "@inferative/visual-editing",
    "@inferative/realtime",
    "@inferative/projects",
    "@inferative/agents",
    "@inferative/decisions"
  ],
  modules: [
    // Before each build of a Worker that runs the applets, bake the packages that an applet may import. With
    // `INFERATIVE_WORKERS=applets` the build of `workers/applets/` bakes them instead.
    (_options: unknown, nuxt: Nuxt) => {
      nuxt.hook("build:before", async () => {
        if (!nuxt.options.dev && !WorkerTopology.isSeparate("applets")) {
          await ForgeKitBake.write(nuxt.options.rootDir);
        }
      });
    }
  ],
  // The contracts that the Worker of a separate part serves (`workers/worker-topology.ts`). The browser calls them on
  // their usual path, which a route sends to that Worker; a server render calls them over the service binding. Empty
  // for one Worker.
  runtimeConfig: { inferative: { remoteMounts: WorkerTopology.remoteMounts() } },
  nitro: {
    preset: "cloudflare-module",
    // Cloudflare limits a Worker to 64 MiB of uncompressed code and 1 s of startup. With minify the Worker is about
    // 46 MiB with the applet supervisor and 25 MiB without it (`INFERATIVE_WORKERS=applets`). Without minify it is
    // above the limit.
    minify: true,
    cloudflare: {
      wrangler: {
        // The name of the Worker and its bindings are in `heximon.config.ts`.
        // Keep it at 2026-04-01 or later: the Worker needs the native `node:tty` of that runtime.
        compatibility_date: "2026-04-01"
      }
    }
  }
});
