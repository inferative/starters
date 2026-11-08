import { defineHeximonConfig, DiagnosticCode } from "@heximon/build";
import type {} from "@heximon/cloudflare/compiler";
import { QueuePlugin } from "@heximon/queue/compiler";
import { WorkflowPlugin } from "@heximon/workflow/compiler";
import { inferativeServerPlugins } from "@inferative/base/compiler";

/**
 * The compiler config of the dashboard Worker. The Nitro preset in `nuxt.config.ts` picks the platform; the type
 * import above types the `cloudflare` key.
 */
export default defineHeximonConfig({
  plugins: [
    ...inferativeServerPlugins({ logging: true, saga: true, websocket: true }),
    new QueuePlugin(),
    new WorkflowPlugin()
  ],
  // A route that the compiler cannot read fails the build: with no route rows, each request loads every package with
  // routes.
  strictDiagnostics: [DiagnosticCode.HttpRouteRowsFallback],
  // The whole schedule runs on one platform cron trigger, every minute. At most 3 due jobs of one tick run at once, so
  // the jobs of a tick do not take every connection of the database pool together.
  schedule: { trigger: "single", tick: "* * * * *", concurrency: 3 },
  runtimeConfig: { file: "./inferative.config.ts", env: { prefix: "INFERATIVE_" } },
  // Before the rooms Worker, this Worker exported the three rooms of `cloudflare.durableObjects` that now run there. When
  // the Worker still holds their namespaces, `pnpm deploy:live` deletes them and their data (short-lived cache hints,
  // rate counters and stream closures) in an upload of its own; the rooms Worker starts its own, empty. Every other
  // upload leaves these tombstones out. Delete the list when no install of this project is older than the rooms Worker.
  durable: { deletedClasses: ["StorageRoomDO", "RateLimitRoomDO", "RealtimeStreamObjectDO"] },
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
      },
      // The room of the realtime streams runs in the rooms Worker (`workers/rooms/`), so a cold room loads that small
      // Worker and not this one. This Worker exports no live class for it; its modules call it by this binding. It keeps
      // the stream handler of the room: it checks the host and sends each connect to the room.
      {
        binding: "REALTIME_STREAM_OBJECT",
        className: "RealtimeStreamObjectDO",
        scriptName: "my-inferative-rooms"
      }
    ],
    // The entrypoints that the Workers Cache stands in front of: the reads of public file bytes and the public reads
    // of sites. The fill entrypoint answers the edge Worker's misses.
    entrypoints: [
      { className: "FilesDeliveryEntrypoint", module: "./server/files-delivery.entrypoint" },
      { className: "PublicReadEntrypoint", module: "./server/public-read.entrypoints" },
      { className: "PublicReadFillEntrypoint", module: "./server/public-read.entrypoints" }
    ],
    // The public reads of sites and the public file bytes are answered before the app loads: a cache hit runs no app
    // code. A miss of the stamp read goes to the stamp fill, which builds the small graph of the channels library's
    // stamp read and not the app.
    earlyRoutes: [
      { pathPrefix: "/api/site/v1/", module: "./server/public-read.route" },
      { pathPrefix: "/api/files/delivery/", module: "./server/public-read.route" },
      {
        pathPrefix: "/api/site/stamp-fill/",
        graph: { module: "@inferative/channels/stamp-read", className: "ChannelStampReadModule" },
        handler: { module: "@inferative/channels/stamp-read", className: "ChannelStampFill" }
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
