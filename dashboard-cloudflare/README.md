# Inferative dashboard: dashboard-cloudflare

The Inferative dashboard as one Nuxt app and one Cloudflare Worker. The dashboard is at the root of the Worker, `/`.
It holds every capability of Inferative: projects and agents, the inbox and decisions, the assistant,
content, pages, files, publishing, SEO, the visual editor, translations and categories, channels and realtime.

The database is Postgres, reached through Cloudflare Hyperdrive. A published release deploys the Worker.

The first run starts empty. You create the owner account and the organization at `/` with the setup token, and
everything else in the dashboard.

An agent can do the setup for you: the skill `dashboard-setup` (`npx skills add https://inferative.dev --skill
dashboard-setup`) runs each step below and stops at each browser step.

## The files

| File | What it holds |
| :-- | :-- |
| `server/app.module.ts` | The modules of the dashboard. Each line adds one capability. Delete a line to remove it. |
| `server/app.module.ts` (Cloudflare) | The Durable Objects of the Worker: the key-value `Storage` (`CloudflareStorageInfrastructure`), the response cache, the rate limits, the decision timers, the assistant conversations and the realtime streams. `inferative.config.ts` names the `durable-object` driver for a production build, and the Worker refuses to boot on any other store. |
| `server/app.module.ts` (files) | `CloudflareFilesStoreInfrastructure` stores the files and the large assistant rows in the R2 bucket. `FilesR2DevelopmentStore` reaches the same bucket under `nuxt dev`. |
| `server/persistence/pg/` | The Postgres setup: the connection, the config, the persistence module and `schema.ts`. |
| `server/applets/` | The applet supervisor. See "Applets". |
| `server-split/app.module.ts` | The root of the dashboard Worker in the split topology: the list of `server/app.module.ts` without the visual editor. See "One Worker or more". |
| `workers/visual-editing/` | The Worker of the visual editor in the split topology. See "One Worker or more". |
| `workers/applets/` | The Worker of the applet supervisor in the split topology. See "One Worker or more". |
| `workers/worker-topology.ts` | The name of the dashboard Worker and of each part's Worker, and `INFERATIVE_WORKERS`, the setting that picks the topology. |
| `workers/transfer-durable-objects.ts` | Moves the applet supervisor, with its storage, when a release changes the topology. See "Switch a deployed dashboard". |
| `drizzle.config.ts` | The config of `drizzle-kit`. |
| `inferative.config.ts` | The values that this dashboard changes from the package defaults. `assistant.playbooks` adds the notes of your own pages to the assistant. |
| `nuxt.config.ts` | The Nuxt layers. `nitro.minify` keeps the Worker below the Cloudflare limits of 64 MiB of code and 1 s of startup. |
| `heximon.config.ts` | The compiler plugins, the one cron trigger of the schedule (every minute), and the Worker bindings: the Hyperdrive id, the R2 bucket, the applet supervisor and its Worker Loader (`cloudflare`). |
| `heximon.upgrade.json` | The record of the durable surface: the events, the timers and the workflow steps that stored work names. It is generated: run `pnpm heximon:check --update` and commit the result. |
| `app/` | The navigation of the dashboard. |
| `.github/workflows/release.yml` | A published release, or a manual run, migrates the database and deploys the Worker. |
| `.github/workflows/backup.yml` | Each night, or on a manual run, writes an encrypted archive of the database and the files and uploads it. |

## Start

1. Copy `.env.example` to `.env`. Fill the empty secrets (see "Secrets"). The `INFERATIVE_FILES_R2_*` values are
   optional (see "Cloudflare").
2. Run `pnpm install`. Commit `pnpm-lock.yaml`: the workflow installs with `--frozen-lockfile`.
3. Run `pnpm db:generate` once. It writes the first migration into `server/persistence/pg/migrations/`. Commit it.
4. Run `pnpm dev`. The dashboard is at `http://localhost:3000`.

`inferative init` wrote the registry lines of `@inferative` and `@heximon` into `.npmrc`. It holds no token. Commit it.

The migrations run when the app starts. A local run uses the direct `DATABASE_URL`, so it reads and writes the
hosted database. `HEXIMON_SCHEDULE=off` keeps the scheduled jobs off: only the deployed Worker runs them.

