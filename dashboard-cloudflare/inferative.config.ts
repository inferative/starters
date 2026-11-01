import { defineRuntimeConfig } from "@heximon/runtime/config";

/**
 * The values this dashboard changes from the package defaults. Any key can change again at deploy time through
 * `INFERATIVE_<SECTION>_<PATH>`. A secret has no default and comes only from the environment (`.env.example`).
 */
export default defineRuntimeConfig({
  // The service of the dashboard Worker. Its outbox relay drains the rows of this service and the rows with no service.
  serviceName: "dashboard",

  // The name that people see: the sender name of every mail, the title of the MCP server and the issuer that an
  // authenticator app shows. Each of them can still take its own value (a sender name saved on Settings >
  // Organization > Platform, `mcp.serverInfo.title`, `identity.mfa.issuer`).
  app: { name: "My Inferative dashboard" },

  // The dashboard and the screens of every layer live at the root of the Worker, each at its own path
  // (`/projects`, `/settings/channels`). The browser renders every screen, the sign-in pages included: the Worker
  // answers each one with the page shell and holds no Vue server app. The realtime diagnostics open only for a person
  // who holds the "Inspect realtime" permission.
  dashboard: {
    pages: true,
    render: "client",
    layers: { realtime: { pages: true } }
  },

  identity: {
    catalog: { serviceName: "my-inferative-dashboard" },
    // The MCP endpoint and the editor APIs are reached through this authorization server.
    oauthServer: { enabled: true },
    // The proof of a cookie session reads the session table on each request, through Hyperdrive. A cache over
    // the `Storage` of the Worker (`sessionCache: { driver: "storage" }`) is a Durable Object: each read is a
    // round trip to the region where the object was first created, which costs more than the database reads.
    // A password hash is Argon2id at OWASP's low-memory setting: the isolate has about 10 to 20 MiB to spare. A
    // sign-in replaces an older PBKDF2 hash. A Cloudflare Worker derives PBKDF2 with at most 100,000 iterations,
    // so that count stays for the older hashes. The local run uses the same setting, so the Worker checks a
    // password that the local run hashed.
    hashing: {
      algorithm: "argon2id",
      argon2id: { memoryKiB: 7168, iterations: 5, parallelism: 1 },
      iterations: 100_000
    }
  },

  mcp: { serverInfo: { name: "my-inferative-dashboard" } },

  // The preamble of every assistant turn. The model comes from the model connections: the platform organization's,
  // else `INFERATIVE_MODELS_DEPLOYMENT_CONNECTIONS` (README.md, "Older variables"). The packages give the assistant a note for each of their pages; add `playbooks: [{ route, guidance }]`
  // here for a page of your own, or to replace a package note with the same route.
  assistant: {
    instructions:
      "You are the assistant of an Inferative dashboard. Answer concisely and concretely. Writes always pause " +
      "for the user's explicit approval: propose them when asked, and say what happened after the decision. " +
      "Never invent data that you have not been shown."
  },

  // The hash of a Password file: the same limit of the Worker as `identity.hashing`.
  files: { accessHashIterations: 100_000 },

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

  // The deployed Worker runs many isolates, so the approval latches and the session cache keep their keys in one
  // Durable Object that every isolate reaches. The claims of command idempotency are in the database. `nuxt dev`
  // keeps process memory. Name the region of your database in `locationHint` (`weur`, `enam`, `apac` and so on):
  // Cloudflare then creates that object there, so a call to it stays in one region.
  // `null` creates each one near its first caller. An object never moves after it is created.
  $production: {
    base: { storage: { driver: "durable-object" }, durable: { locationHint: null } },
    // A deployed build writes each log line as one JSON line with the request id of its request. An error shows
    // only its facts (name, code, status). `INFERATIVE_LOGGER_REPORTER=pretty` gives the human form.
    logger: { reporter: "json" }
  },

  // A development preview of a channel runs on loopback, which the preview check refuses elsewhere.
  $development: {
    channels: { previewCheckAllowPrivate: true }
  }
});
