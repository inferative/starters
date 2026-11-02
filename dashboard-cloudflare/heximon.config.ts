import { defineHeximonConfig } from "@heximon/build";
import type {} from "@heximon/cloudflare/compiler";
import { WorkflowPlugin } from "@heximon/workflow/compiler";
import { inferativeServerPlugins } from "@inferative/base/compiler";

/**
 * The compiler config of the dashboard Worker. The Nitro preset in `nuxt.config.ts` picks the platform; the type
 * import above types the `cloudflare` key.
 */
export default defineHeximonConfig({
  plugins: [
    ...inferativeServerPlugins({ logging: true, saga: true, websocket: true }),
    new WorkflowPlugin()
  ],
  // The whole schedule runs on one platform cron trigger, every minute.
  schedule: { trigger: "single", tick: "* * * * *" },
  runtimeConfig: { file: "./inferative.config.ts", env: { prefix: "INFERATIVE_" } },
  cloudflare: {
    name: "my-inferative-dashboard",
    // Put before each queue and workflow name: Cloudflare keeps one of each name per account. At most 32 characters.
    resourcePrefix: "my-inferative-dashboard-",
    // Keep the Hyperdrive cache off: with it, a person can save a change and then read old data.
    hyperdrive: [{ binding: "HYPERDRIVE", id: "00000000000000000000000000000000" }],
    // The packages read the binding names below; keep them.
    r2Buckets: [{ binding: "FILES_BUCKET", bucketName: "my-inferative-dashboard-files" }],
    durableObjects: [
      {
        binding: "APPLET_SUPERVISOR",
        className: "HostAppletObject",
        scriptName: "my-inferative-applets"
      }
    ],
    // Reads the text of attached PDF and Office files in the applets Worker, so the parsers stay out of this one.
    services: [
      {
        binding: "ATTACHMENT_TEXT",
        service: "my-inferative-applets",
        entrypoint: "AttachmentTextEntrypoint"
      }
    ]
  }
});