The database pool holds at most 20 connections: on Node one pool for all requests, on the Worker one pool for each
request. To change it, set `base.database.poolSize` in `inferative.config.ts` or `INFERATIVE_BASE_DATABASE_POOL_SIZE`
in the environment.

## Secrets

The Worker refuses to boot without these values. Make each one once, with Node:

| Variable | Make it with |
| :-- | :-- |
| `INFERATIVE_IDENTITY_SIGNING_KEY` | `node -p 'const k=require("node:crypto").generateKeyPairSync("ec",{namedCurve:"P-256"}).privateKey.export({format:"jwk"});Buffer.from(JSON.stringify({...k,alg:"ES256"})).toString("base64")'` |
| `INFERATIVE_IDENTITY_MFA_ENCRYPTION_KEY` | `node -p 'require("node:crypto").randomBytes(32).toString("base64url")'` |
| `INFERATIVE_IDENTITY_SETUP_TOKEN` | `node -p 'require("node:crypto").randomBytes(24).toString("base64url")'` |
| `INFERATIVE_BASE_SIGNED_ACCESS_SIGNING_KEYS` | `node -p 'JSON.stringify([{kid:"key-1",secret:require("node:crypto").randomBytes(48).toString("base64url")}])'` |
| `INFERATIVE_REALTIME_TICKET_SECRET` | `node -p 'require("node:crypto").randomBytes(32).toString("hex")'` |
| `INFERATIVE_ASSISTANT_HISTORY_ENCRYPTION_KEY` | `node -p 'require("node:crypto").randomBytes(32).toString("base64url")'` |
| `INFERATIVE_SECRETS_KEYS` | `node -p 'JSON.stringify([{id:"key-1",material:require("node:crypto").randomBytes(32).toString("base64"),current:true,derive:true}])'` |

Keep a copy of each value outside the repository. A new signing key signs everyone out. A new MFA key, history key or
secret-store key makes the data that the old key sealed unreadable.

A local run and the Worker use one database. Use the same MFA key, signed-access keys, history key and secret-store
keys in `.env` and on the Worker: they seal data in that database. The signing key, the setup token and the ticket
secret may differ.

The Worker also needs `INFERATIVE_APP_ORIGIN` (the `https://` address of the dashboard, with no path) and
`INFERATIVE_NOTIFICATIONS_SENDER_EMAIL`. For the assistant, set `INFERATIVE_ASSISTANT_BACKEND_DRIVER`,
`INFERATIVE_ASSISTANT_BACKEND_API_KEY`, `INFERATIVE_ASSISTANT_BACKEND_MODEL` and `INFERATIVE_BASE_PROCESSING_MODEL`
(`.env.example` says how). For the
websites of your channels, set `INFERATIVE_CHANNELS_ADMINISTRATION_ORIGINS`. The Worker needs no `DATABASE_URL`: it
uses Hyperdrive.

The first deploy gives the address. `wrangler deploy` prints it, and so does the log of the Release run:
`https://<worker name>.<subdomain>.workers.dev`. Use it for `INFERATIVE_APP_ORIGIN`, or use `https://<domain>` for a
custom domain. If the deploy asks for a `workers.dev` subdomain, set it once in the Cloudflare dashboard under
**Workers & Pages**.

Write the Worker values into `.env.worker` (`.gitignore` keeps every `.env.*` file out of the repository) and send
them once: `pnpm exec wrangler secret bulk .env.worker --name my-inferative-dashboard`. The workflow does not set
Worker secrets.

## Cloudflare

Replace the placeholders: the Worker name (`dashboardWorker`) in `workers/worker-topology.ts`, and the id of the Hyperdrive configuration and the name
of the R2 bucket in `heximon.config.ts`. Then create the resources once:

```sh
pnpm exec wrangler hyperdrive create my-inferative-dashboard --connection-string="<the direct postgres:// address>" --caching-disabled --sslmode require
pnpm exec wrangler r2 bucket create my-inferative-dashboard-files
pnpm exec wrangler queues create saga-timer-queue
```

