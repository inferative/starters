import { defineRuntimeConfig } from "@heximon/runtime/config";

/**
 * The values this dashboard changes from the package defaults. `INFERATIVE_<SECTION>_<PATH>` changes any key again; a
 * secret comes only from the environment.
 */
export default defineRuntimeConfig({
  // The outbox relay drains the rows of this service and the rows with no service.
  serviceName: "dashboard",

  // The name that people see, until a platform administrator saves another on Settings > Organization > Platform.
  app: { name: "My Inferative dashboard" },

  // The browser renders every screen: the Worker answers with the page shell and holds no Vue server app.
  dashboard: {
    pages: true,
    render: "client",
    layers: { realtime: { pages: true } }
  },

  identity: {
    catalog: { serviceName: "my-inferative-dashboard" },
    oauthServer: { enabled: true },
    // Argon2id at OWASP's low-memory setting fits the isolate. A Worker derives PBKDF2 with at most 100,000
    // iterations, so that count stays for older hashes.
    hashing: {
      algorithm: "argon2id",
      argon2id: { memoryKiB: 7168, iterations: 5, parallelism: 1 },
      iterations: 100_000
    }
  },

  mcp: { serverInfo: { name: "my-inferative-dashboard" } },

  // The preamble of every assistant turn. Add `playbooks: [{ route, guidance }]` for a page of your own.
  assistant: {
    instructions:
      "You are the assistant of an Inferative dashboard. Answer concisely and concretely. Writes always pause " +
      "for the user's explicit approval: propose them when asked, and say what happened after the decision. " +
      "Never invent data that you have not been shown."
  },

  files: {
    // The PBKDF2 limit of a Worker, as in `identity.hashing`.
    accessHashIterations: 100_000,
    // The Workers Cache keeps a public file's bytes for a day; a change that takes the file away purges them.
    deliveryCdnMaxAgeSeconds: 86_400
  },

  // A manifest serves once the content materializer has acknowledged it.
  channels: { requiredManifestConsumers: ["content"] },

  // These sources index without the read filter of the policy check, so no read of the index returns them.
  search: { withheldKinds: ["projects.project", "projects.task"] },

  activity: {
    // An alert is keyed by its rule, whose owner each entry records.
    ownedEntityTypes: ["alert"],
    // A trail of a file or a gallery is read under the files read right.
    readCheckedEntityTypes: { "files.file": "files.file", "files.gallery": "files.file" }
  },

  // The Worker runs many isolates, so the shared keys live in one Durable Object. Phase 5 of `SETUP.md` sets
  // `locationHint` to the region of the database (`weur`, `enam`, `apac`); `null` creates each object near its first
  // caller, and it never moves.
  $production: {
    base: { storage: { driver: "durable-object" }, durable: { locationHint: null } },
    // One JSON line for each log entry; `INFERATIVE_LOGGER_REPORTER=pretty` gives the human form.
    logger: { reporter: "json" }
  },

  // A development preview of a channel runs on loopback.
  $development: {
    channels: { previewCheckAllowPrivate: true }
  }
});
