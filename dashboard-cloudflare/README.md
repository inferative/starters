# Inferative dashboard: dashboard-cloudflare

The Inferative dashboard as one Nuxt app on three Cloudflare Workers: the dashboard Worker, the applets Worker and the
rooms Worker (see "The three Workers"). The dashboard is at the root of the dashboard Worker, `/`.
It holds every capability of Inferative: projects and agents, the inbox and decisions, the assistant, memory,
the person chat of a member (once a member's personal agent has a messaging account), the connections to GitHub and to outside accounts, content, pages, files,
publishing, SEO, the visual editor, translations and categories, forms, channels and realtime.

The database is Postgres, reached through Cloudflare Hyperdrive. A published release deploys the three Workers.

The first run starts empty. You create the owner account and the organization at `/` with the setup token, and
everything else in the dashboard.

An agent can do the setup for you: the Inferative skill (`npx skills add https://inferative.dev --global`) runs the
steps of `SETUP.md` and stops at each browser step.

## The files

| File | What it holds |
| :-- | :-- |
| `server/app.module.ts` | The modules of the dashboard. Each line adds one capability. Delete a line to remove it. |
| `server/app.module.ts` (Cloudflare) | The stores of the Worker: the key-value `Storage` (`StorageModule`) and the rate limits (`StorageRateLimitModule`) keep their rows in the database; the Durable Objects hold the timers (decisions, runner leases, agent wakes and chat deliveries), the assistant conversations and the realtime streams. `inferative.config.ts` names the `database` driver for a production build, and the Worker refuses to boot on the memory store. The response cache that every package of the Worker shares (`IsolateResponseCacheModule`) is in the memory of each isolate, at most 16 MB (`responseCache.maxBytes`); an edit empties it in every isolate within a second, through a hint in the `Storage`. The room of the realtime streams runs in the rooms Worker ("The three Workers"): `heximon.config.ts` binds it there by name. |
| `server/app.module.ts` (files) | `CloudflareFilesStoreInfrastructure` stores the files and the large assistant rows in the R2 bucket. `FilesR2DevelopmentStore` reaches the same bucket under `nuxt dev`. `CloudflareFilesDeliveryCacheInfrastructure` purges the Workers Cache of public files ("File cache"). |
| `server/persistence/pg/` | The Postgres setup: the connection, the config, the persistence module and `schema.ts`. |
| `workers/applets/` | The applets Worker: the applet supervisor and its build. See "Applets" and "The three Workers". |
| `workers/rooms/` | The rooms Worker: the room of the realtime streams (`src/realtime-room.module.ts`). See "The three Workers". |
| `drizzle.config.ts` | The config of `drizzle-kit`. |
| `inferative.config.ts` | The values that this dashboard changes from the package defaults. `assistant.playbooks` adds the notes of your own pages to the assistant. |
| `nuxt.config.ts` | The Nuxt layers. `nitro.minify` keeps the Worker below the Cloudflare limits of 64 MiB of code and 1 s of startup, and the ASCII output of `nitro.rolldownConfig` keeps the heap of an isolate below its limit of 128 MB. |
| `heximon.config.ts` | The compiler plugins, the minute tick of the schedule (the alarm of a Durable Object fires it, "The clock of the scheduled jobs"), and the name and the bindings of the dashboard Worker (`cloudflare`): the Hyperdrive id, the R2 bucket, the Artifacts namespace of the hosted repositories ("Hosted repositories"), the applet supervisor in the applets Worker, the reader of the text of attached files there (`ATTACHMENT_TEXT`), and the cached entrypoint of public files (`FilesDeliveryEntrypoint`, "File cache"). |
| `heximon.upgrade.json` | The record of the durable surface: the events, the timers and the workflow steps that stored work names. It is generated: run `pnpm heximon:check --update` and commit the result. |
| `app/` | The app config. The navigation is the default of the dashboard layer; `app/app.config.ts` says how to change it. |
| `.github/workflows/release.yml` | A published release, or a manual run, migrates the database and deploys the three Workers. |
| `.github/workflows/backup.yml` | Each night, or on a manual run, writes an encrypted archive of the database and the files and uploads it. |

## Start

1. Copy `.env.example` to `.env`. Fill the empty secrets (see "Secrets"). The values under "Local run only" are for
   this machine: the `INFERATIVE_FILES_R2_*` values are optional (see "Cloudflare").
2. Run `pnpm install`. It also runs `nuxt prepare`, so the editor has the types. Commit `pnpm-lock.yaml`: the workflow
   installs with `--frozen-lockfile`.
3. Run `pnpm db:generate` once. It writes the first migration into `server/persistence/pg/migrations/`. Commit it.
4. Run `pnpm dev`. The dashboard is at `http://localhost:3000`.

`inferative init` wrote the registry lines of `@inferative` and `@heximon` into `.npmrc`. It holds no token. Commit it.

The migrations run when the app starts. A local run uses the direct `DATABASE_URL`, so it reads and writes the
hosted database. `HEXIMON_SCHEDULE=off` keeps the scheduled jobs off: only the deployed Worker runs them.

The database pool holds at most 20 connections: on Node one pool for all requests, on the Worker one pool for each
request. To change it, set `base.database.poolSize` in `inferative.config.ts` or `INFERATIVE_BASE_DATABASE_POOL_SIZE`
in the environment.

## Secrets

The dashboard Worker refuses to boot without one secret. The applets Worker needs none. The rooms Worker needs the same
root and the same `INFERATIVE_REALTIME` (the whole section as JSON) and `INFERATIVE_REALTIME_*` settings: its stream room
checks each realtime ticket that the dashboard Worker signs. Make the root once, with Node:

| Variable | Make it with |
| :-- | :-- |
| `INFERATIVE_ROOT_SECRET` | `node -p 'require("node:crypto").randomBytes(32).toString("base64")'` |

`INFERATIVE_ROOT_SECRET` is the root secret. Every other secret of the dashboard derives from it: the setup token, the
signing keys of links, the realtime ticket secret, and the keys at rest (the key
of the two-factor secrets, the key of the model history and the current key of the secret store). The first sign-in
generates the ES256 key that signs sessions and tokens, and the secret store keeps it sealed under the root's key.
`pnpm exec inferative setup-token` prints the setup token of the root (`--env-file .env.worker` reads the root of the
Worker).

To rotate the root, move the old value to `INFERATIVE_ROOT_SECRET_PREVIOUS` and set a new root: the links, the agent
sessions and the runner command receipts that the old root signed keep working, its keys still decrypt, and every new
one uses the new root. Before you remove `INFERATIVE_ROOT_SECRET_PREVIOUS`, wait until all of these are over:

- 30 days, and every backup from before the rotation that you may still restore. A runner command receipt does not
  expire, and a restore needs the key that signed it. With the archive bucket of "The nightly backup", both end after
  30 days.
- `pnpm secrets:rewrap` and `pnpm mfa:reseal` report nothing under the previous root.
- The install keeps no model history that the previous root sealed. The history is never sealed again, and an active
  conversation keeps it with no end. No agent session open before the rotation is still open.
- No account mail (an invitation, a password reset) queued before the rotation still waits in the outbox.

Do not rotate again while the previous root must stay: there is one slot for it.

An install that stored secrets under `INFERATIVE_SECRETS_KEYS` before it got a root keeps reading them: each listed key
stays in the ring and decrypts what it sealed, and the root's key seals every new value. Set the root, deploy, run
`pnpm secrets:rewrap`, then delete `INFERATIVE_SECRETS_KEYS` only when the report shows `remaining: {}` and a `deriveRoot` of `pinned` or `listed-key` (`stored` is fine too when no listed key is marked `derive`). On `conflict` keep the list: removing the key changes the derived webhook secrets and breaks the bots that use them, and no task moves the stored root.

The same holds for `INFERATIVE_IDENTITY_MFA_ENCRYPTION_KEY`: run `pnpm mfa:reseal`, and delete the key only when the report shows `remaining: 0` and the outbox backlog (`/api/ready`, or the outbox alert on Platform) shows no pending and no dead-lettered message (or you dealt with each dead letter: a requeued mail cannot open its link once the key is gone). `pnpm mfa:reseal` counts two-factor secrets only, and an account mail (an invitation, a password reset) that is still queued under the key is dropped when the key goes.

Keep a copy of the root outside the repository, in a password manager. A lost root makes the data that it sealed
unreadable: two-factor secrets, model history, the secrets of the secret store and the kept signing key. Sign-in then
stops until you delete the kept key (the `identity/signing-key` row of `secret_envelopes`): the next sign-in generates a
new key, and every session starts again.

A local run and the Worker use one database. Use the same root in `.env` and on the Worker: it seals data in that
database.

The mail setup (the provider, the domain and the address) is on Settings › Organization › Mail and SMS, and the switches
of the background work (IndexNow and the daily price sync) are on Platform › Integrations: a platform administrator saves
them there, so set no variable for them. The
Worker needs no assistant driver: a production build always calls models through the model connections. The OAuth issuer, the MCP address, the passkey
settings and the links in mail come from the deployment's default domain, which the first run stores, so set none of them.
For the person chat, see "Telegram". For the GitHub App, see "GitHub". For the spam check of the forms
that your websites send, set the captcha of each channel on its settings page (a Cloudflare Turnstile widget: its site
key and its secret): a channel with no captcha keeps each submission and mails none. AI turns on for an
organization when it has a model connection: one that it adds under Organization > Models, or one that the platform
organization (the first organization) adds there and offers on Inferative's credits. The platform organization's
connections also give the field writer, the translator and the second-opinion reviewer their model. To limit the
vendors that may get the text, a platform administrator saves the list on Platform › Data processing. With no
saved list, the vendor of any connection that an organization adds may get it. For the websites of your channels, set
`INFERATIVE_CHANNELS_ADMINISTRATION_ORIGINS`. The Worker needs no `DATABASE_URL`: it uses Hyperdrive. The values under
"Local run only" in `.env.example` never go to the Worker.

The name that people see is `app.name` in `inferative.config.ts`, until a platform administrator saves another one on
Platform › General. It is also the title of the MCP server and the issuer that an authenticator app shows. The organization rules (one
organization only, open registration, team organizations, the role of a new member, invitations) and the default time
zone are on the same tab.

The first deploy gives the address. `wrangler deploy` prints it, and so does the log of the Release run:
`https://<worker name>.<subdomain>.workers.dev`. Open that address for the first run, the setup step on the sign-in
page. That step stores the host as the default domain. For a custom domain, open `https://<domain>` instead.
If the deploy asks for a `workers.dev` subdomain, set it once in the Cloudflare dashboard under
**Workers & Pages**.

Write the Worker values into `.env.worker` (`.gitignore` keeps every `.env.*` file out of the repository) and send
them once: `pnpm exec wrangler secret bulk .env.worker --name my-inferative-dashboard`. The workflow does not set
Worker secrets.

### Location cache

Each Cloudflare location can keep the public reads of your sites and the SDK for up to 60 seconds, and a publish
removes them from every location by tag. It works only on a custom domain in a zone of your Cloudflare account: a
purge of the zone does not reach a `workers.dev` address, so that address never keeps an answer.

1. Create an API token in the Cloudflare dashboard with one permission, Zone › Cache Purge, on that zone only.
2. On Platform › Domains and caching, under "Location cache", turn it on and save the zone ID (on the zone's
   overview page) and the zone name (`example.com`). Save the token in its own field there: the secret store keeps
   it, and the screen never shows it again. It is no environment variable.

With the switch off, or with no zone or no token, every public read goes to the Worker. Each publish sends one purge
request and a second one 5 seconds later; the publishes of one moment share them. The Free plan allows 5 purge
requests per minute (a burst of 25) for all the zones of the account, so a long run of publishes waits for its purges.
A zone on the Pro plan or higher removes that wait.

### File cache

The Workers Cache keeps the bytes of each public file for one day (`files.deliveryCdnMaxAgeSeconds` in
`inferative.config.ts`), so a second read of a public file does not run the app or read the R2 bucket. It works on every
address of the Worker, a `workers.dev` address too, and needs no token and no setting.

- **What it keeps.** The bytes of a public file at its current address, `/api/files/delivery/<file>` (or with
  `?download=1`), and its video poster. The cache key holds no host name, so the cache is on for one entrypoint of the
  Worker only, `FilesDeliveryEntrypoint` (`server/files-delivery.entrypoint.ts`). Every request goes to the default
  entrypoint first, which caches nothing. The file route reads the file's row on every request and decides the read.
  Only then does it ask the cached entrypoint, for a public file alone, with no cookie and no `Authorization` header. A
  miss runs the app once more and keeps the answer only when it says `public`: a private, protected or signed file, a
  redirect and an error are never kept. A range read gets its range from the kept file. An answer that came through the
  cached entrypoint carries `X-Files-Delivery-Cache: entrypoint`.
- **Why a change never serves old bytes.** The route asks the cache after its decision, so a file that is no longer
  public reaches no kept copy. The key also holds a stamp of the row (its delivery version, its access version and its
  stored bytes), so a file that is public again, renamed or replaced reaches only an answer kept under its new state. A
  read that was in flight during the change stores its answer under the old stamp, which no later read names.
- **What a hit costs.** A hit sends the statements of the route's decision (the file's row and the checks before it),
  as a read with no cache does, and reads nothing from the bucket. A miss sends those statements twice, once for the
  decision and once for the fill, and reads the bucket once.