Keep the caching of Hyperdrive off: with caching on, a person can save a change and then read old data. Pass the
address without its query part (`?sslmode=...`): `--sslmode` carries the TLS setting. A provider whose certificate
Hyperdrive checks with `verify-full` needs a CA certificate in the account first. PlanetScale is one: upload the
ISRG roots of Let's Encrypt with `pnpm exec wrangler cert upload certificate-authority`, then create the config with
`--sslmode verify-full --ca-certificate-id <id>` in place of `--sslmode require`. The first deploy creates the
Durable Objects, the Worker Loader of the applets and the Cloudflare Workflow `assistant-api-run`. The Worker sends each
fired decision timer through the queue `saga-timer-queue` and reads it back.

The names `saga-timer-queue` and `assistant-api-run` are fixed by the packages, and Cloudflare keeps one queue and one
workflow of a name for each account. So one Cloudflare account holds one dashboard.

For local development, create an R2 access key in the Cloudflare dashboard: **R2 object storage**, then **Manage**
beside **API Tokens**, then **Create Account API token**. Enter a name, choose **Object Read & Write**, and apply it to
the bucket of the dashboard only. The dashboard shows the key id and the secret once. The account id is on the R2
overview page. Put the four values in `.env` (`INFERATIVE_FILES_R2_ACCOUNT_ID`, `INFERATIVE_FILES_R2_BUCKET`,
`INFERATIVE_FILES_R2_ACCESS_KEY_ID`, `INFERATIVE_FILES_R2_SECRET_ACCESS_KEY`). Without them, a local run keeps files in
memory and prints one warning. The built Worker uses the binding and carries no AWS code.

## Deploy

| Event | What runs |
| :-- | :-- |
| A published release, or a manual run | `pnpm db:migrate`, `pnpm build`, then `pnpm deploy:live`. |

The workflow reads these secrets of the organization: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and
`READ_PACKAGES_TOKEN`. It reads `DATABASE_URL` from the secrets of the repository. A deploy by hand runs the same
three commands.

This starter has no preview Worker. The Durable Objects of the dashboard hold state that refers to the database: the
decision timers, the assistant conversations, the runner connections and the applet versions. A second Worker on the
same database would split that state.

## The first run

1. Deploy, and set the Worker secrets.
2. Open `https://<your dashboard>/`. The sign-in page shows the first-run step. Enter the setup token, your
   e-mail address, a password and the name of the organization. You are the owner.
3. Delete the setup token from the Worker: `pnpm exec wrangler secret delete INFERATIVE_IDENTITY_SETUP_TOKEN --name my-inferative-dashboard`.
   Delete its line from `.env.worker` too, so that a later `wrangler secret bulk` does not set it again.
4. Enrol an authenticator on the Security page of your account.

The first run creates nothing else: no channel, no department, no project. Create them in the dashboard.

Optional, for our own organization: an organization starts on the Work plan. To put the organization that runs this
deployment on Business, set its id on the Worker:
`pnpm exec wrangler secret put INFERATIVE_BASE_TIERS_OWN_ORGANIZATION_ID --name my-inferative-dashboard`. The id is in the
answer of `GET /api/identity/session` (`activeOrganizationId`). A plan that an operator set on purpose wins over the
setting.

## Applets

An applet is a small app that the assistant writes for a person, with a backend and a page. The dashboard keeps the
records of the applets and serves their routes. The applet supervisor builds and runs each applet:

- `HostAppletObject` (`server/applets/host-applet.object.ts`) is the applet supervisor: one Durable Object for each
  applet. It builds the sources of the applet, keeps each version, and runs the live version in an isolate of its own.
- The build bakes the packages that an applet may import into `server/applets/forge-kit.generated.js` (Git ignores
  it). The supervisor builds each applet against that kit.
- `heximon.config.ts` binds the supervisor (`APPLET_SUPERVISOR`, with SQLite storage) and the Worker Loader
  (`APPLET_LOADER`) that runs each applet. The packages read the two binding names.

The applets get an empty capability catalog, so an applet that asks for a dashboard record is refused by name. Each
applet runs with no network and no call back to the dashboard.

The supervisor is about 21 MiB of code: the dashboard Worker is about 46 MiB with it, of the 64 MiB that Cloudflare
takes. The Worker grows with each release. When it comes near the limit, run the supervisor in a Worker of its own:
`INFERATIVE_WORKERS=applets` (see "One Worker or more"). The next release moves the applets that exist, with their
versions and their data, to that Worker.

