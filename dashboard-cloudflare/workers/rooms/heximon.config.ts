import { defineHeximonConfig } from "@heximon/build";
import { CloudflareWorkersStrategy } from "@heximon/cloudflare";
import type {} from "@heximon/cloudflare/compiler";
import { inferativeServerPlugins } from "@inferative/base/compiler";

/**
 * The compiler config of the rooms Worker: the realtime stream room. It reads the values of the dashboard
 * (`inferative.config.ts`) and the same database. It has no address of its own: the dashboard Worker reaches the room
 * through its binding.
 */
export default defineHeximonConfig({
  platform: new CloudflareWorkersStrategy({
    // The same date as the dashboard Worker.
    compatibilityDate: "2026-09-07",
    wrangler: {
      base: { observability: { enabled: true }, workers_dev: false, preview_urls: false }
    }
  }),
  plugins: inferativeServerPlugins(),
  runtimeConfig: { file: "../../inferative.config.ts", env: { prefix: "INFERATIVE_" } },
  // The storage room and the rate-limit room ran here before the key-value storage and the rate limits moved to the
  // database. A deploy deletes their namespaces and their data (cache hints, held values and rate counters). While this
  // Worker holds them, `pnpm deploy:rooms` waits and `pnpm deploy:rooms:after` uploads after the dashboard Worker, which
  // then binds them no longer. Delete the list when no install of this project is older than the move.
  durable: { deletedClasses: ["StorageRoomDO", "RateLimitRoomDO"] },
  cloudflare: {
    name: "my-inferative-rooms",
    // The Hyperdrive configuration of the dashboard Worker.
    hyperdrive: [{ binding: "HYPERDRIVE", id: "00000000000000000000000000000000" }]
  }
});