- **Purges.** A change of a public file (its access, a rename, a quarantine, a delete, a new poster) purges the file's
  cache tag through the outbox, a few seconds after the change. No read of this cache depends on it, but the cache in
  front of the app (Public read cache, above) keys a file by its address, so there the purge ends the copy of a file
  that stopped being public. That check is bound, not exact: the Workers Cache purges at the Free plan's rate on every
  plan (5 a minute, a burst of 25), a refused purge is a warning, and the copy expires after its day.
- **Versions.** `cache.cross_version_cache` in `nuxt.config.ts` keeps the cached files across deploys: a deploy does not
  read every public file again. A release that changes how the app answers a public file keeps the old answer in the
  cache for at most one day.

A local `wrangler dev` has no Workers Cache: every read goes through the cached entrypoint to the app, and sends no
`Cf-Cache-Status`. On a deployed Worker the second read of a public file answers with `Cf-Cache-Status: HIT`.

## Cloudflare

Replace the placeholders in `heximon.config.ts`: the name of the dashboard Worker, the resource prefix
(`resourcePrefix`, the name of the Worker and a dash), the id of the Hyperdrive configuration, the name of the R2
bucket, and the name of the applets Worker (`scriptName`). The name of the applets
Worker is also in `workers/applets/heximon.config.ts`: keep the two the same. The rooms Worker has its own name
(`cloudflare.name` in `workers/rooms/heximon.config.ts`) and the same Hyperdrive id, and `heximon.config.ts` binds its
three rooms by that name (`scriptName`): keep the four the same. Then create the resources once:

```sh
pnpm exec wrangler hyperdrive create my-inferative-dashboard --connection-string="<the direct postgres:// address>" --caching-disabled --origin-connection-limit 10 --sslmode require
pnpm exec wrangler r2 bucket create my-inferative-dashboard-files
pnpm exec wrangler queues create my-inferative-dashboard-saga-timer-queue
pnpm exec wrangler queues create my-inferative-dashboard-email-events
```

Keep the caching of Hyperdrive off: with caching on, a person can save a change and then read old data. Keep
`--origin-connection-limit` below the database's `max_connections` (`show max_connections;`), with room for the
superuser slots, the provider's own sessions, migrations and a console: 10 suits a database that allows 25. The default
of a paid account is 60. Above the database's limit, Hyperdrive takes every free slot, and sign-in waits. Pass the
address without its query part (`?sslmode=...`): `--sslmode` carries the TLS setting. A provider whose certificate
Hyperdrive checks with `verify-full` needs a CA certificate in the account first. PlanetScale is one: upload the
ISRG roots of Let's Encrypt with `pnpm exec wrangler cert upload certificate-authority`, then create the config with
`--sslmode verify-full --ca-certificate-id <id>` in place of `--sslmode require`. The first deploy creates the
Durable Objects, the Worker Loader of the applets and the Cloudflare Workflows
`my-inferative-dashboard-assistant-api-run`, `my-inferative-dashboard-assistant-room-consultation` and
`my-inferative-dashboard-notifications-chat-reply`. The Worker sends each fired timer (a decision, a runner lease, an
agent wake, a chat delivery) through the queue `my-inferative-dashboard-saga-timer-queue` and reads it back. It
reads the queue `my-inferative-dashboard-email-events`, which Cloudflare Email Service writes its delivery events to
(`server/email-events.handler.ts`): see "Send email".

Run the dashboard Worker in the region of the database. Phase 5 of `SETUP.md` writes the placement below and the
location hint of the clock ("The clock of the scheduled jobs") from the database region (the setup skill maps a region
in `references/setup-cloudflare.md`). Without a placement, the Worker runs in the data centre of each visitor, and
every statement crosses to the database's region: on a database in another country that is about 50 ms for each round
of reads. Put the region of the database into the `nitro.cloudflare.wrangler` block of `nuxt.config.ts`:

```ts
cloudflare: {
  wrangler: {
    compatibility_date: "2026-09-07",
    placement: { mode: "targeted", region: "aws:eu-central-1" },
    observability: { enabled: true }
  }
}
```

Set the placement here, not in the Cloudflare dashboard: each `wrangler deploy` writes the config of the Worker, and a
setting that the config does not hold can be reset.

The packages fix the names `saga-timer-queue`, `assistant-api-run`, `assistant-room-consultation` and
`notifications-chat-reply`, and Cloudflare
keeps one queue and one workflow of a name for each account. The build puts `cloudflare.resourcePrefix` before each of
these names, so several dashboards share one Cloudflare account when each has its own prefix.

For local development, create an R2 access key in the Cloudflare dashboard: **R2 object storage**, then **Manage**
beside **API Tokens**, then **Create Account API token**. Enter a name, choose **Object Read & Write**, and apply it to
the bucket of the dashboard only. The dashboard shows the key id and the secret once. The account id is on the R2
overview page. Put the four values in `.env` (`INFERATIVE_FILES_R2_ACCOUNT_ID`, `INFERATIVE_FILES_R2_BUCKET`,
`INFERATIVE_FILES_R2_ACCESS_KEY_ID`, `INFERATIVE_FILES_R2_SECRET_ACCESS_KEY`). Without them, a local run keeps files in
memory and prints one warning. The built Worker uses the binding and carries no AWS code.

### Hosted repositories

`cloudflare.artifacts` of `heximon.config.ts` binds the Cloudflare Artifacts namespace `my-inferative-dashboard-sources`
as `SOURCE_REPOSITORIES`: the Git sources of the hosted sites and apps. No code of this release reads the binding yet,
and `nuxt dev` runs without it. Artifacts has no local simulator: a `wrangler dev` of the built Worker reaches the remote
namespace and needs a Cloudflare login, so remove `artifacts` from a copy of `.output/server/wrangler.json` and run that
copy for a local run with no account. Create the namespace once, before the first repository, with the jurisdiction `eu`. A
jurisdiction cannot change later, and Artifacts creates a missing namespace by itself on the first repository, where
the jurisdiction is not yours to choose. The API token must be allowed to write Artifacts:

```sh
curl -X POST "https://api.cloudflare.com/client/v4/accounts/<account id>/artifacts/namespaces" \
  -H "Authorization: Bearer <api token>" -H "Content-Type: application/json" \
  -d '{"namespace": "my-inferative-dashboard-sources", "jurisdiction": "eu"}'
```

### Public read cache

The edge Worker of `workers/edge/` fronts the whole host, on its `workers.dev` address and on a custom domain. It
holds no database client and no secret, and has no placement, so it runs where the visitor is. The dashboard Worker
has no `workers.dev` address of its own (`workers_dev: false` in `nuxt.config.ts`).

- **The public reads of sites** (`/api/site/v1/…`) go to its gateway. The gateway refuses an obsolete epoch with `410`
  before any lookup and asks its cached entrypoint, `PublicReadEntrypoint`, for the rest. A hit answers at the
  visitor's data centre with no database read and no app code. A miss asks the dashboard Worker's
  `PublicReadFillEntrypoint` through the service binding `PUBLIC_READ_FILL`, whose props mark the call as a fill; that
  entrypoint answers no other caller. Every answer allows every origin.
- **The public file bytes** (`/api/files/delivery/…`) go to its gateway too. A versioned address read with no cookie
  and no `Authorization` header, plain or with `?download=1`, comes from the same `PublicReadEntrypoint`; every other
  file read goes to the dashboard Worker. The cache key holds the revocation part of the epoch (the host read
  `/api/site/v1/revocation`, kept for 5 s), so `inferative read-epoch rotate` and a restore drop every file copy, and a
  deploy keeps them. A fill stores the whole file, and the cache answers a range from it; a file above 512 MiB is not
  kept.
- **Every other request**, WebSocket upgrades included, goes to the dashboard Worker as it is (the binding
  `DASHBOARD`). It costs one more billed request.
- **The dashboard Worker alone.** The dashboard Worker answers the same addresses itself before its app loads
  (`cloudflare.earlyRoutes` in `heximon.config.ts`), with its own `PublicReadEntrypoint`. To serve the host with it
  alone, set `workers_dev: true` in `nuxt.config.ts`, remove the `PUBLIC_READ_PURGE` binding there, and leave out
  `pnpm deploy:edge` and `pnpm deploy:bind`.
  A cache hit then loads no app. A miss loads the app through `AppEntrypoint`, so on a new isolate it pays the start of
  the app.
- **The stamp fill.** A miss of the stamp read loads no app in either topology. Both fill entrypoints send it to
  `/api/site/stamp-fill/<key>`, a graph early route of `heximon.config.ts`: Heximon builds a small app of
  `ChannelStampReadModule` (`@inferative/channels/stamp-read`, which `server/app.module.ts` imports) with the
  connection, the channel tables and the key cache in the database store, and the route answers the stamp read from it.
  A warm fill sends one statement, the stamp. A visitor can call that address too; it answers the same
  stamp read, with no cache in front.
- **Purges.** When a file stops being public, the files package purges its tag in each cache that may keep it: the
  file cache below, the dashboard Worker's `PublicReadEntrypoint` and the edge Worker's one, through the binding
  `PUBLIC_READ_PURGE` in `nuxt.config.ts`. Its props let the call purge; no visitor can send them. A Worker that serves
  the host alone removes that binding. Without it, a purge warns, and the edge copy expires after its day.
- **A custom domain** attaches to the edge Worker: add `"routes": [{ "pattern": "<domain>", "custom_domain": true }]`
  to `workers/edge/wrangler.jsonc`.
- **A local run** (`wrangler dev`) has no Workers Cache: every public read is a miss there. A hit shows only on a
  deployed Worker, as `Cf-Cache-Status: HIT`.

