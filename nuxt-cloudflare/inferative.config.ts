import { defineRuntimeConfig } from "@heximon/runtime/config";

/**
 * The values this site changes from the package defaults. Any key can change again at deploy time through
 * `INFERATIVE_<SECTION>_<PATH>`. A secret has no default and comes only from the environment (`.env.example`).
 */
export default defineRuntimeConfig({
  // The dashboard and the screens of every layer live below `/admin`. Each layer sits at its own path below
  // it (`/admin/content`, `/admin/settings/channels`). The links that the server builds follow this prefix. The
  // browser renders the screens below `/admin`; the server renders the site.
  dashboard: {
    pages: true,
    prefix: "/admin",
    render: "client",
    layers: { applets: { pages: false } }
  },

  identity: {
    catalog: { serviceName: "my-inferative-site" },
    oauthServer: { enabled: true },
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

  // The name that people see: every mail of the site comes from it, and an authenticator app shows it.
  // `INFERATIVE_NOTIFICATIONS_SENDER_EMAIL` sets the sender address.
  app: { name: "My Inferative site" },

  // This site serves the public pages and the editor, so it loads the words of both surfaces.
  messages: { surfaces: ["editor", "site"] },

  // A public read with no key resolves this channel of the first organization. After the first sign-in, set
  // `INFERATIVE_CHANNELS_DEFAULT_ORGANIZATION_ID` to the id of that organization.
  channels: { defaultChannelSlug: "default", requiredManifestConsumers: ["content"] },

  // A site that serves its own API lets its own origin frame it for the visual editor, so `editorOrigins`
  // stays empty here.
  site: {
    name: "My Inferative site",
    version: "1",
    markdown: true,
    machineDocuments: true,
    robots: { disallowPrefixes: ["/_site/"] },
    healthPath: "/_site/health"
  },

  // The hash of a Password file: the same limit of the Worker as `identity.hashing`.
  files: { accessHashIterations: 100_000 },

  // A trail of a file or a gallery is read under the files read right.
  activity: {
    readCheckedEntityTypes: { "files.file": "files.file", "files.gallery": "files.file" }
  },

  // The deployed Worker runs many isolates, so command idempotency and the approval latches keep their keys in one
  // Durable Object that every isolate reaches. `nuxt dev` keeps process memory. Name the region of your database in
  // `locationHint` (`weur`, `enam`, `apac` and so on): Cloudflare then creates that object and the response cache object
  // there. `null` creates each one near its first caller. An object never moves after it is created.
  $production: {
    base: { storage: { driver: "durable-object" }, durable: { locationHint: null } },
    // A deployed build writes each log line as one JSON line with the request id of its request. An error shows
    // only its facts (name, code, status). `INFERATIVE_LOGGER_REPORTER=pretty` gives the human form.
    logger: { reporter: "json" }
  },

  // A local run can use its own address for a channel instead of the stored one, for a website on its own dev
  // server. Add `addressOverrides: { <channel slug>: { preview: "http://localhost:3001" } }` to the channels
  // section below, or set `INFERATIVE_CHANNELS_ADDRESS_OVERRIDES` (JSON) in `.env`. The channel row stays as it is.
  $development: {
    channels: { previewCheckAllowPrivate: true }
  }
});