## Send email

`NotificationsModule` sends the mails of the dashboard: an invitation, a password reset. The starter has no mail
provider, so no mail goes out. Each mail goes to the log instead. Under `nuxt dev` the log line also holds the links
of the mail, so you can open a reset link. A deployed Worker logs only the subject and the recipient.

To send real mail, add a provider. For example, Resend:

1. Run `pnpm add resend`.
2. Add `server/mail.module.ts`:

   ```ts
   import { EmailTransport } from "@heximon/notifications/email";
   import { ResendTransport } from "@heximon/notifications/email/resend";
   import { Module } from "@heximon/runtime";
   import { SchemaObject } from "@heximon/schema";
   import * as v from "valibot";

   /** The key of the mail provider. Only the environment sets it: `INFERATIVE_MAIL_RESEND_API_KEY`. */
   export class MailConfig extends SchemaObject({ resendApiKey: v.string() }) {}

   /** Sends the mails of the dashboard through Resend. */
   export class MailModule extends Module({
     config: { mail: MailConfig },
     providers: [
       {
         provide: EmailTransport,
         useFactory: (config: MailConfig): EmailTransport =>
           new ResendTransport({ apiKey: config.resendApiKey })
       }
     ],
     exports: [EmailTransport]
   }) {}
   ```

3. Add `MailModule` to `imports` in `server/app.module.ts`.
4. Set `INFERATIVE_MAIL_RESEND_API_KEY` in `.env` and in the secrets of the Worker.
5. Set `INFERATIVE_NOTIFICATIONS_SENDER_EMAIL` to an address on a domain that Resend verified.

## One Worker or more

The dashboard deploys as one Worker by default. One setting moves a part to a Worker of its own when you build:
`INFERATIVE_WORKERS`, a comma-separated list of the parts `visual-editing` and `applets`. The code stays the same.
Unset the setting to go back to one Worker. "The applets in a Worker of their own" below describes `applets`; the rest
of this section describes `visual-editing`.

| | One Worker (default) | Two Workers (`INFERATIVE_WORKERS=visual-editing`) |
| :-- | :-- | :-- |
| The dashboard Worker | `server/app.module.ts`, every module. | `server-split/app.module.ts`: the same list without `VisualEditingModule`. |
| The Worker of the visual editor | None. | `workers/visual-editing/`: `VisualEditingModule` on the same database, with identity to resolve the caller. |
| The routes of the visual editor | Served by the one Worker. | A route of your hostname, `<hostname>/api/visual-editing/*`, sends them to the second Worker. The most specific route wins, so every other path stays with the dashboard Worker. |
| A server render of the dashboard | Calls the routes in process. | Calls the routes of the visual editor over the service binding `VISUAL_EDITING`, with the cookie and the `authorization` header of the request. |
| Events between the Workers | None. | Each Worker sends an event that the other Worker handles to its queue: `heximon-ie-visual-editing` and `heximon-ie-dashboard`. |
| The shared state | One Worker holds it. | The dashboard Worker owns it. It applies the migrations, and the second Worker runs none. It exports the one `StorageRoom` (the session cache, the OAuth transactions, the command idempotency keys), and the second Worker binds it with `script_name`. Both Workers write to the one outbox table, and the relay of each Worker drains only the rows of its own service (`dashboard`, `visual-editing`). |
| The scheduled jobs | Each job runs in the one Worker. | Both Workers compose the jobs of the base and of identity. Each Worker claims a tick in the shared `StorageRoom` first (`SharedScheduleLease`, `SecondaryScheduleLease` in the second Worker), so each tick runs in one Worker. The second Worker composes no model proxy registry, so the model-proxy probes run in the dashboard Worker, whose secret store holds their keys. The outbox sweep runs in each Worker, for its own rows. |

Keep the two root lists the same, apart from `VisualEditingModule`: add a module to both files, and delete it from
both.

Both Workers serve one hostname, so the browser stays on one origin and the session cookie works on both. The second
Worker reads the session from the shared database itself. `workers/worker-topology.ts` holds the name of the second
Worker, its binding, its contracts and its paths: the build of each Worker reads them from there.

To deploy two Workers:

1. Deploy the dashboard as one Worker first. The second Worker binds the `StorageRoom` of the dashboard Worker, so that
   Worker must exist before the second Worker deploys.
2. Create the two queues once: `pnpm exec wrangler queues create heximon-ie-visual-editing` and
   `pnpm exec wrangler queues create heximon-ie-dashboard`.
3. Set the name of the second Worker in `workers/worker-topology.ts`, and the id of your Hyperdrive configuration in
   `workers/visual-editing/heximon.config.ts`.
4. Set four secrets on the second Worker, with the values of the dashboard Worker: `INFERATIVE_APP_ORIGIN`,
   `INFERATIVE_BASE_SIGNED_ACCESS_SIGNING_KEYS`, `INFERATIVE_IDENTITY_SIGNING_KEY` and
   `INFERATIVE_IDENTITY_MFA_ENCRYPTION_KEY`.
5. Serve the dashboard on a hostname of a zone of your Cloudflare account, as a Custom Domain or a route. A route of
   the second Worker takes precedence over a Custom Domain on the same hostname. A `workers.dev` address cannot send a
   path to a second Worker.
6. Set the repository variables `INFERATIVE_WORKERS` to `visual-editing` and `INFERATIVE_HOSTNAME` to that hostname
   (`dashboard.example.com`). The Release workflow then builds and deploys both Workers. By hand: `pnpm build`,
   `pnpm build:visual-editing`, `pnpm deploy:visual-editing` and `pnpm deploy:live`, each with both variables.

Set the variables for the build only, not in `.env`: `pnpm dev` would then start the dashboard without the visual editor.

To go back to one Worker, unset `INFERATIVE_WORKERS` and keep `INFERATIVE_HOSTNAME` for the next deploy. After the
dashboard Worker deploys, the Release workflow runs `pnpm detach:routes`: it detaches the route of the second Worker,
which would still send `/api/visual-editing/*` to the old Worker. By hand, run `pnpm detach:routes` after
`pnpm deploy:live`, with `INFERATIVE_HOSTNAME`, `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` set. It reads only
the zones of that account, detaches only a route whose Worker has the exact name in `workers/worker-topology.ts`, and
stops with no change when the account id is missing. Check in the Cloudflare dashboard (the
Workers Routes of the zone) that no route names the second Worker. The second Worker stays deployed with no route:
delete it with `pnpm exec wrangler delete <its name>` when you no longer need it.

The relay of the dashboard Worker drains only the outbox rows of the service `dashboard` (`serviceName` in
`inferative.config.ts`, the same in both topologies). After the dashboard Worker deploys as one Worker again, give it
the rows that the second Worker left, once: `update outbox set service = 'dashboard' where service = 'visual-editing';`.

In this version, the second Worker cannot start an editing session: it composes no package that owns an entity. Use two
Workers to try the topology, not for production yet. `workers/unfilled-seats.json` lists each registry seat that a
Worker reads and does not fill, with the reason.

With `INFERATIVE_WORKERS=visual-editing`, `pnpm heximon:check` reads `server/`: run `pnpm heximon:check --src
server-split` for the dashboard, and `pnpm exec heximon check --cwd workers/visual-editing` for the second Worker.

### The applets in a Worker of their own

`INFERATIVE_WORKERS=applets` moves the applet supervisor to the Worker of `workers/applets/`. It goes with
`visual-editing` or alone (`INFERATIVE_WORKERS=visual-editing,applets`).

| | In the dashboard Worker (default) | In a Worker of their own (`applets`) |
| :-- | :-- | :-- |
| The applet supervisor | The dashboard Worker exports `HostAppletObject` and binds the Worker Loader `APPLET_LOADER`. | The Worker of `workers/applets/` exports it and binds `APPLET_LOADER`. The dashboard Worker binds `APPLET_SUPERVISOR` to the class of that Worker by its name. |
| The size | The dashboard Worker is about 46 MiB. | The dashboard Worker is about 25 MiB, and the Worker of the applets about 22 MiB. |
| The routes of the applets | Served by the dashboard Worker. | Still served by the dashboard Worker, which sends each command to the supervisor of the applet over the binding. |

The Worker of the applets has no route, no database and no secret: the dashboard reaches it through its Durable Object
binding only. `workers/worker-topology.ts` holds its name, the binding names and the module of the class.