The billed requests of each path are in [The Workers](https://inferative.dev/docs/deploy/worker-topology).

## Deploy

| Event | What runs |
| :-- | :-- |
| A published release, or a manual run | `pnpm db:migrate`, `pnpm release:data`, `pnpm build`, `pnpm build:applets`, `pnpm build:rooms`, `pnpm deploy:applets`, `pnpm deploy:rooms`, `pnpm deploy:live`, `pnpm deploy:rooms:after`, `pnpm deploy:edge`, then `pnpm deploy:bind`. |

The workflow reads these secrets of the organization: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and
`READ_PACKAGES_TOKEN`. It reads `DATABASE_URL` from the secrets of the repository. A deploy by hand runs the same
eleven commands, in the same order. `pnpm deploy:rooms` waits while the rooms Worker still holds a room that the deployed
dashboard Worker binds; `pnpm deploy:rooms:after` then deploys it after the dashboard Worker, so its upload can delete
that room. Only one of the two uploads.

**The first deploy.** The dashboard Worker binds the cache of the edge Worker, and the edge Worker binds the dashboard
Worker, so neither can go first with every binding. `pnpm deploy:live` deploys the dashboard Worker without
`PUBLIC_READ_PURGE` while the edge Worker does not exist, `pnpm deploy:edge` creates it, and `pnpm deploy:bind` deploys
the dashboard Worker again with the binding. In between, a purge only warns. Later deploys need no order, and
`pnpm deploy:bind` does nothing.

**An install from before the rooms Worker.** Such an install holds the storage room, the rate-limit room (both removed since) or the
room of the realtime streams in the dashboard Worker. Cloudflare refuses to delete those namespaces in an upload that binds the
classes by name in the rooms Worker. So `pnpm deploy:live` lets wrangler read the bindings of the deployed dashboard
Worker, with the account, the name and the credentials of the deploy. When a deployed version still binds one of the
three classes in the dashboard Worker itself, the Worker holds its old namespace, and the deploy uploads twice:

1. The first upload leaves the binding of each such class out (`STORAGE_ROOM`, `RATE_LIMIT_ROOM`,
   `REALTIME_STREAM_OBJECT`) and sends its `state: "deleted"` entry, which `durable.deletedClasses` of
   `heximon.config.ts` writes. It deletes the old namespaces and their data: short-lived cache hints, rate counters and
   the stream closures, which a ticket can use for at most `realtime.ticketTtlMs` (2 minutes). The open streams end,
   and each tab opens a new one.
2. The second upload, right after it, binds the classes of the rooms Worker and sends no `deleted` entry.

Between the two uploads, about the time of one upload, the new code serves without those bindings: a request that
calls one of the rooms fails with an error, and the rest is served. The rooms then start empty in the rooms Worker.
Before the deploy that moves the room of the realtime streams, set the root secret on the rooms Worker (phase 11, step 5
of `SETUP.md`): without it, the rooms Worker does not boot. No step moves a Durable Object, and no manual step is needed. Every later deploy, and the first deploy
of a new install, is one upload: the namespaces are gone or never existed.

The Release run loads the plans of the release: its step "Write the data of the release" runs `pnpm release:data`, which
runs the two tasks of `pnpm tiers:seed` and `pnpm connectors:catalog`, after the migrations. `pnpm tiers:seed` loads the plans of
the release into the database of the `DATABASE_URL` of `.env`, and prints what it changed. A second run changes nothing.
It runs the app on this machine in development mode, so it needs no Worker binding. Run it by hand only for a deploy by
hand.

- **An install made before the model source checks of the plans.** Its stored plans name agent runtimes and no model
  source. The dashboard reads each such plan version with the sources of its runtimes: the organization's key and the
  model proxy for API agents, and the machine login for command-line agents. It writes nothing for this. A plan
  version that names a source keeps what it names. The release adds the column `catalog_revision` to `tier_plans`,
  which tells a version from before the source checks apart, so run `pnpm db:generate` and commit the migration before
  the Release run. A version written after the upgrade is never changed, also when it names a runtime and no source on
  purpose.
- **An install made before the content foreign keys.** A release adds the foreign keys `content_entry_index_entry_fk`
  and `content_unique_values_entry_fk`, so `pnpm db:generate` writes a migration that adds them. A content index row
  or a unique-value row whose entry is gone stops that migration. Before you commit it, put these two statements at the
  start of its `migration.sql`, each followed by `--> statement-breakpoint`. They then delete such rows in the
  transaction of the migration, and they change nothing on a database that has none.

  ```sql
  DELETE FROM "content_entry_index" WHERE NOT EXISTS (SELECT 1 FROM "content_entries" WHERE "content_entries"."id" = "content_entry_index"."entry_id" AND "content_entries"."organization_id" = "content_entry_index"."organization_id");
  DELETE FROM "content_unique_values" WHERE NOT EXISTS (SELECT 1 FROM "content_entries" WHERE "content_entries"."id" = "content_unique_values"."entry_id" AND "content_entries"."organization_id" = "content_unique_values"."organization_id");
  ```

- **An install made before the file owners.** A release adds the columns `owner_type` and `owner_id` to `files`. A
  file with an owner belongs to a record: only a person who reads the record reads the file, and the file library does
  not show it. A file that a member attached to a message before the owners has no owner, so it stays a library file,
  which a person with the files read permission reads. Run the seven statements below once, after the columns exist:
  - When `pnpm db:generate` writes a migration that adds the columns, put the statements at the end of its
    `migration.sql`, after the two statements that add the columns and a `--> statement-breakpoint`.
  - When your database has the columns already, run `pnpm db:generate --custom --name file_owner_links`, put the
    statements into the empty `migration.sql` that it writes, then run `pnpm db:migrate`.

  The record of a file's earliest link keeps the file. A later record whose room links a ready private file takes a
  copy: its own ready copy on the same bytes when one exists, else a new one. The first three statements count the new
  copies on the stored bytes and in the storage ledger, then add them; a new copy shares the bytes and has no poster.
  The fourth copies the translated texts to the copies, and the fifth points only the messages of the later records
  at their copies. The sixth gives each private file that a room message links the record of its earliest link. The
  seventh removes the search document of each file that a record owns, because the search shows a file to a person
  with the files read permission. A file with an owner does not change, so a second run changes nothing.

  ```sql
  WITH "l" AS (SELECT "f"."id" AS "file_id", "c"."subject_type", "c"."subject_id", row_number() OVER (PARTITION BY "f"."id" ORDER BY "e"."created_at", "e"."id") AS "n" FROM "files" AS "f" INNER JOIN "chats" AS "c" ON "c"."kind" = 'room' AND "c"."organization_id" = "f"."organization_id" AND "c"."subject_type" IS NOT NULL AND "c"."subject_id" IS NOT NULL INNER JOIN "chat_events" AS "e" ON "e"."chat_id" = "c"."id" AND "e"."kind" = 'room-message' AND "e"."payload" LIKE '%/files/delivery/' || "f"."id" || '%' WHERE "f"."owner_type" IS NULL AND "f"."access" = 'private'), "p" AS (SELECT DISTINCT "l"."file_id", "l"."subject_type", "l"."subject_id" FROM "l" INNER JOIN "l" AS "first" ON "first"."file_id" = "l"."file_id" AND "first"."n" = 1 INNER JOIN "files" AS "f" ON "f"."id" = "l"."file_id" WHERE ("l"."subject_type" <> "first"."subject_type" OR "l"."subject_id" <> "first"."subject_id") AND "f"."status" = 'ready' AND "f"."deleted_at" IS NULL AND "f"."blob_id" IS NOT NULL), "q" AS (SELECT "p"."file_id", "p"."subject_type", "p"."subject_id" FROM "p" INNER JOIN "files" AS "f" ON "f"."id" = "p"."file_id" WHERE NOT EXISTS (SELECT 1 FROM "files" AS "g" WHERE "g"."copied_from_file_id" = "p"."file_id" AND "g"."owner_type" = "p"."subject_type" AND "g"."owner_id" = "p"."subject_id" AND "g"."status" = 'ready' AND "g"."deleted_at" IS NULL AND "g"."blob_id" = "f"."blob_id")), "x" AS (SELECT "f"."blob_id", count(*) AS "copies" FROM "q" INNER JOIN "files" AS "f" ON "f"."id" = "q"."file_id" GROUP BY "f"."blob_id") UPDATE "file_blobs" AS "b" SET "reference_count" = "b"."reference_count" + "x"."copies", "version" = "b"."version" + 1 FROM "x" WHERE "b"."id" = "x"."blob_id";--> statement-breakpoint
  WITH "l" AS (SELECT "f"."id" AS "file_id", "c"."subject_type", "c"."subject_id", row_number() OVER (PARTITION BY "f"."id" ORDER BY "e"."created_at", "e"."id") AS "n" FROM "files" AS "f" INNER JOIN "chats" AS "c" ON "c"."kind" = 'room' AND "c"."organization_id" = "f"."organization_id" AND "c"."subject_type" IS NOT NULL AND "c"."subject_id" IS NOT NULL INNER JOIN "chat_events" AS "e" ON "e"."chat_id" = "c"."id" AND "e"."kind" = 'room-message' AND "e"."payload" LIKE '%/files/delivery/' || "f"."id" || '%' WHERE "f"."owner_type" IS NULL AND "f"."access" = 'private'), "p" AS (SELECT DISTINCT "l"."file_id", "l"."subject_type", "l"."subject_id" FROM "l" INNER JOIN "l" AS "first" ON "first"."file_id" = "l"."file_id" AND "first"."n" = 1 INNER JOIN "files" AS "f" ON "f"."id" = "l"."file_id" WHERE ("l"."subject_type" <> "first"."subject_type" OR "l"."subject_id" <> "first"."subject_id") AND "f"."status" = 'ready' AND "f"."deleted_at" IS NULL AND "f"."blob_id" IS NOT NULL), "q" AS (SELECT "p"."file_id", "p"."subject_type", "p"."subject_id" FROM "p" INNER JOIN "files" AS "f" ON "f"."id" = "p"."file_id" WHERE NOT EXISTS (SELECT 1 FROM "files" AS "g" WHERE "g"."copied_from_file_id" = "p"."file_id" AND "g"."owner_type" = "p"."subject_type" AND "g"."owner_id" = "p"."subject_id" AND "g"."status" = 'ready' AND "g"."deleted_at" IS NULL AND "g"."blob_id" = "f"."blob_id")), "x" AS (SELECT "f"."organization_id", "s"."channel_id", sum("f"."size") AS "bytes", count(*) AS "copies" FROM "q" INNER JOIN "files" AS "f" ON "f"."id" = "q"."file_id" CROSS JOIN LATERAL (VALUES (''), ("f"."channel_id")) AS "s" ("channel_id") WHERE "s"."channel_id" IS NOT NULL GROUP BY "f"."organization_id", "s"."channel_id") UPDATE "file_storage_usage" AS "u" SET "bytes_used" = "u"."bytes_used" + "x"."bytes", "file_count" = "u"."file_count" + "x"."copies", "version" = "u"."version" + 1 FROM "x" WHERE "u"."organization_id" = "x"."organization_id" AND "u"."channel_id" = "x"."channel_id";--> statement-breakpoint
  WITH "l" AS (SELECT "f"."id" AS "file_id", "c"."subject_type", "c"."subject_id", row_number() OVER (PARTITION BY "f"."id" ORDER BY "e"."created_at", "e"."id") AS "n" FROM "files" AS "f" INNER JOIN "chats" AS "c" ON "c"."kind" = 'room' AND "c"."organization_id" = "f"."organization_id" AND "c"."subject_type" IS NOT NULL AND "c"."subject_id" IS NOT NULL INNER JOIN "chat_events" AS "e" ON "e"."chat_id" = "c"."id" AND "e"."kind" = 'room-message' AND "e"."payload" LIKE '%/files/delivery/' || "f"."id" || '%' WHERE "f"."owner_type" IS NULL AND "f"."access" = 'private'), "p" AS (SELECT DISTINCT "l"."file_id", "l"."subject_type", "l"."subject_id" FROM "l" INNER JOIN "l" AS "first" ON "first"."file_id" = "l"."file_id" AND "first"."n" = 1 INNER JOIN "files" AS "f" ON "f"."id" = "l"."file_id" WHERE ("l"."subject_type" <> "first"."subject_type" OR "l"."subject_id" <> "first"."subject_id") AND "f"."status" = 'ready' AND "f"."deleted_at" IS NULL AND "f"."blob_id" IS NOT NULL), "q" AS (SELECT "p"."file_id", "p"."subject_type", "p"."subject_id" FROM "p" INNER JOIN "files" AS "f" ON "f"."id" = "p"."file_id" WHERE NOT EXISTS (SELECT 1 FROM "files" AS "g" WHERE "g"."copied_from_file_id" = "p"."file_id" AND "g"."owner_type" = "p"."subject_type" AND "g"."owner_id" = "p"."subject_id" AND "g"."status" = 'ready' AND "g"."deleted_at" IS NULL AND "g"."blob_id" = "f"."blob_id")) INSERT INTO "files" SELECT (jsonb_populate_record("f", jsonb_build_object('id', gen_random_uuid()::text, 'version', 1, 'owner_type', "q"."subject_type", 'owner_id', "q"."subject_id", 'copied_from_file_id', "f"."id", 'poster_key', NULL, 'poster_version', 0, 'poster_content_type', NULL, 'poster_size', NULL))).* FROM "q" INNER JOIN "files" AS "f" ON "f"."id" = "q"."file_id";--> statement-breakpoint
  WITH "l" AS (SELECT "f"."id" AS "file_id", "c"."subject_type", "c"."subject_id", row_number() OVER (PARTITION BY "f"."id" ORDER BY "e"."created_at", "e"."id") AS "n" FROM "files" AS "f" INNER JOIN "chats" AS "c" ON "c"."kind" = 'room' AND "c"."organization_id" = "f"."organization_id" AND "c"."subject_type" IS NOT NULL AND "c"."subject_id" IS NOT NULL INNER JOIN "chat_events" AS "e" ON "e"."chat_id" = "c"."id" AND "e"."kind" = 'room-message' AND "e"."payload" LIKE '%/files/delivery/' || "f"."id" || '%' WHERE "f"."owner_type" IS NULL AND "f"."access" = 'private'), "p" AS (SELECT DISTINCT "l"."file_id", "l"."subject_type", "l"."subject_id" FROM "l" INNER JOIN "l" AS "first" ON "first"."file_id" = "l"."file_id" AND "first"."n" = 1 INNER JOIN "files" AS "f" ON "f"."id" = "l"."file_id" WHERE ("l"."subject_type" <> "first"."subject_type" OR "l"."subject_id" <> "first"."subject_id") AND "f"."status" = 'ready' AND "f"."deleted_at" IS NULL AND "f"."blob_id" IS NOT NULL), "k" AS (SELECT "p"."file_id", "p"."subject_type", "p"."subject_id", min("g"."id") AS "copy_id" FROM "p" INNER JOIN "files" AS "f" ON "f"."id" = "p"."file_id" INNER JOIN "files" AS "g" ON "g"."copied_from_file_id" = "p"."file_id" AND "g"."owner_type" = "p"."subject_type" AND "g"."owner_id" = "p"."subject_id" AND "g"."status" = 'ready' AND "g"."deleted_at" IS NULL AND "g"."blob_id" = "f"."blob_id" GROUP BY "p"."file_id", "p"."subject_type", "p"."subject_id") INSERT INTO "file_texts" SELECT (jsonb_populate_record("t", jsonb_build_object('id', gen_random_uuid()::text, 'subject_id', "k"."copy_id"))).* FROM "k" INNER JOIN "file_texts" AS "t" ON "t"."subject_type" = 'file' AND "t"."subject_id" = "k"."file_id" WHERE NOT EXISTS (SELECT 1 FROM "file_texts" AS "t2" WHERE "t2"."subject_type" = 'file' AND "t2"."subject_id" = "k"."copy_id" AND "t2"."locale" = "t"."locale" AND "t2"."field" = "t"."field");--> statement-breakpoint
  WITH RECURSIVE "l" AS (SELECT "f"."id" AS "file_id", "c"."subject_type", "c"."subject_id", row_number() OVER (PARTITION BY "f"."id" ORDER BY "e"."created_at", "e"."id") AS "n" FROM "files" AS "f" INNER JOIN "chats" AS "c" ON "c"."kind" = 'room' AND "c"."organization_id" = "f"."organization_id" AND "c"."subject_type" IS NOT NULL AND "c"."subject_id" IS NOT NULL INNER JOIN "chat_events" AS "e" ON "e"."chat_id" = "c"."id" AND "e"."kind" = 'room-message' AND "e"."payload" LIKE '%/files/delivery/' || "f"."id" || '%' WHERE "f"."owner_type" IS NULL AND "f"."access" = 'private'), "p" AS (SELECT DISTINCT "l"."file_id", "l"."subject_type", "l"."subject_id" FROM "l" INNER JOIN "l" AS "first" ON "first"."file_id" = "l"."file_id" AND "first"."n" = 1 INNER JOIN "files" AS "f" ON "f"."id" = "l"."file_id" WHERE ("l"."subject_type" <> "first"."subject_type" OR "l"."subject_id" <> "first"."subject_id") AND "f"."status" = 'ready' AND "f"."deleted_at" IS NULL AND "f"."blob_id" IS NOT NULL), "k" AS (SELECT "p"."file_id", "p"."subject_type", "p"."subject_id", min("g"."id") AS "copy_id" FROM "p" INNER JOIN "files" AS "f" ON "f"."id" = "p"."file_id" INNER JOIN "files" AS "g" ON "g"."copied_from_file_id" = "p"."file_id" AND "g"."owner_type" = "p"."subject_type" AND "g"."owner_id" = "p"."subject_id" AND "g"."status" = 'ready' AND "g"."deleted_at" IS NULL AND "g"."blob_id" = "f"."blob_id" GROUP BY "p"."file_id", "p"."subject_type", "p"."subject_id"), "m" AS (SELECT "e"."id" AS "event_id", "k"."file_id" AS "old_id", "k"."copy_id" AS "new_id", row_number() OVER (PARTITION BY "e"."id" ORDER BY "k"."file_id") AS "n" FROM "k" INNER JOIN "files" AS "f" ON "f"."id" = "k"."file_id" INNER JOIN "chats" AS "c" ON "c"."kind" = 'room' AND "c"."organization_id" = "f"."organization_id" AND "c"."subject_type" = "k"."subject_type" AND "c"."subject_id" = "k"."subject_id" INNER JOIN "chat_events" AS "e" ON "e"."chat_id" = "c"."id" AND "e"."kind" = 'room-message' AND "e"."payload" LIKE '%/files/delivery/' || "k"."file_id" || '%'), "r" AS (SELECT "m"."event_id", replace("e"."payload", '/files/delivery/' || "m"."old_id", '/files/delivery/' || "m"."new_id") AS "payload", "m"."n" FROM "m" INNER JOIN "chat_events" AS "e" ON "e"."id" = "m"."event_id" WHERE "m"."n" = 1 UNION ALL SELECT "r"."event_id", replace("r"."payload", '/files/delivery/' || "m"."old_id", '/files/delivery/' || "m"."new_id"), "m"."n" FROM "r" INNER JOIN "m" ON "m"."event_id" = "r"."event_id" AND "m"."n" = "r"."n" + 1) UPDATE "chat_events" AS "e" SET "payload" = "r"."payload", "version" = "e"."version" + 1 FROM "r" WHERE "r"."event_id" = "e"."id" AND NOT EXISTS (SELECT 1 FROM "m" WHERE "m"."event_id" = "r"."event_id" AND "m"."n" > "r"."n");--> statement-breakpoint
  UPDATE "files" AS "f" SET "owner_type" = "x"."subject_type", "owner_id" = "x"."subject_id" FROM (SELECT DISTINCT ON ("f"."id") "f"."id", "c"."subject_type", "c"."subject_id" FROM "files" AS "f" INNER JOIN "chats" AS "c" ON "c"."kind" = 'room' AND "c"."organization_id" = "f"."organization_id" AND "c"."subject_type" IS NOT NULL AND "c"."subject_id" IS NOT NULL INNER JOIN "chat_events" AS "e" ON "e"."chat_id" = "c"."id" AND "e"."kind" = 'room-message' AND "e"."payload" LIKE '%/files/delivery/' || "f"."id" || '%' WHERE "f"."owner_type" IS NULL AND "f"."access" = 'private' ORDER BY "f"."id", "e"."created_at", "e"."id") AS "x" WHERE "f"."id" = "x"."id";--> statement-breakpoint
  DELETE FROM "search_index" AS "s" USING "files" AS "f" WHERE "s"."entity_type" = 'files.file' AND "s"."entity_id" = "f"."id" AND "f"."owner_type" IS NOT NULL;
  ```

- **An install made before the model lists of the agents.** A release replaces the columns `model` and
  `model_connection_id` of `agents` with the column `models`, the list of models that an agent may run on. `pnpm
  db:generate` asks whether `models` is a new column or a rename of `model`: answer that it is a new column. The
  migration then adds `models` and drops the two old columns. Before you commit it, put this statement after the
  statement that adds `models` and before the statement that drops `model`, followed by `--> statement-breakpoint`.
  It gives each agent a list of one model, its current model and connection, as its default. An outside agent keeps
  an empty list.

  ```sql
  UPDATE "agents" SET "models" = jsonb_build_array(jsonb_build_object('connectionId', "model_connection_id", 'model', "model", 'efforts', '[]'::jsonb, 'defaultEffort', NULL, 'isDefault', true)) WHERE "model" <> '';
  ```

- **An install made before the connection pools.** A release replaces the table `model_connection_defaults` with an
  order of the model connections: the columns `enabled`, `priority`, `weight`, `health_state`, `failure_streak` and
  `cooling_until` of `model_connections`, and the tables `model_connection_pins` and `model_connection_pool_settings`.
  `pnpm db:generate` asks whether each new table is a rename: answer that it is a new table. The migration then drops
  the defaults table before it adds the columns. Before you commit it, move the statement that drops
  `model_connection_defaults` to the end of the migration, and put this statement before it, followed by
  `--> statement-breakpoint`. In an organization that has defaults, it puts each connection that no default names after
  the named ones, so the calls go on through the connections that the defaults named.

  ```sql
  UPDATE "model_connections" SET "priority" = 2 WHERE EXISTS (SELECT 1 FROM "model_connection_defaults" AS "d" WHERE "d"."organization_id" = "model_connections"."organization_id") AND NOT EXISTS (SELECT 1 FROM "model_connection_defaults" AS "d" WHERE "d"."organization_id" = "model_connections"."organization_id" AND "d"."connection_id" = "model_connections"."id");
  ```

- **An install made before the strict reader versions.** A release makes the column `reader_version` of `chats` and of
  `assistant_room_followers` `NOT NULL` with the default 0. `pnpm db:generate` writes `SET DEFAULT 0` and `SET NOT NULL`
  for each column. A chat or a room follower that no act stamped yet has no version, so `SET NOT NULL` fails on such a
  row. Before you commit the migration, put the first statement below before the `SET NOT NULL` of
  `assistant_room_followers` and the second before the `SET NOT NULL` of `chats`, each followed by
  `--> statement-breakpoint`. They give each such row the version 0. The deploy tool does the same on its own.

  ```sql
  UPDATE "assistant_room_followers" SET "reader_version" = 0 WHERE "reader_version" IS NULL;
  UPDATE "chats" SET "reader_version" = 0 WHERE "reader_version" IS NULL;
  ```

- **An install made before the location hint of the rooms.** The release moves the `Storage` room and the response
  cache room to new objects (`inferative-storage-2`, `response-cache-2`), because an object never moves after it is
  created. The keys of the old `Storage` room are lost once: the claims of a command in flight, the state of a sign-in
  with an outside provider, the approval latches, the chat link codes and the cursors of the jobs that resume across
  ticks. So a sign-in that is in progress at the deploy starts again, a chat link code that is not used yet must be
  made again, and a job that resumes across ticks starts its pass again. The cached responses are lost too, and the
  next reads fill the cache again. The old objects stay in the account with their data, and nothing reads them.
- **An install made before the deployment's domains.** The release adds the table `domains`. The dashboard answers
  only on a host that the table holds, and a request on another host gets a `404` page. `pnpm db:generate` writes the
  migration that creates the table. Put the statement below at the end of its `migration.sql`, after a
  `--> statement-breakpoint`, with the host of your dashboard (`dashboard.example.com`) in place of `<host>`. It stores
  that host as the default domain of an install that ran its first-run step, and it changes nothing on an install that
  has a default domain. An install that did not run its first-run step yet needs no statement: the first-run step
  stores the host that it is opened on.

  ```sql
  INSERT INTO "domains" ("id", "host", "organization_id", "kind", "is_primary", "status", "created_at", "updated_at", "version") SELECT 'default', '<host>', NULL, 'default', false, 'active', now(), now(), 1 WHERE EXISTS (SELECT 1 FROM "installations") ON CONFLICT DO NOTHING;
  ```

- **An install made before each organization had its own languages.** The release adds the columns `locales` and
  `default_locale` to `organizations`. Until a row holds them, the organization reads the configured
  `localization.locales` (English alone on this starter). `pnpm db:generate` writes the migration that adds them. Put
  the statement below at the end of its `migration.sql`, after a `--> statement-breakpoint`. It gives each
  organization the configured languages, then each further language that one of its channels serves, with the
  configured default as its language, and it changes no organization that holds languages. A channel serves only
  languages of its organization, so without it a channel that serves more is refused at its next save. The statement
  is for this starter's configuration (English alone); an install configured with other languages puts them in place
  of `["en"]`, and its default in place of `'en'`.

  ```sql
  WITH "l" AS (SELECT "o"."id" AS "organization_id", "c"."locale", "c"."position" AS "rank" FROM "organizations" AS "o" CROSS JOIN jsonb_array_elements_text('["en"]'::jsonb) WITH ORDINALITY AS "c" ("locale", "position") WHERE "o"."locales" IS NULL UNION ALL SELECT "h"."organization_id", (CASE WHEN "c"."locale" ~* '^[a-z]{2,3}$' THEN lower("c"."locale") WHEN "c"."locale" ~* '^[a-z]{2,3}-([a-z]{2}|[0-9]{3})$' THEN lower(split_part("c"."locale", '-', 1)) || '-' || upper(split_part("c"."locale", '-', 2)) WHEN "c"."locale" ~* '^[a-z]{2,3}-[a-z]{4}$' THEN lower(split_part("c"."locale", '-', 1)) || '-' || initcap(split_part("c"."locale", '-', 2)) WHEN "c"."locale" ~* '^[a-z]{2,3}-[a-z]{4}-([a-z]{2}|[0-9]{3})$' THEN lower(split_part("c"."locale", '-', 1)) || '-' || initcap(split_part("c"."locale", '-', 2)) || '-' || upper(split_part("c"."locale", '-', 3)) ELSE "c"."locale" END), 1000000 + row_number() OVER (PARTITION BY "h"."organization_id" ORDER BY "h"."created_at", "h"."id", "c"."position") FROM "channels" AS "h" INNER JOIN "organizations" AS "o" ON "o"."id" = "h"."organization_id" AND "o"."locales" IS NULL CROSS JOIN jsonb_array_elements_text("h"."locales") WITH ORDINALITY AS "c" ("locale", "position") WHERE "h"."status" <> 'archived'), "f" AS (SELECT "organization_id", "locale", min("rank") AS "rank" FROM "l" GROUP BY "organization_id", "locale"), "x" AS (SELECT "organization_id", jsonb_agg("locale" ORDER BY "rank") AS "locales" FROM "f" GROUP BY "organization_id") UPDATE "organizations" AS "o" SET "locales" = "x"."locales", "default_locale" = 'en', "version" = "o"."version" + 1 FROM "x" WHERE "o"."id" = "x"."organization_id" AND "o"."locales" IS NULL;
  ```

- **An install made before the agent profiles.** The release adds the tables `agent_profiles` and
  `agent_profile_rules`, and the columns `profile_id` and `overrides` to `agents`. `pnpm db:generate` writes the
  migration that adds them. Put the two statements below at the end of its `migration.sql`, after a
  `--> statement-breakpoint`. The deploy tool runs the same step once on each install (`agents_profiles`). They make one profile for each distinct setup of the team agents of an organization (the
  runtime, the CLI, the models, the model source and the permission mode), and each such agent then selects the
  profile of its setup. An outside agent and a personal agent keep their own fields. A second run changes nothing.

  ```sql
  INSERT INTO "agent_profiles" ("id", "organization_id", "built_in_key", "name", "runtime", "cli_backend", "models", "model_source", "permission_mode", "runner_kind", "tools", "tags", "version", "created_at", "updated_at") SELECT 'adopted-' || md5(concat_ws('|', "organization_id", "runtime", coalesce("cli_backend", ''), "models"::text, "model_source", coalesce("permission_mode", ''))), "organization_id", NULL, CASE "runtime" WHEN 'api' THEN 'API' WHEN 'hosted' THEN 'Hosted' ELSE CASE "cli_backend" WHEN 'claude-code' THEN 'Claude Code' WHEN 'codex' THEN 'Codex' ELSE COALESCE("cli_backend", 'Command line') END || ' · ' || CASE "permission_mode" WHEN 'read-only' THEN 'Read only' WHEN 'task-folder' THEN 'Task folder' WHEN 'full-access' THEN 'Full access' ELSE 'Default' END END, "runtime", "cli_backend", "models", "model_source", "permission_mode", CASE WHEN "runtime" = 'cli' THEN 'shared' ELSE NULL END, '[]'::jsonb, '[]'::jsonb, 1, MIN("created_at"), MIN("created_at") FROM "agents" WHERE "kind" = 'team' AND "runtime" <> 'outside' AND "profile_id" IS NULL GROUP BY "organization_id", "runtime", "cli_backend", "models", "model_source", "permission_mode" ON CONFLICT DO NOTHING;--> statement-breakpoint
  UPDATE "agents" SET "profile_id" = 'adopted-' || md5(concat_ws('|', "organization_id", "runtime", coalesce("cli_backend", ''), "models"::text, "model_source", coalesce("permission_mode", ''))) WHERE "kind" = 'team' AND "runtime" <> 'outside' AND "profile_id" IS NULL;
  ```

- **An install made before the personal agent's profile.** No schema changes. Run the statement below once, after
  the step of the agent profiles; the deploy tool runs it once on each install (`personal_agent_profiles`). It moves
  each personal agent that keeps its own fields onto the built-in "Assistant (API)" profile of its organization. Its
  model source stays as a field changed for it, and so does its model list unless its default model is the profile's. An organization with no built-in profile yet keeps
  its agents as they are: the write of its built-in profiles moves them. A second run changes nothing.

  ```sql
  UPDATE "agents" AS "a" SET "profile_id" = "p"."id", "overrides" = CASE WHEN (SELECT "d"->>'model' FROM jsonb_array_elements("a"."models") AS "d" WHERE "d"->>'isDefault' = 'true' LIMIT 1) = (SELECT "e"->>'model' FROM jsonb_array_elements("p"."models") AS "e" WHERE "e"->>'isDefault' = 'true' LIMIT 1) AND "a"."model_source" = "p"."model_source" THEN NULL WHEN (SELECT "d"->>'model' FROM jsonb_array_elements("a"."models") AS "d" WHERE "d"->>'isDefault' = 'true' LIMIT 1) = (SELECT "e"->>'model' FROM jsonb_array_elements("p"."models") AS "e" WHERE "e"->>'isDefault' = 'true' LIMIT 1) THEN jsonb_build_object('modelSource', "a"."model_source") WHEN "a"."model_source" = "p"."model_source" THEN jsonb_build_object('models', "a"."models") ELSE jsonb_build_object('models', "a"."models", 'modelSource', "a"."model_source") END, "version" = "a"."version" + 1 FROM "agent_profiles" AS "p" WHERE "a"."kind" = 'personal' AND "a"."profile_id" IS NULL AND "a"."runtime" = 'api' AND "a"."state" <> 'retired' AND "p"."organization_id" = "a"."organization_id" AND "p"."built_in_key" = 'assistant-api';
  ```

- **An install made before the models for tasks.** The release adds the table `ai_task_models`. `pnpm db:generate`
  writes the migration that adds it. Put the statement below at the end of its `migration.sql`, after a
  `--> statement-breakpoint`; the deploy tool runs the same step once on each install (`ai_task_models_fill`). It
  marks each organization while the table holds no row. The first read of a marked organization's tasks gives each
  task, once, the model that its calls took before, when a model connection of the organization's own lists it; else
  the task starts off. An organization made later gets no mark, so its tasks start off until a person picks a model on
  Settings › AI › Models. A second run marks no organization: the fill leaves a row.

  ```sql
  INSERT INTO "ai_task_models" ("organization_id", "task", "chosen_at") SELECT "id", 'fill', now() FROM "organizations" WHERE NOT EXISTS (SELECT 1 FROM "ai_task_models") ON CONFLICT DO NOTHING;
  ```

- **An install made before a draft that equals the live version stopped counting as a change.** No schema changes.
  Run the three statements below once, in this order; the deploy tool runs them once on each install
  (`content_drafts_equal_live`). A live entry whose draft holds the live document no longer has unpublished
  changes, its page in the pages tree loses the mark of unpublished changes, and a publication whose live version
  the entry serves takes that version as its candidate again. A second run changes nothing.

  ```sql
  UPDATE "content_entries" SET "published_source_revision" = "draft_revision", "version" = "version" + 1 WHERE "status" = 'published' AND "published_document" IS NOT NULL AND "draft_revision" > "published_source_revision" AND "published_document" = "document";--> statement-breakpoint
  UPDATE "page_placements" AS "p" SET "unpublished_changes" = false, "version" = "p"."version" + 1 FROM "content_entries" AS "e" WHERE "p"."unpublished_changes" = true AND "e"."id" = "p"."entry_id" AND "e"."organization_id" = "p"."organization_id" AND "e"."type_key" = "p"."entry_type" AND "e"."status" = 'published' AND "e"."draft_revision" <= "e"."published_source_revision";--> statement-breakpoint
  UPDATE "publications" AS "p" SET "candidate_revision_id" = "p"."live_revision_id", "title" = "r"."title", "version" = "p"."version" + 1 FROM "content_entries" AS "e", "publication_revisions" AS "r" WHERE "p"."live_revision_id" IS NOT NULL AND "p"."candidate_revision_id" IS DISTINCT FROM "p"."live_revision_id" AND "p"."status" <> 'archived' AND "e"."id" = "p"."entity_id" AND "e"."organization_id" = "p"."organization_id" AND "e"."type_key" = "p"."entity_type" AND "e"."status" = 'published' AND "e"."published_revision_id" = "p"."live_revision_id" AND "e"."draft_revision" <= "e"."published_source_revision" AND "r"."id" = "p"."live_revision_id";
  ```

- **An install made before a shared entry was found on every website.** No schema changes. The deploy tool runs the
  statement below once on each install (`content_search_shared_entries`). The search document of an entry that every
  website of its type shares then names no website, so the Content list of each such website finds the entry. A
  second run changes nothing.

  ```sql
  UPDATE "search_index" AS "s" SET "channel_id" = NULL FROM "content_entries" AS "e" WHERE "s"."result_group" = 'content' AND "s"."channel_id" IS NOT NULL AND "e"."id" = "s"."entity_id" AND "e"."type_key" = "s"."entity_type" AND "e"."organization_id" = "s"."organization_id" AND "e"."channel_id" IS NULL;
  ```

- **An install made before guest members.** The release adds three columns to `organization_memberships`. `pnpm
  db:generate` writes the migration that adds them. The deploy tool then runs the statement below once on each install
  (`engagement_guest_memberships`). Each person of an active or paused engagement who is still a member of the provider
  gets a guest membership of the client with the engagement's role; it grants only while the engagement is active and
  has no scope. A person who already has a membership of the client keeps it. A person whom two open engagements of one
  client name gets none, so the deploy plan names each such pair ("to resolve: …") and refuses to apply while one
  exists: end one of the two, then deploy again. A second run writes nothing.

  ```sql
  INSERT INTO "organization_memberships" ("id", "created_at", "updated_at", "version", "user_id", "organization_id", "role_codes", "grants", "access_version", "status", "kind", "engagement_id", "provider_organization_id") SELECT DISTINCT ON ("m"."id", "e"."client_organization_id") gen_random_uuid()::text, now(), now(), 1, "m"."id", "e"."client_organization_id", jsonb_build_array("m"."role"), '[]'::jsonb, 1, CASE WHEN "e"."state" = 'active' AND ("e"."scope" IS NULL OR "e"."scope" = 'null'::jsonb) THEN CASE WHEN "o"."suspended_at" IS NULL THEN 'active' ELSE 'paused' END ELSE 'suspended' END, 'guest', "e"."id", "e"."provider_organization_id" FROM "organization_engagements" AS "e" CROSS JOIN LATERAL jsonb_to_recordset("e"."members") AS "m" ("kind" text, "id" text, "role" text) INNER JOIN "organizations" AS "o" ON "o"."id" = "e"."client_organization_id" WHERE "e"."state" IN ('active', 'paused') AND "m"."kind" = 'person' AND "m"."role" <> 'owner' AND EXISTS (SELECT 1 FROM "organization_memberships" AS "p" WHERE "p"."user_id" = "m"."id" AND "p"."organization_id" = "e"."provider_organization_id" AND "p"."status" IN ('active', 'paused')) AND NOT EXISTS (SELECT 1 FROM "organization_memberships" AS "c" WHERE "c"."user_id" = "m"."id" AND "c"."organization_id" = "e"."client_organization_id") AND NOT EXISTS (SELECT 1 FROM "organization_engagements" AS "x" CROSS JOIN LATERAL jsonb_to_recordset("x"."members") AS "n" ("kind" text, "id" text) WHERE "x"."client_organization_id" = "e"."client_organization_id" AND "x"."id" <> "e"."id" AND "x"."state" IN ('active', 'paused') AND "n"."kind" = 'person' AND "n"."id" = "m"."id") ORDER BY "m"."id", "e"."client_organization_id" ON CONFLICT DO NOTHING;
  ```

- **An install made before the sending connections.** The release adds the tables of the Mail and SMS screen. `pnpm
  db:generate` writes the migration that adds them. The deploy tool then runs the statements below once on each
  install (`sending_setup_move`); put the name that people see (`app.name` of `inferative.config.ts`) in place of
  `<name>`. While the secret store holds the mail provider key of the old Credentials screen, they write a Resend
  connection of the platform organization with no credential yet, a pending domain of the saved sender and its
  address, so Settings › Organization › Mail and SMS shows the ownership record of the domain at once. Within the hour
  the Worker copies the key into the connection, checks it, turns its delivery events on, adds the domain at Resend and
  removes the old key. A second run writes nothing.

  ```sql
  INSERT INTO "sending_connections" ("id", "organization_id", "channel", "kind", "name", "settings", "secret_reference", "state", "revision", "offered_to_organizations", "moved_from", "created_at", "updated_at", "version") SELECT "n"."id", "s"."organization_id", 'email', 'resend', CASE WHEN EXISTS (SELECT 1 FROM "sending_connections" AS "t" WHERE "t"."organization_id" = "s"."organization_id" AND "t"."name" = 'Resend') THEN 'Resend ' || substr("n"."id", 1, 8) ELSE 'Resend' END, '{}'::jsonb, 'sending/connections/' || "s"."organization_id" || '/' || "n"."id", 'unchecked', 1, true, 'notifications/mail/provider-key', now(), now(), 1 FROM "platform_settings" AS "s" CROSS JOIN (SELECT gen_random_uuid()::text AS "id") AS "n" WHERE EXISTS (SELECT 1 FROM "secret_envelopes" WHERE "reference" = 'notifications/mail/provider-key') AND NOT EXISTS (SELECT 1 FROM "sending_connections" AS "m" WHERE "m"."organization_id" = "s"."organization_id" AND "m"."moved_from" = 'notifications/mail/provider-key');--> statement-breakpoint
  INSERT INTO "sending_domains" ("id", "organization_id", "connection_id", "domain", "state", "ownership_token", "records", "created_at", "updated_at", "version") SELECT gen_random_uuid()::text, "c"."organization_id", "c"."id", lower(substring("s"."document"->'sender'->>'email' from '@([^@]+)$')), 'pending', replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8), '[]'::jsonb, now(), now(), 1 FROM "platform_settings" AS "s" INNER JOIN "sending_connections" AS "c" ON "c"."organization_id" = "s"."organization_id" AND "c"."moved_from" = 'notifications/mail/provider-key' WHERE ("s"."document"->'sender'->>'email') ~ '^[^@]+@[^@]+$' AND NOT EXISTS (SELECT 1 FROM "sending_domains" AS "d" WHERE "d"."organization_id" = "c"."organization_id" AND "d"."domain" = lower(substring("s"."document"->'sender'->>'email' from '@([^@]+)$')));--> statement-breakpoint
  INSERT INTO "sending_identities" ("id", "organization_id", "connection_id", "domain_id", "channel", "local_part", "display_name", "is_default", "created_at", "updated_at", "version") SELECT gen_random_uuid()::text, "d"."organization_id", "d"."connection_id", "d"."id", 'email', lower(substring("s"."document"->'sender'->>'email' from '^([^@]+)@')), coalesce(nullif("s"."document"->'sender'->>'name', ''), nullif("s"."document"->'deployment'->>'name', ''), '<name>'), NOT EXISTS (SELECT 1 FROM "sending_identities" AS "i" WHERE "i"."organization_id" = "d"."organization_id" AND "i"."channel" = 'email' AND "i"."is_default"), now(), now(), 1 FROM "platform_settings" AS "s" INNER JOIN "sending_connections" AS "c" ON "c"."organization_id" = "s"."organization_id" AND "c"."moved_from" = 'notifications/mail/provider-key' INNER JOIN "sending_domains" AS "d" ON "d"."organization_id" = "c"."organization_id" AND "d"."domain" = lower(substring("s"."document"->'sender'->>'email' from '@([^@]+)$')) WHERE ("s"."document"->'sender'->>'email') ~ '^[^@]+@[^@]+$' AND NOT EXISTS (SELECT 1 FROM "sending_identities" AS "e" WHERE "e"."domain_id" = "d"."id" AND "e"."local_part" = lower(substring("s"."document"->'sender'->>'email' from '^([^@]+)@')));
  ```

- **An install made before the scopes of the message templates.** The release adds a `scope` column to
  `notification_templates` and `notification_layouts`, and a `layout_scope` column to `notification_templates`.
  `pnpm db:generate` writes the migration that adds them. The deploy tool then runs the statements below once on each
  install (`notification_template_scopes`). They move the platform organization's stored templates (not its own
  kinds of mail) to the platform's scope, and copy its brand layout there, so nothing that is sent changes: the
  platform's messages and every organization on the platform's route take them, under Settings › Platform › Message
  templates. The layout stays on both tabs, so the platform organization's own kinds of mail keep their address. Its
  other templates start empty under Settings › Organization › Message templates. A second run writes nothing.

  ```sql
  UPDATE "notification_templates" SET "scope" = 'platform' WHERE "organization_id" = (SELECT coalesce((SELECT "organization_id" FROM "platform_organizations" LIMIT 1), (SELECT "id" FROM "organizations" ORDER BY "created_at", "id" LIMIT 1))) AND "kind" NOT LIKE 'custom.%' AND "kind" <> 'notifications.layout' AND NOT EXISTS (SELECT 1 FROM "notification_templates" AS "t" WHERE "t"."scope" = 'platform');--> statement-breakpoint
  INSERT INTO "notification_templates" ("organization_id", "scope", "kind", "channel", "locale", "subject", "document", "html", "text_part", "body", "layout_organization_id", "layout_scope", "revision", "updated_at", "updated_by") SELECT "s"."organization_id", 'platform', "s"."kind", "s"."channel", "s"."locale", "s"."subject", "s"."document", "s"."html", "s"."text_part", "s"."body", "s"."layout_organization_id", "s"."layout_scope", "s"."revision", "s"."updated_at", "s"."updated_by" FROM "notification_templates" AS "s" WHERE "s"."organization_id" = (SELECT coalesce((SELECT "organization_id" FROM "platform_organizations" LIMIT 1), (SELECT "id" FROM "organizations" ORDER BY "created_at", "id" LIMIT 1))) AND "s"."scope" = 'organization' AND "s"."kind" = 'notifications.layout' AND NOT EXISTS (SELECT 1 FROM "notification_templates" AS "t" WHERE "t"."organization_id" = "s"."organization_id" AND "t"."scope" = 'platform' AND "t"."kind" = "s"."kind" AND "t"."channel" = "s"."channel" AND "t"."locale" = "s"."locale");--> statement-breakpoint
  INSERT INTO "notification_layouts" ("organization_id", "scope", "theme", "revision", "updated_at", "updated_by") SELECT "organization_id", 'platform', "theme", "revision", "updated_at", "updated_by" FROM "notification_layouts" WHERE "organization_id" = (SELECT coalesce((SELECT "organization_id" FROM "platform_organizations" LIMIT 1), (SELECT "id" FROM "organizations" ORDER BY "created_at", "id" LIMIT 1))) AND "scope" = 'organization' AND NOT EXISTS (SELECT 1 FROM "notification_layouts" AS "l" WHERE "l"."organization_id" = (SELECT coalesce((SELECT "organization_id" FROM "platform_organizations" LIMIT 1), (SELECT "id" FROM "organizations" ORDER BY "created_at", "id" LIMIT 1))) AND "l"."scope" = 'platform');--> statement-breakpoint
  UPDATE "notification_templates" SET "layout_scope" = CASE WHEN "layout_organization_id" = (SELECT coalesce((SELECT "organization_id" FROM "platform_organizations" LIMIT 1), (SELECT "id" FROM "organizations" ORDER BY "created_at", "id" LIMIT 1))) AND NOT ("organization_id" = (SELECT coalesce((SELECT "organization_id" FROM "platform_organizations" LIMIT 1), (SELECT "id" FROM "organizations" ORDER BY "created_at", "id" LIMIT 1))) AND "kind" LIKE 'custom.%') THEN 'platform' ELSE 'organization' END WHERE "layout_organization_id" IS NOT NULL AND "layout_scope" IS NULL;
  ```

