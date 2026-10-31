import { defineHeximonConfig } from "@heximon/build";
import type {} from "@heximon/cloudflare/compiler";
import { WorkflowPlugin } from "@heximon/workflow/compiler";
import { inferativeServerPlugins } from "@inferative/base/compiler";

/**
 * The compiler config of the dashboard Worker. `inferativeServerPlugins` is the plugin set that every Inferative
 * package declares its concepts under; `logging` adds the wide event of each request, `saga` the timers (decisions,
 * runner leases, agent wakes, chat deliveries) and `websocket` the runner connection.
 * `WorkflowPlugin` runs the assistant's API runs and the replies of a linked chat as Cloudflare Workflows on the Worker
 * and in process under `nuxt dev`.
 * `schedule` puts the whole schedule tier on one platform cron trigger, the minute tick. The deploy platform comes from
 * the Nitro preset in `nuxt.config.ts`, not from this file. `cloudflare` holds the name and the bindings of the Worker;
 * the type import above gives the config type that key.
 */
export default defineHeximonConfig({
  plugins: [
    ...inferativeServerPlugins({ logging: true, saga: true, websocket: true }),
    new WorkflowPlugin()
  ],
  schedule: { trigger: "single", tick: "* * * * *" },
  runtimeConfig: { file: "./inferative.config.ts", env: { prefix: "INFERATIVE_" } },
  cloudflare: {
    name: "my-inferative-dashboard",
    // Put before each queue name and workflow name of the Worker: the queue `saga-timer-queue` and the workflows
    // `assistant-api-run` and `assistant-room-consultation` become `my-inferative-dashboard-saga-timer-queue` and so
    // on. Cloudflare keeps one queue and one workflow of a name in each account, so several dashboards can share an
    // account when each has its own prefix. Lowercase letters, digits and dashes, at most 32 characters.
    resourcePrefix: "my-inferative-dashboard-",
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
    ],
    // The reader of the text of attached PDF and Office files, an RPC entrypoint of the applets Worker: it reads each
    // file in a Dynamic Worker there, so the parsers stay out of this Worker. The packages read the binding name.
    services: [
      {
        binding: "ATTACHMENT_TEXT",
        service: "my-inferative-applets",
        entrypoint: "AttachmentTextEntrypoint"
      }
    ]
  }
});
