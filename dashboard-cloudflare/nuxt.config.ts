/**
 * The Inferative dashboard at the root of the dashboard Worker. `@heximon/nuxt` compiles `server/` and serves its
 * routes inside the Nitro of Nuxt. The applet supervisor runs in the applets Worker (`workers/applets/`).
 */
export default defineNuxtConfig({
  compatibilityDate: "2025-07-04",
  srcDir: "app",
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
  nitro: {
    preset: "cloudflare-module",
    // Cloudflare limits a Worker to 64 MiB of uncompressed code and 1 s of startup. With minify the Worker is about
    // 28 MiB.
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