- **The read epochs of each deploy.** The epoch of a public read address names the build that answers it. `pnpm
  build` writes the output digest of the build to `.output/inferative-read-output.json` (`{ "digest": "…" }`). The deploy
  tool runs two statements on each deploy: the first after `pnpm build` and before `pnpm deploy:live`, the second after
  the deploy. Put the digest in place of `<digest>`. The first adds the new build's digest to the accepted digests, so
  the reads of the build that still serves stay valid while traffic moves; the second removes the digests accepted
  before it. Each one is safe to run again. Without them, each build accepts only its own epoch, so during a deploy a
  read under the other build's epoch is refused, and the reader reads the stamp again.

  ```sql
  INSERT INTO "read_epoch_control" ("id", "salt", "incarnation", "accepted") VALUES ('current', '', '', jsonb_build_array('<digest>')) ON CONFLICT ("id") DO UPDATE SET "accepted" = (SELECT jsonb_agg("k"."value" ORDER BY "k"."n") FROM (SELECT "a"."value", "a"."n" FROM (SELECT "e"."value", "e"."n" FROM jsonb_array_elements_text("read_epoch_control"."accepted") WITH ORDINALITY AS "e" ("value", "n") WHERE "e"."value" <> '<digest>' UNION ALL SELECT '<digest>', 9223372036854775807) AS "a" ORDER BY "a"."n" DESC LIMIT 8) AS "k");
  UPDATE "read_epoch_control" SET "accepted" = (SELECT jsonb_agg("e"."value" ORDER BY "e"."n") FROM jsonb_array_elements_text("read_epoch_control"."accepted") WITH ORDINALITY AS "e" ("value", "n") WHERE "e"."n" >= (SELECT min("f"."n") FROM jsonb_array_elements_text("read_epoch_control"."accepted") WITH ORDINALITY AS "f" ("value", "n") WHERE "f"."value" = '<digest>')) WHERE "id" = 'current' AND "read_epoch_control"."accepted" @> jsonb_build_array('<digest>');
  ```

