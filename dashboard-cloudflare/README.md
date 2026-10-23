# Inferative dashboard: dashboard-cloudflare

The Inferative dashboard as one Nuxt app on two Cloudflare Workers: the dashboard Worker and the applets Worker (see
"The two Workers"). The dashboard is at the root of the dashboard Worker, `/`.
It holds every capability of Inferative: projects and agents, the inbox and decisions, the assistant,
content, pages, files, publishing, SEO, the visual editor, translations and categories, channels and realtime.

The database is Postgres, reached through Cloudflare Hyperdrive. A published release deploys both Workers.

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
| `workers/applets/` | The applets Worker: the applet supervisor and its build. See "Applets" and "The two Workers". |
| `drizzle.config.ts` | The config of `drizzle-kit`. |
| `inferative.config.ts` | The values that this dashboard changes from the package defaults. `assistant.playbooks` adds the notes of your own pages to the assistant. |
| `nuxt.config.ts` | The Nuxt layers. `nitro.minify` keeps the Worker below the Cloudflare limits of 64 MiB of code and 1 s of startup. |
| `heximon.config.ts` | The compiler plugins, the one cron trigger of the schedule (every minute), and the name and the bindings of the dashboard Worker (`cloudflare`): the Hyperdrive id, the R2 bucket, and the applet supervisor in the applets Worker. |
| `heximon.upgrade.json` | The record of the durable surface: the events, the timers and the workflow steps that stored work names. It is generated: run `pnpm heximon:check --update` and commit the result. |
| `app/` | The navigation of the dashboard. |
| `.github/workflows/release.yml` | A published release, or a manual run, migrates the database and deploys the two Workers. |
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

The dashboard Worker refuses to boot without these values. The applets Worker needs none. Make each one once, with
Node:

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

The dashboard Worker also needs `INFERATIVE_APP_ORIGIN` (the `https://` address of the dashboard, with no path) and
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

Replace the placeholders in `heximon.config.ts`: the name of the dashboard Worker, the id of the Hyperdrive
configuration, the name of the R2 bucket, and the name of the applets Worker (`scriptName`). The name of the applets
Worker is also in `workers/applets/heximon.config.ts`: keep the two the same. Then create the resources once:

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
Durable Objects, the Worker Loader of the applets and the Cloudflare Workflows `assistant-api-run` and
`assistant-room-consultation`. The Worker sends each
fired decision timer through the queue `saga-timer-queue` and reads it back.

The names `saga-timer-queue`, `assistant-api-run` and `assistant-room-consultation` are fixed by the packages, and
Cloudflare keeps one queue and one workflow of a name for each account. So one Cloudflare account holds one dashboard.

For local development, create an R2 access key in the Cloudflare dashboard: **R2 object storage**, then **Manage**
beside **API Tokens**, then **Create Account API token**. Enter a name, choose **Object Read & Write**, and apply it to
the bucket of the dashboard only. The dashboard shows the key id and the secret once. The account id is on the R2
overview page. Put the four values in `.env` (`INFERATIVE_FILES_R2_ACCOUNT_ID`, `INFERATIVE_FILES_R2_BUCKET`,
`INFERATIVE_FILES_R2_ACCESS_KEY_ID`, `INFERATIVE_FILES_R2_SECRET_ACCESS_KEY`). Without them, a local run keeps files in
memory and prints one warning. The built Worker uses the binding and carries no AWS code.

## Deploy

| Event | What runs |
| :-- | :-- |
| A published release, or a manual run | `pnpm db:migrate`, `pnpm build`, `pnpm build:applets`, `pnpm deploy:applets`, then `pnpm deploy:live`. |

The workflow reads these secrets of the organization: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and
`READ_PACKAGES_TOKEN`. It reads `DATABASE_URL` from the secrets of the repository. A deploy by hand runs the same
five commands, in the same order.

This starter has no preview Worker. The Durable Objects of the dashboard hold state that refers to the database: the
decision timers, the assistant conversations, the runner connections and the applet versions. A preview Worker on
the same database would split that state.

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

## The two Workers

| Worker | Folder | What it runs |
| :-- | :-- | :-- |
| The dashboard Worker | the project root (`server/`, Nuxt) | Every module of `server/app.module.ts`: the pages, the API, the database and the files. It serves every route of the hostname, the routes of the applets included. |
| The applets Worker | `workers/applets/` (Heximon, no Nuxt) | The applet supervisor and the Worker Loader of the applets. It has no route, no database and no secret: the dashboard Worker reaches it through the `APPLET_SUPERVISOR` binding only. `src/app.module.ts` composes no module yet: add a module there when this Worker needs one. |

The applets have a Worker of their own because of the size limit. Cloudflare takes at most 64 MiB of code for one
Worker. The applet supervisor carries a compiler, a bundler and the kit of the applets: the applets Worker is about 23 MiB.
The dashboard Worker is about 28 MiB without it, and it grows with each release.

`pnpm build` builds the dashboard Worker into `.output/`, and `pnpm build:applets` builds the applets Worker into
`workers/applets/dist/`. Deploy the applets Worker first: the dashboard Worker binds its class by name, and the deploy
of the dashboard Worker fails while the applets Worker does not exist. The Release workflow keeps this order. By hand:

```sh
pnpm build
pnpm build:applets
pnpm deploy:applets
pnpm deploy:live
```

Read the size of each Worker after a build with `pnpm exec wrangler deploy --dry-run --config <config>`, where the
config is `.output/server/wrangler.json` or `workers/applets/dist/wrangler.json`. `pnpm heximon:check` compiles the
dashboard Worker; `pnpm exec heximon check --cwd workers/applets` compiles the applets Worker.

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
| `pnpm build` | Builds the dashboard Worker into `.output/`. |
| `pnpm build:applets` | Bakes the applet kit and builds the applets Worker into `workers/applets/dist/`. |
| `pnpm deploy:applets` | Deploys the last build of the applets Worker. Deploy it before the dashboard Worker. |
| `pnpm deploy:live` | Deploys the last build of the dashboard Worker. |
| `pnpm typecheck` | Type-checks the Vue files and the server. |
| `pnpm heximon:check` | Compiles the modules and reports the wiring errors. |
| `pnpm db:generate` | Writes a migration from `schema.ts`. |
| `pnpm db:migrate` | Applies the migrations to `DATABASE_URL`. |
| `pnpm backup` | Backs up the database and the files, restores them, checks them and uploads an archive (`create`, `restore`, `verify`, `upload`, `keygen`). |
| `pnpm test` | Runs the tests in `test/`. `test/dashboard.test.ts` is an empty file to start from. |
