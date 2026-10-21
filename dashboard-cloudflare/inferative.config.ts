import { defineRuntimeConfig } from "@heximon/runtime/config";

/**
 * The values this dashboard changes from the package defaults. Any key can change again at deploy time through
 * `INFERATIVE_<SECTION>_<PATH>`. A secret has no default and comes only from the environment (`.env.example`).
 */
export default defineRuntimeConfig({
  // The service of this Worker in both topologies. Its outbox relay drains only the rows of this service, so the name
  // stays the same when `INFERATIVE_WORKERS` moves a part to a Worker of its own or back.
  serviceName: "dashboard",

  // The dashboard and the screens of every layer live at the root of the Worker, each at its own path
  // (`/projects`, `/settings/channels`). The realtime diagnostics open only for a person who holds the "Inspect
  // realtime" permission.
  dashboard: {
    pages: true,
    layers: { realtime: { pages: true } }
  },

  identity: {
    catalog: { serviceName: "my-inferative-dashboard" },
    // The MCP endpoint and the editor APIs are reached through this authorization server.
    oauthServer: { enabled: true },
    // The proof of a cookie session is cached in the `Storage` of the Worker (a Durable Object). A write that
    // changes a session, an account, a membership or an organization clears it.
    sessionCache: { driver: "storage" }
  },

  mcp: { serverInfo: { name: "my-inferative-dashboard", title: "My Inferative dashboard" } },

  // The name that every mail of the dashboard comes from. `INFERATIVE_NOTIFICATIONS_SENDER_EMAIL` sets the address.
  notifications: { sender: { name: "My Inferative dashboard" } },

  // The preamble of every assistant turn. The model comes from `INFERATIVE_ASSISTANT_BACKEND_*` (`.env.example`). The
  // packages give the assistant a note for each of their pages; add `playbooks: [{ route, guidance }]` here for a
  // page of your own, or to replace a package note with the same route.
  assistant: {
    instructions:
      "You are the assistant of an Inferative dashboard. Answer concisely and concretely. Writes always pause " +
      "for the user's explicit approval: propose them when asked, and say what happened after the decision. " +
      "Never invent data that you have not been shown."
  },

  // A manifest serves once the content materializer has acknowledged it.
  channels: { requiredManifestConsumers: ["content"] },

  // The projects search sources index every project and task title of the organization without the read filter of
  // the policy check, so these kinds stay out of every read of the index.
  search: { withheldKinds: ["projects.project", "projects.task"] },

  activity: {
    // An alert is keyed by its rule, whose owner each entry records.
    ownedEntityTypes: ["alert"],
    // A trail of a file or a gallery is read under the files read right.
    readCheckedEntityTypes: { "files.file": "files.file", "files.gallery": "files.file" }
  },

  // The deployed Worker runs many isolates, so command idempotency, the approval latches and the session cache keep
  // their keys in one Durable Object that every isolate reaches. `nuxt dev` keeps process memory.
  $production: { base: { storage: { driver: "durable-object" } } },

  // A development preview of a channel runs on loopback, which the preview check refuses elsewhere.
  $development: {
    channels: { previewCheckAllowPrivate: true }
  }
});