This starter has no preview Worker. The Durable Objects of the dashboard hold state that refers to the database: the
decision timers, the assistant conversations, the runner connections and the applet versions. A preview Worker on
the same database would split that state.

## The first run

1. Deploy, and set the Worker secrets.
2. Open `https://<your dashboard>/`. The sign-in page shows the first-run step. The step stores the host that you
   opened it on as the default domain of the deployment, so open it on the dashboard's own host. Enter the setup token, your
   e-mail address, a password and the name of the organization. You are the owner.
   `pnpm exec inferative setup-token --env-file .env.worker` prints the token that the root gives. The step closes
   after its first run, so the token needs no step after it.
3. Enrol an authenticator on the Security page of your account.

The first run creates nothing else: no channel, no department, no project. Create them in the dashboard.

The first organization that the first-run step creates is the platform organization of the deployment. It starts on
the Business plan (`INFERATIVE_BASE_TIERS_PLATFORM_ORGANIZATION_PLAN_KEY` names another plan), and every other
organization starts on Work. Its owners and administrators are the platform operators. A plan that an operator set on
purpose wins over the setting.

## Applets

An applet is a small app that the assistant writes for a person, with a backend and a page. The dashboard keeps the
records of the applets and serves their routes. The applet supervisor builds and runs each applet:

