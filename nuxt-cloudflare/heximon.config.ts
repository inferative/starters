import { defineHeximonConfig } from "@heximon/build";
import type {} from "@heximon/cloudflare/compiler";
import { inferativeServerPlugins } from "@inferative/base/compiler";

/**
 * The compiler config. `inferativeServerPlugins` is the plugin set that every Inferative package declares its
 * concepts under. `schedule` puts the whole schedule tier on one platform cron trigger, the minute tick. The
 * deploy platform comes from the Nitro preset in `nuxt.config.ts`, not from this file. Both database setups sit
 * in `server/`, so the compiler would find the unused `PersistenceModule` as a second root. `root` pins the app
 * root. `cloudflare` holds the Worker name, the bindings of the Worker and its preview environment; the type import
 * above gives the config type that key.
 */
export default defineHeximonConfig({
  root: "AppModule",
  plugins: inferativeServerPlugins(),
  schedule: { trigger: "single", tick: "* * * * *" },
  runtimeConfig: { file: "./inferative.config.ts", env: { prefix: "INFERATIVE_" } },
  cloudflare: {
    // The Worker of the live site. Heximon writes one Worker for each build: `pnpm build` writes the live Worker,
    // `pnpm build:preview` (`CLOUDFLARE_ENV=preview`) writes the preview Worker, flat.
    name: "my-inferative-site",
    // The database. Replace `id` with the id of your Hyperdrive configuration (`wrangler hyperdrive create`). Keep
    // caching off: with caching on, an editor can save a change and then read old content.
    hyperdrive: [{ binding: "HYPERDRIVE", id: "00000000000000000000000000000000" }],
    // The file store. Create the bucket with `wrangler r2 bucket create my-inferative-site-files`. The binding name
    // is fixed. Local development, the preview Worker and the live Worker share one database, so they share one
    // bucket.
    r2Buckets: [{ binding: "FILES_BUCKET", bucketName: "my-inferative-site-files" }],
    // The preview Worker: a push to `main` deploys it. It is named `<live name>-preview` and gets a copy of every
    // binding above and of each Durable Object binding of the composed modules. Its cron list is empty, so only the
    // live Worker runs the schedule.
    environments: {
      preview: {
        crons: [],
        // The one binding that is not a copy: the response cache of the live Worker. Both Workers serve one database,
        // so an edit through either one must clear the one cache. `scriptName` is the live Worker's name. Deploy the
        // live Worker first: the preview deploy fails while that Worker does not exist.
        durableObjects: [
          {
            binding: "RESPONSE_CACHE_ROOM",
            className: "ResponseCacheRoomDO",
            scriptName: "my-inferative-site"
          }
        ]
      }
    }
  }
});
