/** The Inferative dashboard at the root of the dashboard Worker. `@heximon/nuxt` serves `server/` inside Nitro. */
export default defineNuxtConfig({
  compatibilityDate: "2025-07-04",
  srcDir: "app",
  // `nuxt dev` answers on this machine only.
  devServer: { host: "localhost" },
  // One layer for each package of `server/app.module.ts` that brings screens.
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
    "@inferative/connectors",
    "@inferative/forms"
  ],
  nitro: {
    preset: "cloudflare-module",
    // Cloudflare limits a Worker to 64 MiB of code and 1 s of startup.
    minify: true,
    // ASCII output: V8 keeps a source with a non-Latin-1 character in two bytes per character, and an isolate stops
    // above 128 MB of heap. This saves about 18 MiB.
    rolldownConfig: {
      output: {
        minify: { compress: true, mangle: true, codegen: { asciiOnly: true } },
        // The AI SDK loads only when a model is called, so its shared parts get chunks of their own: otherwise a new
        // isolate loads them at its start.
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
        // The name and the bindings are in `heximon.config.ts`. The newest date that the pinned miniflare accepts;
        // the applets Worker and the rooms Worker use the same date.
        compatibility_date: "2026-09-07",
        // Phase 5 of `SETUP.md` adds `placement: { mode: "targeted", region: "<cloud>:<region>" }` with the region of
        // the database, so the Worker runs near it. The placement lives here: each `wrangler deploy` writes it again.
        // The applets Worker reads no database and has no placement. The rooms Worker has none either: a Durable Object
        // runs where Cloudflare creates it, not with the placement of its Worker.
        // A `fetch` to the Worker's own zone goes through the zone's WAF and Access rules, as to any other host.
        // `new_module_registry` gives this Worker the new module registry of workerd. Only the dashboard Worker takes
        // it: the applets Worker and the rooms Worker keep the default.
        compatibility_flags: ["global_fetch_strictly_public", "new_module_registry"],
        // Workers Logs keeps each JSON log line and the wide event of each request.
        observability: { enabled: true },
        // Cloudflare Images makes the smaller copies of an uploaded image outside this Worker. The files package reads
        // the binding name; keep it. `heximon.config.ts` has no key for this binding.
        images: { binding: "IMAGES" },
        // Cloudflare Email Service: the mail of the dashboard goes through this binding, with no credential. Settings ›
        // Organization › Mail and SMS adds it as a provider ("Send email" in `README.md`).
        send_email: [{ name: "SEND_EMAIL" }],
        // The Workers Cache is off for the Worker and on for two entrypoints alone: its key holds no host name, and
        // each organization has a host of its own. The file delivery keys by the file, the public reads by the channel
        // key in the path. A deploy keeps the cached answers.
        cache: { enabled: false, cross_version_cache: true },
        exports: {
          FilesDeliveryEntrypoint: { type: "worker", cache: { enabled: true } },
          PublicReadEntrypoint: { type: "worker", cache: { enabled: true } }
        },
        // The edge Worker of `workers/edge/` fronts this Worker on its own `workers.dev` address and on a custom
        // domain. Set this to `true` to serve the host with this Worker alone.
        workers_dev: false,
        // When a file stops being public, the files package purges its tag in the edge Worker's cache too. The props
        // let the call purge; no visitor can send them. The first deploy leaves this binding out until the edge
        // Worker exists (`pnpm deploy:live`). A Worker that serves the host alone removes it.
        services: [
          {
            binding: "PUBLIC_READ_PURGE",
            service: "my-inferative-edge",
            entrypoint: "PublicReadEntrypoint",
            props: { publicReadPurge: true }
          }
        ]
      }
    }
  }
});