- `HostAppletObject` (`workers/applets/src/host-applet.object.ts`) is the applet supervisor: one Durable Object for
  each applet. It builds the sources of the applet, keeps each version, and runs the live version in an isolate of its
  own.
- The build of the applets Worker bakes the packages that an applet may import (`cloudflare.forge.kit` in
  `workers/applets/heximon.config.ts`) into that Worker. The supervisor builds each applet against that kit.
- `workers/applets/heximon.config.ts` exports the supervisor (`APPLET_SUPERVISOR`, with SQLite storage) and binds the
  Worker Loader (`APPLET_LOADER`) that runs each applet. `heximon.config.ts` binds `APPLET_SUPERVISOR` of the dashboard
  Worker to that class by the name of the applets Worker. The packages read the two binding names.

The applets get an empty capability catalog, so an applet that asks for a dashboard record is refused by name. Each
applet runs with no network and no call back to the dashboard.

## Send email

`NotificationsModule` sends the mails of the dashboard: an invitation, a password reset. Each mail goes through the
provider and the address that the platform organization sets on Settings › Organization › Mail and SMS. Until they are
set, no mail goes out: each mail goes to the log instead. Under `nuxt dev` the log line also holds the links of the
mail, so you can open a reset link. A deployed Worker logs only the subject and the recipient.

