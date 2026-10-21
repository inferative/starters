import { defineRuntimeConfig } from "@heximon/runtime/config";

/**
 * The values this Worker changes from the package defaults. Any key can change again at deploy time through
 * `INFERATIVE_<SECTION>_<PATH>`.
 */
export default defineRuntimeConfig({
  // This Worker resolves callers with identity, and leaves the rest of identity to the dashboard Worker: the one audit
  // trail (an audit event that this Worker publishes goes to the dashboard over its queue) and the one permission
  // catalog of the dashboard.
  // Its session cache is the one of the dashboard Worker, in the `Storage` that both Workers share: a session that the
  // dashboard ends or changes is gone from the cache of this Worker too.
  identity: {
    audit: { sink: "off" },
    catalog: { publish: "off" },
    sessionCache: { driver: "storage" }
  },

  // The Worker runs many isolates, so command idempotency keeps its keys in one Durable Object: the `StorageRoom` of the
  // dashboard Worker, which this Worker binds.
  $production: { base: { storage: { driver: "durable-object" } } }
});
