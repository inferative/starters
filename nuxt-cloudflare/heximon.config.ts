import { defineHeximonConfig } from "@heximon/build";
import type {} from "@heximon/cloudflare/compiler";
import { QueuePlugin } from "@heximon/queue/compiler";
import { inferativeServerPlugins } from "@inferative/base/compiler";

/**
 * The compiler config. `inferativeServerPlugins` is the plugin set that every Inferative package declares its
 * concepts under. `schedule` puts the whole schedule tier on one platform cron trigger, the minute tick. The
 * deploy platform comes from the Nitro preset in `nuxt.config.ts`, not from this file. Both database setups sit
 * in `server/`, so the compiler would find the unused `PersistenceModule` as a second root. `root` pins the app
 * root. `cloudflare` holds the Worker name, the bindings of the Worker and its preview environment; the type import
 * above gives the config type that key. `durable` names a Durable Object class that a deploy deletes.
 */
export default defineHeximonConfig({
  root: "AppModule",
  plugins: [...inferativeServerPlugins({ logging: true }), new QueuePlugin()],
  schedule: { trigger: "single", tick: "* * * * *" },
  runtimeConfig: { file: "./inferative.config.ts", env: { prefix: "INFERATIVE_" } },
  cloudflare: {
    // The Worker of the live site. Heximon writes one Worker for each build: `pnpm build` writes the live Worker,
    // `pnpm build:preview` (`CLOUDFLARE_ENV=preview`) writes the preview Worker, flat.
    name: "my-inferative-site",
    // Put before each queue name: Cloudflare keeps one queue of each name per account. At most 32 characters. The
    // Worker consumes the queue `my-inferative-site-email-events`, which Cloudflare Email Service writes its delivery
    // events to (`server/email-events.handler.ts`).
    resourcePrefix: "my-inferative-site-",
    // The database. Replace `id` with the id of your Hyperdrive configuration (`wrangler hyperdrive create`). Keep
    // caching off: with caching on, an editor can save a change and then read old content.
    hyperdrive: [{ binding: "HYPERDRIVE", id: "00000000000000000000000000000000" }],
    // The file store. Create the bucket with `wrangler r2 bucket create my-inferative-site-files`. The binding name
    // is fixed. Local development, the preview Worker and the live Worker share one database, so they share one
    // bucket.
    r2Buckets: [{ binding: "FILES_BUCKET", bucketName: "my-inferative-site-files" }],
    // The store of the site's stamped reads and pages. Replace `id` with the id of your KV namespace
    // (`wrangler kv namespace create <name>-cache`). The binding name is fixed. A key holds the answer of one stamp,
    // so the preview Worker shares the namespace.
    kvNamespaces: [{ binding: "INFERATIVE_CACHE", id: "ffffffffffffffffffffffffffffffff" }],
    // The preview Worker: a push to `main` deploys it. It is named `<live name>-preview` and gets a copy of every
    // binding above and of each Durable Object binding of the composed modules. Its cron list is empty, so only the
    // live Worker runs the schedule. Both Workers serve one database, so they share its key-value `Storage` and the
    // hints that empty the response cache of each isolate after an edit.
    environments: {
      preview: {
        crons: [],
        // A queue has one consumer: the live Worker reads the email events queue, so the preview Worker reads none.
        queues: []
      }
    }
  },
  // The Durable Objects that held the response cache, the key-value `Storage` and the rate limits before the database
  // held them. A deploy deletes them and their data. On an older install, deploy the preview Worker first: it binds the
  // storage room of the live Worker until then. Delete an entry when a deploy lists it under `removable_entries`.
  durable: { deletedClasses: ["ResponseCacheRoomDO", "StorageRoomDO", "RateLimitRoomDO"] }
});