To send real mail:

1. Sign in as an owner or an administrator of the platform organization (the first organization). Open Settings ›
   Organization › Mail and SMS.
2. Add a provider. The Worker sends through Cloudflare Email Service with the `send_email` binding `SEND_EMAIL` of
   `nuxt.config.ts`: it needs no credential. A Resend account works too: paste an API key with full access. A
   credential goes into the secret store and never comes back.
3. Add the domain that the mail goes from, such as `mail.acme.example`. For Cloudflare Email Service the domain must be
   on a zone of your Cloudflare account: run `pnpm exec wrangler email sending enable <domain>` once. Set the records
   that the screen shows (our ownership record and the provider's records) at the DNS host of the domain. The server
   checks a new domain every 10 minutes; Check now checks it at once. The Worker has no Cloudflare API credential, so a
   Cloudflare Email Service domain proves itself by a mail: once its ownership record is set, choose Send a test mail
   in the domain's menu. A test mail that the binding accepts verifies the domain.
4. Add an address at the domain, with the name that people see. The first address is the one that every mail goes
   from.

5. To put the bounces and complaints of Cloudflare Email Service on the suppression list, add an Email Service event
   subscription in your Cloudflare account that sends its events to the queue `my-inferative-dashboard-email-events`
   (created with the other resources above). The Worker reads the queue, and a hard bounce or a complaint stops all mail
   to that address. Without the subscription, only Cloudflare's own suppression list stops a send to such an address.

No env file and no Worker secret holds a mail setting.

## Telegram

`ChatModule` (with its light root `ChatCapabilitiesModule`) sends the inbox items that need a member to their person chat, with answer buttons, and lets them write
to their own assistant there. The person chat is the member's own chat with their personal agent's messaging account
(a Telegram bot of the agent), which they link in Your account › Profile › My messaging accounts. The dashboard has no
bot of its own and no setting for one. This starter does not compose the agents' messaging accounts
(`AgentMessagingModule`) yet, so its person chat stays empty until a host adds them; nothing is sent meanwhile.

`ChatDeliveryTimersModule` sends an item that waits for its place in the pace of a chat (one message a second) at
that place. Delete its line, and the minute sweep sends such an item, up to a minute late.

## GitHub

`ConnectorsModule` (with its light root `ConnectorsCapabilitiesModule`) holds the connections of an organization: the outside accounts (mail, files) on Your account ›
Connections and on Settings › Organization › Connections, and the installations of the GitHub App of the deployment.
`ConnectorTriggersModule` runs the triggers of the outside connections on the minute tick. The App is what reports a
failed CI check: when CI fails on a commit that an agent pushed, GitHub sends a webhook delivery to the dashboard, and
the agent works on its task again with the output of the failed checks. The App also gives the write token of a
runner's checked push and opens draft pull requests.

The App is a setting of the deployment: one App for the dashboard, which each organization installs on its own GitHub
account. A platform administrator sets it on Platform › Integrations, under "GitHub App". No variable holds
it: the private key, the webhook secret and the client secret stay in the secret store, and nobody can read them back.

- **Create the GitHub App.** Type the GitHub organization that owns the App, or leave the field empty for your own
  account, and click "Create the GitHub App". GitHub creates the App from the dashboard's manifest: the webhook URL
  (`https://<your dashboard>/api/connectors/github/webhook`), the callback address of the install, the user
  authorization during the install, the events (check suite, workflow run, pull request, pull request review) and the
  permissions (actions, checks and metadata: read; contents, issues, pull requests and workflows: read and write; the
  organization's members: read). GitHub then sends you back, and the dashboard saves the App.
- **Use an existing App.** Type its App ID, client ID, client secret, webhook secret and private key (the text of the
  `.pem` file). GitHub checks the App ID and the key before the dashboard saves the App. The tab shows the webhook URL
  and the callback address to set on the App. To change one secret later, type only that secret: an empty field keeps
  the saved value.

A new App replaces the saved one; each organization then installs the new App again. Without a saved App, no
installation gives a token and the webhook route refuses every delivery. A GitHub Enterprise server sets
`INFERATIVE_CONNECTORS_GITHUB_API_BASE_URL` (the default is `https://api.github.com`). A local run on `localhost` gets
no delivery: GitHub reaches only a public `https://` address.

Install the App on the GitHub account that owns each repository. The webhook delivery of an installation reaches an
organization of the dashboard only when the organization holds the connection of that installation. The repository
dialog of a project shows GitHub with its logo for a repository on GitHub, and offers "Wake the agent when CI fails"
only when GitHub reports the checks of that repository: the App is set, and the organization holds the active
installation of the owner of the repository. For any other repository, the dialog says why the wake is off.

The catalog of outside accounts (mail, files) is data of the release. The Release run writes it after the migrations
(`pnpm release:data`). `pnpm connectors:catalog` writes the entries of the release into the database of `.env`, and a
second run writes nothing. Without the catalog, Add connection offers no provider, and the Add an OAuth client dialog
says that no outside service is available yet.

## The three Workers

| Worker | Folder | What it runs |
| :-- | :-- | :-- |
| The dashboard Worker | the project root (`server/`, Nuxt) | Every module of `server/app.module.ts`: the pages, the API, the database and the files. It serves every route of the hostname, the routes of the applets included. |
| The applets Worker | `workers/applets/` (Heximon, no Nuxt) | The applet supervisor and the Worker Loader of the applets. The supervisor builds each applet and assembles its page. The Worker also reads the text of the PDF and Office files that a person attaches to a message (`src/attachment-text.entrypoint.ts`), each in a Dynamic Worker with no network, no binding and 5 s of CPU time. It has no route, no database and no secret: the dashboard Worker reaches it through the `APPLET_SUPERVISOR` and `ATTACHMENT_TEXT` bindings only. `src/app.module.ts` composes no module yet: add a module there when this Worker needs one. |
| The rooms Worker | `workers/rooms/` (Heximon, no Nuxt) | The room of the realtime streams (`src/realtime-room.module.ts`). The dashboard Worker serves the stream address and checks the host; the stream room checks each ticket and the access of each person again, so the Worker reads the database of the dashboard through the same Hyperdrive id and needs the same root secret and the same `INFERATIVE_REALTIME` (the whole section as JSON) and `INFERATIVE_REALTIME_*` variables. It reads `inferative.config.ts` of the project. It has no route and no `workers.dev` address: the dashboard Worker binds the room by the name of the Worker (`scriptName` in `heximon.config.ts`). |

The applets have a Worker of their own because of the size limit. Cloudflare takes at most 64 MiB of code for one
Worker. The applet supervisor carries a compiler, a bundler and the kit of the applets: the applets Worker is about 24 MiB.
The reader of attached files carries its PDF and Office parsers there too (about 1.6 MiB), and a parse needs more memory
than the isolate of the dashboard Worker has free.
The dashboard Worker is about 14 MiB without it (3.5 MiB with gzip, 95 modules), and it grows with each release. It is
this small because the browser draws every screen, the sign-in pages too: the Worker holds no Vue server app.
An isolate keeps the source of every module in its heap, so each MiB of code is also a MiB of the 128 MB memory limit
of the isolate.

The rooms have a Worker of their own because each Durable Object starts the whole app of its Worker. In the dashboard
Worker, a cold stream room loads the code of the dashboard (about 14 MiB) and boots every module. In the rooms Worker it
loads a small part of it, and its startup takes a fraction of the time. The timer room stays in the
dashboard Worker: it runs the handlers of the dashboard. A small deployment can keep the stream room in the dashboard Worker,
where it boots the dashboard: "One Worker for a small deployment" in
`SETUP.md` has the steps.

### The clock of the scheduled jobs

The dashboard Worker has no cron trigger. One Durable Object of the Worker, `ScheduleTickRoom` of `server/app.module.ts`,
is the clock: its alarm fires one tick each minute, and the tick runs every job that is due
(`schedule: { trigger: "durable-alarm" }` in `heximon.config.ts`). The room stays in the dashboard Worker, because the
jobs need the modules of the dashboard. Its isolate stays in memory between two alarms, so a tick boots the app once
and then runs only its jobs. A cron trigger started a new isolate somewhere in the world for almost each tick, far from
the database. The room runs where Cloudflare creates it, and it never moves after that. `locationHint` of the
`schedule` block asks Cloudflare to create it in the region of the database (`weur`: western Europe; phase 5 of
`SETUP.md` writes it from the database region). Without the hint, Cloudflare creates the room near the first isolate
that calls it, and that isolate can be anywhere in the world. A cron invocation never creates the room. It stores only
the time of its last tick.

A room that already runs in another region stays there; a new hint does not move it. To move it, delete the room in
one deploy and let the next deploy create it again: "Place the tick room" of Heximon's scheduled jobs guide has the
steps. The old room must stop with the delete, or each job runs twice.

Each start of an isolate of the Worker arms the alarm when it is not set. `ScheduleRecoveryMiddleware` (in
`http.middlewares`) arms it again when a start failed to arm it. After an arm, an isolate calls the room again only
after the time of the pending alarm, so a warm isolate makes about one room call each minute, not one for each request.

The empty `triggers.crons` of `nuxt.config.ts` makes each `wrangler deploy` remove a cron trigger of an older install:
without it, wrangler keeps the trigger of the last deploy, and each job runs twice. The first deploy of this clock
creates the room (the build writes its class to `exports`) and needs no manual step. The deploy removes the old
cron trigger at once, but the clock starts only when an isolate of the new Worker starts: the first request after the
deploy (a page, an API call, `GET /api/ready`) arms it. On an install with no traffic, open the dashboard once after
that deploy.

The page shell is a static file: the build writes `.output/public/_shell.html`, and `.output/public/_redirects` sends
each page address to it, so a page document does not start the Worker. The shell starts one boot request
(`GET /api/_boot`) before the code of the app loads; the Worker answers it with the session, the capabilities, the
locale and the build. `.output/public/_headers` gives the shell the security headers of the Worker. The Worker's own
paths (`/api` and `/.well-known`, from the route census of the build) reach the Worker first
(`assets.run_worker_first` in `.output/server/wrangler.json`). Every other address that is no page address and no file
of the build reaches the Worker after the assets: a missing file (an old `/_nuxt/` chunk, a scanner's `/wp-login.php`)
answers 404 with `no-store`, and an address that no page holds gets the Worker's page shell, whose not-found page
draws it.

`pnpm build` builds the dashboard Worker into `.output/`, `pnpm build:applets` builds the applets Worker into
`workers/applets/dist/`, and `pnpm build:rooms` builds the rooms Worker into `workers/rooms/dist/`. Deploy the applets
Worker and the rooms Worker first: the dashboard Worker binds their classes by name, and the deploy of the dashboard
Worker fails while one of them does not exist. While the deployed dashboard Worker still binds an old room of the rooms
Worker, `pnpm deploy:rooms` waits, and `pnpm deploy:rooms:after` deploys the rooms Worker after the dashboard Worker;
on any other install `pnpm deploy:rooms:after` has nothing to do. The edge Worker and the binding to its cache come after the dashboard
Worker ("Public read cache"). The Release workflow keeps this order. By hand:

```sh
pnpm build
pnpm build:applets
pnpm build:rooms
pnpm deploy:applets
pnpm deploy:rooms
pnpm deploy:live
pnpm deploy:rooms:after
pnpm deploy:edge
pnpm deploy:bind
```

Read the size of each Worker after a build with `pnpm exec wrangler deploy --dry-run --config <config>`, where the
config is `.output/server/wrangler.json`, `workers/applets/dist/wrangler.json` or `workers/rooms/dist/wrangler.json`.
`pnpm heximon:check` compiles the dashboard Worker; `pnpm exec heximon check --cwd workers/applets` compiles the
applets Worker, and `pnpm exec heximon check --cwd workers/rooms` the rooms Worker.

## Add or remove a capability

Add the module of the package and its Postgres persistence module to `server/app.module.ts`, and its tables to
`schema.ts`. Add its layer to `extends` in
`nuxt.config.ts`. The default navigation shows its entry while the module is composed; a page of your own goes into
`dashboard.navigation` in `app/app.config.ts`. Run `pnpm heximon:check`, then
`pnpm db:generate`. Delete the same lines to remove one. A module that adds a Durable Object, a queue or a workflow
adds it to the Worker by itself: read `.output/server/wrangler.json` after a build.

## Back up and restore

`pnpm backup` runs `inferative backup`. It writes one archive of the Postgres database and the R2 bucket of the
dashboard, encrypted with age, restores an archive into an empty database and an empty bucket, and compares a database and
a bucket with an archive. Write an env file with the `DATABASE_URL` of the database, the four `INFERATIVE_FILES_R2_*`
values of the bucket (an access key with read access for a backup, with write access for a restore) and
`INFERATIVE_BACKUP_AGE_RECIPIENT`, the age public key. Do not commit it.

```sh
pnpm backup keygen --out ~/keys/dashboard-backup.txt
pnpm backup create --out ~/backups/dashboard-2026-10-20.tar.gz --env-file ~/backups/dashboard.env --r2
pnpm backup verify --archive ~/backups/dashboard-2026-10-20.tar.gz.age --identity ~/keys/dashboard-backup.txt --env-file ~/backups/dashboard.env --r2
```

`keygen` writes the age private key to a new file of mode 600 and prints the public key. Keep the private key offline,
apart from the archives: a restore and a check need it, and nobody can read an archive without it. `create` adds
`.age` to the archive name. `--unencrypted` writes a plain archive.

While `create` runs, it holds a deletion fence: the Worker refuses each delete of a stored object and does it after
the backup, so the archive holds every object that its rows name. A restore applies the migrations of the backup from
`server/persistence/pg/migrations/`, writes the rows and the objects, and then runs the same check as `verify`. `--wrangler-state .wrangler/state --bucket <bucket_name>` reads the
local state of `wrangler dev` instead of the bucket. The archive holds personal data and sealed secrets: keep it as
you keep the database. The runbook is [Backup and restore](https://inferative.dev/docs/deploy/backup-and-restore).

A restore writes a new incarnation of the public reads, so no cache serves an answer of the backed-up database. After
a restore by other means (a database dump, a restore of the provider), run `pnpm exec inferative read-epoch rotate
--env-file <env file>` once against the restored database.

A restore needs the root that sealed the data of the archive: the archive holds no key. Put `INFERATIVE_ROOT_SECRET`
(and `INFERATIVE_ROOT_SECRET_PREVIOUS`, during a rotation) in the env file of `restore` and `verify`. The check then opens one value of each key of the secret
store, and fails and names the variable that lacks a key.

### The nightly backup

`.github/workflows/backup.yml` runs `pnpm backup create --r2` each night at 02:30 UTC, before the nightly sweeps that
delete stored objects, and on a manual run (`gh workflow run backup.yml`). `pnpm backup upload` then copies the
encrypted archive to `nightly/` in a separate bucket of archives. Create that bucket once, with a lifecycle rule that
deletes an archive 30 days after its upload:

```sh
pnpm exec wrangler r2 bucket create <dashboard>-backups
pnpm exec wrangler r2 bucket lifecycle add <dashboard>-backups expire-archives --expire-days 30 --force
```

The workflow reads these repository secrets. A run with a missing secret fails and names it.

| Secret | Value |
| :-- | :-- |
| `DATABASE_URL` | The direct connection string of the database. |
| `INFERATIVE_FILES_R2_ACCOUNT_ID`, `INFERATIVE_FILES_R2_BUCKET` | The account id and the files bucket. |
| `INFERATIVE_FILES_R2_ACCESS_KEY_ID`, `INFERATIVE_FILES_R2_SECRET_ACCESS_KEY` | An R2 access key that reads the files bucket. |
| `INFERATIVE_BACKUP_R2_BUCKET` | The bucket of archives, in the same account. |
| `INFERATIVE_BACKUP_R2_ACCESS_KEY_ID`, `INFERATIVE_BACKUP_R2_SECRET_ACCESS_KEY` | An R2 access key that writes the bucket of archives. |
| `INFERATIVE_BACKUP_AGE_RECIPIENT` | The age public key. The private key never goes into GitHub. |

## Commands

| Command | What it does |
| :-- | :-- |
| `pnpm dev` | Runs the dashboard with hot reload. |
| `pnpm build` | Builds the dashboard Worker into `.output/`. |
| `pnpm build:applets` | Bakes the applet kit and builds the applets Worker into `workers/applets/dist/`. |
| `pnpm deploy:applets` | Deploys the last build of the applets Worker. Deploy it before the dashboard Worker. |
| `pnpm build:rooms` | Builds the rooms Worker into `workers/rooms/dist/`. |
| `pnpm deploy:rooms` | Deploys the last build of the rooms Worker. Deploy it before the dashboard Worker. It first reads the secrets of the Worker (`wrangler secret list`) and stops when `INFERATIVE_ROOT_SECRET` is absent, with the command that sets it; a Worker that does not exist yet passes. While the deployed dashboard Worker still binds a room that the rooms Worker deletes, it deploys nothing and says so. |
| `pnpm deploy:rooms:after` | Deploys the rooms Worker after the dashboard Worker when `pnpm deploy:rooms` waited, with the deletion of its old rooms. On any other install it has nothing to do. |
| `pnpm deploy:live` | Deploys the last build of the dashboard Worker; without `PUBLIC_READ_PURGE` while the edge Worker does not exist. On an install that still holds a room of the rooms Worker, it first deletes the old room namespaces in an upload of its own ("Deploy"). |
| `pnpm deploy:bind` | After the first `pnpm deploy:edge`: deploys the dashboard Worker again with `PUBLIC_READ_PURGE`. Otherwise it does nothing. |
| `pnpm deploy:edge` | Deploys the edge Worker of `workers/edge/`, which fronts the host. Deploy it after the dashboard Worker. |
| `pnpm typecheck` | Type-checks the Vue files and the server. |
| `pnpm heximon:check` | Compiles the modules and reports the wiring errors. |
| `pnpm db:generate` | Writes a migration from `schema.ts`. |
| `pnpm db:migrate` | Applies the migrations to `DATABASE_URL` with `inferative database migrate`, each migration in a transaction of its own. |
| `pnpm release:data` | Runs the two data tasks of the release, `tiers:seed` and `connectors:catalog`, against the `DATABASE_URL` of the environment. The Release workflow runs it after the migrations. |
| `pnpm tiers:seed` | Loads the plans of the release into the database of `.env`. The Release run does it (see "Deploy"). |
| `pnpm connectors:catalog` | Writes the catalog of outside accounts of the release into the database of `.env`. The Release run does it (see "GitHub"). |
| `pnpm mfa:reseal` | Seals every two-factor secret in the database of `.env` again under the MFA key of the root, and prints how many secrets remain (see "Secrets"). |
| `pnpm secrets:rewrap` | Seals every value of the secret store in the database of `.env` again under the key of the root, and prints how many values are still under another key (see "Secrets"). |
| `pnpm backup` | Backs up the database and the files, restores them, checks them and uploads an archive (`create`, `restore`, `verify`, `upload`, `keygen`). |
| `pnpm test` | Runs the tests in `test/`. `test/dashboard.test.ts` is an empty file to start from. |
