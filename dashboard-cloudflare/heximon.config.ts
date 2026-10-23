import { defineHeximonConfig } from "@heximon/build";
import type {} from "@heximon/cloudflare/compiler";
import { WorkflowPlugin } from "@heximon/workflow/compiler";
import { inferativeServerPlugins } from "@inferative/base/compiler";

/**
 * The compiler config of the dashboard Worker. `inferativeServerPlugins` is the plugin set that every Inferative
 * package declares its concepts under; `saga` adds the decision timers and `websocket` the runner connection.
 * `WorkflowPlugin` runs the assistant's API runs as Cloudflare Workflows on the Worker and in process under `nuxt dev`.
 * `schedule` puts the whole schedule tier on one platform cron trigger, the minute tick. The deploy platform comes from
 * the Nitro preset in `nuxt.config.ts`, not from this file. `cloudflare` holds the name and the bindings of the Worker;
 * the type import above gives the config type that key.
 */
export default defineHeximonConfig({
  plugins: [...inferativeServerPlugins({ saga: true, websocket: true }), new WorkflowPlugin()],
  schedule: { trigger: "single", tick: "* * * * *" },
  runtimeConfig: { file: "./inferative.config.ts", env: { prefix: "INFERATIVE_" } },
  cloudflare: {
    name: "my-inferative-dashboard",
    // The database. Replace `id` with the id of your Hyperdrive configuration (`wrangler hyperdrive create`). Keep
    // caching off: with caching on, a person can save a change and then read old data.
    hyperdrive: [{ binding: "HYPERDRIVE", id: "00000000000000000000000000000000" }],
    // The file store: the files, and the large model-history rows, tool results and session events of the assistant.
    // Create the bucket with `wrangler r2 bucket create my-inferative-dashboard-files`. The binding name is fixed.
    r2Buckets: [{ binding: "FILES_BUCKET", bucketName: "my-inferative-dashboard-files" }],
    // The applet supervisor runs in the applets Worker (`workers/applets/`). This Worker binds its class there by the
    // name of that Worker. The packages read the binding name.
    durableObjects: [
      {
        binding: "APPLET_SUPERVISOR",
        className: "HostAppletObject",
        scriptName: "my-inferative-applets"
      }
    ]
  }
});
