/**
 * One Nuxt app that serves the public site at `/` and the dashboard under `/admin`, on one origin, as one
 * Cloudflare Worker. `@heximon/nuxt` compiles `server/` and serves its routes inside the Nitro of Nuxt.
 */
export default defineNuxtConfig({
  compatibilityDate: "2025-07-04",
  srcDir: "app",
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
  nitro: {
    preset: "cloudflare-module",
    cloudflare: {
      wrangler: {
        // The Worker of the live site. The preview Worker takes the name of `env.preview`.
        name: "my-inferative-site",
        compatibility_date: "2026-04-01",
        // The database. Replace `id` with the id of your Hyperdrive configuration
        // (`wrangler hyperdrive create`). Keep caching off: with caching on, an editor can save a change and
        // then read old content.
        hyperdrive: [{ binding: "HYPERDRIVE", id: "00000000000000000000000000000000" }],
        // The file store. Create the bucket with `wrangler r2 bucket create my-inferative-site-files`. The binding
        // name is fixed. Local development, the preview Worker and the live Worker share one database, so they
        // share one bucket.
        r2_buckets: [{ binding: "FILES_BUCKET", bucket_name: "my-inferative-site-files" }],
        // The preview Worker: a push to `main` deploys it. It has its own name, the same database, and an empty
        // cron list, so only the live Worker runs the schedule. Wrangler does not copy a binding from the top
        // level into an environment, so each binding appears here again, the Durable Objects too. The Heximon
        // compiler adds the Durable Object bindings of the composed modules to the top level only. A module
        // that adds a Durable Object adds its binding here as well: read `durable_objects` in
        // `.output/server/wrangler.json` after a build.
        env: {
          preview: {
            name: "my-inferative-site-preview",
            hyperdrive: [{ binding: "HYPERDRIVE", id: "00000000000000000000000000000000" }],
            r2_buckets: [{ binding: "FILES_BUCKET", bucket_name: "my-inferative-site-files" }],
            durable_objects: {
              bindings: [
                // The key-value store of this Worker: the claims of command idempotency, kept per Worker.
                { name: "STORAGE_ROOM", class_name: "StorageRoomDO" },
                // The response cache of the live Worker: both Workers serve one database, so an edit through
                // either one must clear the one cache. `script_name` is the live Worker's name. Deploy the live
                // Worker first: the preview deploy fails while that Worker does not exist.
                {
                  name: "RESPONSE_CACHE_ROOM",
                  class_name: "ResponseCacheRoomDO",
                  script_name: "my-inferative-site"
                },
                { name: "RATE_LIMIT_ROOM", class_name: "RateLimitRoomDO" }
              ]
            },
            triggers: { crons: [] }
          }
        }
      }
    }
  }
});
