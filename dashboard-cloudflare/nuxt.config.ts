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
    "@inferative/decisions",
    "@inferative/memory",
    "@inferative/connectors"
  ],
  nitro: {
    preset: "cloudflare-module",
    // Cloudflare limits a Worker to 64 MiB of uncompressed code and 1 s of startup. With minify, and with no Vue server
    // app (`dashboard.render: "client"` in `inferative.config.ts`), the Worker is about 14 MiB.
    minify: true,
    // An isolate keeps the source of every module of the Worker in its heap, and Cloudflare stops an isolate above
    // 128 MB. V8 keeps a source with one character above Latin-1 in two bytes per character, so the Worker escapes
    // every character above ASCII: that saves about 18 MiB of heap.
    rolldownConfig: {
      output: {
        minify: { compress: true, mangle: true, codegen: { asciiOnly: true } },
        // Nitro puts each package in a chunk of its own, with the dependencies that the package reaches first. The
        // AI SDK and its providers load when a model is called, so zod, the provider utilities and the version files
        // (`ai` and each `@ai-sdk` package) get chunks of their own: otherwise the start of a new isolate also loads
        // the package that holds them.
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
              test: /[\\/]node_modules[\\/](?:@ai-sdk[\\/][^\\/]+|ai)[\\/]package\.json$/,
              priority: 20
            }
          ]
        }
      }
    },
    cloudflare: {
      wrangler: {
        // The name of the Worker and its bindings are in `heximon.config.ts`.
        // From 2026-08-04 workerd turns Node compatibility on by itself and rejects a Worker that names
        // `nodejs_compat`, so the build removes the flag that Nitro adds. 2026-09-07 is the newest date that the
        // pinned miniflare runtime accepts. The applets Worker uses the same date.
        compatibility_date: "2026-09-07",
        // A `fetch` to a host of the Worker's own zone goes out through Cloudflare's front, as to any other host, so
        // the zone's WAF and Access rules apply to it (a typed model address on the own zone, for example). No
        // dashboard code fetches its own zone on purpose; service bindings and Durable Object calls do not change.
        compatibility_flags: ["global_fetch_strictly_public"],
        // Workers Logs keeps the log of the Worker: each JSON log line, with the request id of its request, and the
        // wide event of each request. Read it on the Observability page of the Worker in the Cloudflare dashboard.
        observability: { enabled: true }
      }
    }
  }
});
