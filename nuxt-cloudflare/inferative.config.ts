import { defineRuntimeConfig } from "@heximon/runtime/config";

/**
 * The values this site changes from the package defaults. Any key can change again at deploy time through
 * `INFERATIVE_<SECTION>_<PATH>`. A secret has no default and comes only from the environment (`.env.example`).
 */
export default defineRuntimeConfig({
  // The dashboard and the screens of every layer live below `/admin`. Each layer sits at its own path below
  // it (`/admin/content`, `/admin/settings/channels`). The links that the server builds follow this prefix.
  dashboard: {
    pages: true,
    prefix: "/admin",
    layers: { applets: { pages: false } }
  },

  identity: {
    catalog: { serviceName: "my-inferative-site" },
    oauthServer: { enabled: true }
  },

  // The name that every mail of the site comes from. `INFERATIVE_NOTIFICATIONS_SENDER_EMAIL` sets the address.
  notifications: { sender: { name: "My Inferative site" } },

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

  // A trail of a file or a gallery is read under the files read right.
  activity: {
    readCheckedEntityTypes: { "files.file": "files.file", "files.gallery": "files.file" }
  },

  // The deployed Worker runs many isolates, so command idempotency and the approval latches keep their keys in one
  // Durable Object that every isolate reaches. `nuxt dev` keeps process memory.
  $production: { base: { storage: { driver: "durable-object" } } },

  $development: {
    channels: { previewCheckAllowPrivate: true }
  }
});