To deploy it, set the name of its Worker in `workers/worker-topology.ts` and add `applets` to the repository variable
`INFERATIVE_WORKERS`. The Release workflow then builds and deploys the Worker of the applets before the dashboard
Worker, which binds it. By hand, in this order: `pnpm build`, `pnpm build:applets` (and `pnpm build:visual-editing`
and `pnpm deploy:visual-editing` with `visual-editing`), `pnpm transfer:durable-objects`, `pnpm deploy:applets` and
`pnpm deploy:live`, each with the variables, `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.

#### Switch a deployed dashboard

The Worker that exports the supervisor holds the versions of each applet and the data of its backend, in the
namespace of its Durable Objects. When a release adds `applets` to `INFERATIVE_WORKERS` or removes it, the step
`pnpm transfer:durable-objects` (`workers/transfer-durable-objects.ts`) of the Release workflow moves that namespace
to the Worker that the setting names. It runs after the builds and after the deploy of the Worker of the visual editor,
which the dashboard Worker binds. It asks Cloudflare which Worker owns the namespace of `HostAppletObject`. When it is
the other Worker, it runs the transfer of the Cloudflare `exports` map with the builds of the release, in this order:

1. The target Worker declares the class `expecting-transfer` from the source. Its own binding of the supervisor still
   reaches the source, so the applets keep running.
2. The source Worker declares the `transferred` tombstone. This deploy moves the namespace, with every applet, to the
   target. Its binding of the supervisor now reaches the target. The source is the build of the release, so a dashboard
   that is too large in one Worker is never uploaded; its code no longer holds the class, and the tombstone declares
   the namespace. After a move back to one Worker, the step builds the Worker of the applets for this deploy.
3. The regular deploys of the release follow: the Worker of the applets (when the setting names it), then the dashboard
   Worker, each with a live entry and its own binding.

With no namespace yet (a first deploy) or no switch, the step moves nothing. Between step 2 and step 3 the applets can
answer an error for a short time. After a move back to one Worker, the Worker of the applets stays deployed with the
tombstone and no class: delete it with `pnpm exec wrangler delete my-inferative-applets` when Cloudflare reports its
tombstone as safe to remove.

`pnpm tools starters build` in the Inferative repository checks the configs of both deploys, for both directions, with
`wrangler deploy --dry-run`: Wrangler checks the fields of each `exports` state. Only a real deploy shows that
Cloudflare accepts the transfer and moves the data. Before you switch a dashboard with applets that people use, try the
switch once on a test deployment in the same account.

With `applets`, run `pnpm exec heximon check --cwd workers/applets` for the Worker of the applets.

## Add or remove a capability

Add the module of the package to `server/app.module.ts`. Add its persistence module to
`server/persistence/pg/persistence.module.ts` and its tables to `schema.ts`. Add its layer to `extends` in
`nuxt.config.ts`, and its entry to the navigation in `app/app.config.ts`. Run `pnpm heximon:check`, then
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
| `pnpm build` | Builds the Worker into `.output/`. In one Worker it bakes the applet kit first. |
| `pnpm build:visual-editing` | Builds the Worker of the visual editor into `workers/visual-editing/.output/` (with `visual-editing` only). |
| `pnpm build:applets` | Bakes the applet kit and builds the Worker of the applets into `workers/applets/.output/` (with `applets` only). |
| `pnpm deploy:live` | Deploys the last build. |
| `pnpm deploy:visual-editing` | Deploys the last build of the Worker of the visual editor. |
| `pnpm deploy:applets` | Deploys the last build of the Worker of the applets. |
| `pnpm typecheck` | Type-checks the Vue files and the server. |
| `pnpm heximon:check` | Compiles the modules and reports the wiring errors. |
| `pnpm db:generate` | Writes a migration from `schema.ts`. |
| `pnpm db:migrate` | Applies the migrations to `DATABASE_URL`. |
| `pnpm backup` | Backs up the database and the files, restores them, checks them and uploads an archive (`create`, `restore`, `verify`, `upload`, `keygen`). |
| `pnpm test` | Runs the tests in `test/`. `test/dashboard.test.ts` is an empty file to start from. |
