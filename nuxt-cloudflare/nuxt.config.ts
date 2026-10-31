/**
 * One Nuxt app that serves the public site at `/` and the dashboard under `/admin`, on one origin, as one
 * Cloudflare Worker. `@heximon/nuxt` compiles `server/` and serves its routes inside the Nitro of Nuxt.
 */
export default defineNuxtConfig({
  compatibilityDate: "2025-07-04",
  srcDir: "app",
  // `nuxt dev` answers on this machine only. Without a host it listens on all interfaces, and the dev server has no sign-in.
  devServer: { host: "localhost" },
  // One layer for each package of `server/app.module.ts` that brings screens or site components. The
  // dashboard comes first: Nuxt runs the plugins of a layer after those of the layers listed behind it, and
  // the plugins of the dashboard shell read what the base layer provides.
  extends: [
    "@inferative/dashboard",
    "@inferative/site",
    "@inferative/content",
    "@inferative/publishing",
    "@inferative/files",
    "@inferative/pages",
    "@inferative/seo",
    "@inferative/visual-editing"
  ],
  // The server lane of the site is `@inferative/sdk/nuxt`, which the `@inferative/site` layer installs. The Heximon app
  // of this host runs the page lane (`SitePageFallthrough` on its root module), so the host states it here.
  inferativeSite: { pageLane: "host" },
  nitro: {
    preset: "cloudflare-module",
    // Nitro puts each package in a chunk of its own, with the dependencies that the package reaches first. The AI SDK
    // providers load when a model is called, so zod, the provider utilities and the version files get chunks of their
    // own: otherwise the first request of a new isolate also loads the provider that holds them.
    rolldownConfig: {
      output: {
        codeSplitting: {
          groups: [
            { name: "_libs/zod", test: /[\\/]node_modules[\\/]zod[\\/]/, priority: 10 },
            {
              name: "_libs/ai-sdk-provider",
              test: /[\\/]node_modules[\\/]@ai-sdk[\\/]provider(?:-utils)?[\\/]/,
              priority: 10
            },
            {
              name: "_libs/ai-sdk-versions",
              test: /[\\/]node_modules[\\/]@ai-sdk[\\/][^\\/]+[\\/]package\.json$/,
              priority: 20
            }
          ]
        }
      }
    },
    cloudflare: {
      wrangler: {
        // The Worker name, the bindings and the preview environment are in `heximon.config.ts`; Heximon copies every
        // binding into the preview Worker, named `<name>-preview`.
        // From 2026-08-04 workerd turns Node compatibility on by itself and rejects a Worker that names
        // `nodejs_compat`, so the build removes the flag that Nitro adds. 2026-09-07 is the newest date that the
        // pinned miniflare runtime accepts.
        compatibility_date: "2026-09-07",
        // Workers Logs keeps the log of the Worker: each JSON log line, with the request id of its request, and the
        // wide event of each request. Read it on the Observability page of the Worker in the Cloudflare dashboard.
        observability: { enabled: true }
      }
    }
  }
});
