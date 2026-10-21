# Inferative site: nuxt-cloudflare

One Nuxt app and one Cloudflare Worker. The public site is at `/`. The dashboard is at `/admin`. Both use one origin.

The database is Postgres or MySQL, reached through Cloudflare Hyperdrive.
A push to `main` deploys a preview Worker. A published release deploys the live Worker.

## The files

| File | What it holds |
| :-- | :-- |
| `server/app.module.ts` | The modules of the site. Each line adds one capability. Delete a line to remove it. |
| `server/app.module.ts` (cache) | `ChannelHttpCachePolicy` is the one HTTP policy: the response cache. One Durable Object holds the cache (`CloudflareResponseCacheInfrastructure`), so an edit in one isolate clears it for all. The preview Worker uses the cache of the live Worker. |
| `server/app.module.ts` (render) | `RenderSessionMiddleware` reads the visitor's session for a page render, and `RenderFrameFallthrough` gives the in-process reads of a render one memo and one channel scope. Keep both: without them every page renders as anonymous. |
| `server/app.module.ts` (storage) | `CloudflareStorageInfrastructure` binds the key-value `Storage` to one Durable Object. The claims of command idempotency live there, so a retried write runs once in every isolate. `inferative.config.ts` names the `durable-object` driver for a production build, and the Worker refuses to boot on any other store. |
| `server/app.module.ts` (files) | `CloudflareFilesStoreInfrastructure` stores files in the R2 bucket. `FilesR2DevelopmentStore` reaches the same bucket under `nuxt dev`. |
| `server/persistence/pg/` | The Postgres setup: the connection, the config, the persistence module and `schema.ts`. |
| `server/persistence/mysql/` | The MySQL setup. It is the same set of files as the Postgres setup. |
| `drizzle.config.ts` | The config of `drizzle-kit`. It names the database setup in use. |
| `inferative.config.ts` | The values that this site changes from the package defaults. |
| `nuxt.config.ts` | The Nuxt layers, the Workers preset and the compatibility date. |
| `heximon.config.ts` | The compiler plugins, the one cron trigger of the schedule, and the Worker name and bindings with the preview environment (`cloudflare`). The preview environment binds the response cache of the live Worker. |
| `shared/site.ts` | The content types of the site (the page type and the menu type) and its sections. |
| `app/` | The site: its layout, its catch-all page and the dashboard navigation. |
| `deploy/assert-worker.mjs` | Stops a deploy script when the last build is the other Worker. |
| `.github/workflows/` | `preview.yml` (push to `main`) and `release.yml` (published release). |

## Start

Keep Postgres? Then you can delete `server/persistence/mysql/` and `mysql2` from `package.json`. Both setups compile with no warning, so this step is optional.

1. Copy `.env.example` to `.env`. Fill the empty values. The `INFERATIVE_FILES_R2_*` values are optional (see "Cloudflare"), and the default organization id comes after the first run.
2. Run `pnpm install`. Commit `pnpm-lock.yaml`: the workflows install with `--frozen-lockfile`.
3. Run `pnpm db:generate` once. It writes the first migration into `server/persistence/pg/migrations/`. Commit it.
4. Run `pnpm dev`. The site is at `http://localhost:3000`.

`inferative init` wrote the registry lines of `@inferative` and `@heximon` into `.npmrc`. It holds no token. Commit it.

The migrations run when the app starts. A local run uses the direct `DATABASE_URL`, so it reads and writes the
hosted database. `HEXIMON_SCHEDULE=off` keeps the scheduled jobs off: only the live Worker runs them.

The database pool holds at most 20 connections: on Node one pool for all requests, on the Worker one pool for each
request. To change it, set `base.database.poolSize` in `inferative.config.ts` or `INFERATIVE_BASE_DATABASE_POOL_SIZE`
in the environment.

### The first run

1. Open `/admin`. The first-run step asks for the organization and its owner.
2. Read the id of the new organization (`GET /api/identity/session`, field `activeOrganizationId`).
3. Set `INFERATIVE_CHANNELS_DEFAULT_ORGANIZATION_ID` to that id. Restart the app.
4. Run `pnpm sync:manifest --first-sync`. It publishes the page type and the sections to the channel. It needs an
   `ak_` key. A new channel refuses `sharedSection` until it serves a first schema, so use `--first-sync` once.
   Later syncs use `pnpm sync:manifest`.
5. Give the default channel its website address in `/admin/settings/channels`.
6. Create a page, publish it, and make it the home page. It now answers at `/`.

## Cloudflare

Replace every placeholder:

- In `heximon.config.ts`, the Worker name (`cloudflare.name`). The preview Worker is `<name>-preview`.
- In `heximon.config.ts`, the `scriptName` of `RESPONSE_CACHE_ROOM` in `environments.preview`: the name of the live Worker.
- In `heximon.config.ts`, the id of the Hyperdrive configuration (`wrangler hyperdrive create`). Keep its caching off.
- In `heximon.config.ts`, the name of the R2 bucket for files (`FILES_BUCKET`). Create it once:
  `wrangler r2 bucket create <site>-files`. Both Workers and every local run use this one bucket.

For local development, create an R2 access key in the Cloudflare dashboard: **R2 object storage**, then **Manage** beside
**API Tokens**, then **Create Account API token** (an account token stays valid when a developer leaves; a user token
does not). Enter a name, choose **Object Read & Write**, and apply it to specific buckets only: the bucket of the site.
The dashboard shows the key id and the secret once. The account id is on the R2 overview page. Put the four values in `.env`
(`INFERATIVE_FILES_R2_ACCOUNT_ID`, `INFERATIVE_FILES_R2_BUCKET`, `INFERATIVE_FILES_R2_ACCESS_KEY_ID`,
`INFERATIVE_FILES_R2_SECRET_ACCESS_KEY`). Without them, a local run keeps files in memory and prints one warning.
The built Worker uses the binding and carries no AWS code.

Wrangler does not copy a binding from the top level into an environment. Heximon does: `cloudflare.environments.preview`
in `heximon.config.ts` declares the preview Worker, and each build writes every binding into it, the Durable Object
bindings of the modules too. A module that adds a Durable Object needs no edit here. The preview Worker has an empty
cron list (`crons: []`), so only the live Worker has the cron trigger.

Heximon writes one Worker for each build into `.output/server/wrangler.json`. `pnpm build` writes the live Worker.
`pnpm build:preview` sets `CLOUDFLARE_ENV=preview` and writes the preview Worker, with no `env` block.
Each deploy script deploys the last build. `deploy/assert-worker.mjs` stops it with a message when the last build is the other Worker.

Both Workers use one database, so they use one response cache. In `environments.preview` of `heximon.config.ts`,
`RESPONSE_CACHE_ROOM` binds the Durable Object of the live Worker (`scriptName`): this one binding replaces the copy. An edit through either dashboard clears the one cache. The preview
Worker also fills that cache with answers from the code on `main`; this is accepted. `RATE_LIMIT_ROOM` and `STORAGE_ROOM` stay per Worker.

Set the secrets of each Worker once: `wrangler secret bulk`. The workflows do not set Worker secrets.

## Deploy

| Event | What runs |
| :-- | :-- |
| A push to `main` | `pnpm db:migrate`, `pnpm build:preview`, then `pnpm deploy:preview`. |
| A published release, or a manual run | `pnpm db:migrate`, `pnpm build`, then `pnpm deploy:live`. |

The workflows read these secrets of the organization: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and
`READ_PACKAGES_TOKEN`. They read `DATABASE_URL` from the secrets of the repository.

Preview and live use one database. Run only changes that the older code can read.

Deploy the live Worker before the first preview deploy, because the preview Worker binds its response cache. Run
`pnpm build` and `pnpm deploy:live` once, or start the Release workflow by hand. Until the live Worker exists, the
preview workflow stops before its deploy with a message that says this.

## Send email

`NotificationsModule` sends the mails of the site: an invitation, a password reset. The starter has no mail
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

   /** Sends the mails of the site through Resend. */
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
4. Set `INFERATIVE_MAIL_RESEND_API_KEY` in `.env` and in the secrets of each Worker (`wrangler secret bulk`).
5. Set `INFERATIVE_NOTIFICATIONS_SENDER_EMAIL` to an address on a domain that Resend verified.

## Use MySQL

Postgres is the default. To use MySQL:

1. In `server/app.module.ts`, change the one import of `PersistenceModule` to `./persistence/mysql/persistence.module`.
2. In `drizzle.config.ts`, change the path to `./server/persistence/mysql/database.config`.
3. Delete `server/persistence/pg/`.
4. In `package.json`, delete `pg` and `@types/pg`. Set `DATABASE_URL` to a `mysql://` address.
5. Run `pnpm db:generate`.

`heximon.config.ts` pins the root, so both setups can stay in `server/`. The unused one compiles with no warning.

## Add or remove a capability

Add the module of the package to `server/app.module.ts`. Add its persistence module to the `persistence.module.ts`
of your database and its tables to `schema.ts`. Add its layer to `extends` in `nuxt.config.ts`. Run
`pnpm heximon:check`. Delete the same lines to remove one.

## Back up and restore

`pnpm backup` runs `inferative backup`. It writes one archive of the Postgres database and the R2 bucket of the
site, restores an archive into an empty database and an empty bucket, and compares a database and a bucket with an
archive. Write an env file with the `DATABASE_URL` of the database and the four `INFERATIVE_FILES_R2_*` values of the
bucket (an access key with read access for a backup, with write access for a restore). Do not commit it.

```sh
pnpm backup create --out ~/backups/site-2026-10-20.tar.gz --env-file ~/backups/site.env --r2
pnpm backup verify --archive ~/backups/site-2026-10-20.tar.gz --env-file ~/backups/site.env --r2
```

A restore applies the migrations of the backup from `server/persistence/pg/migrations/`, writes the rows and the
objects, and then runs the same check as `verify`. `--wrangler-state .wrangler/state --bucket <bucket_name>` reads the
local state of `wrangler dev` instead of the bucket. The archive holds personal data and sealed secrets: keep it as
you keep the database. The runbook is [Backup and restore](https://inferative.dev/docs/deploy/backup-and-restore).

## Commands

| Command | What it does |
| :-- | :-- |
| `pnpm dev` | Runs the app with hot reload. |
| `pnpm build` | Builds the live Worker into `.output/`. |
| `pnpm build:preview` | Builds the preview Worker into `.output/` (`CLOUDFLARE_ENV=preview`). |
| `pnpm typecheck` | Type-checks the Vue files and the server. |
| `pnpm heximon:check` | Compiles the modules and reports the wiring errors. |
| `pnpm db:generate` | Writes a migration from `schema.ts`. |
| `pnpm db:migrate` | Applies the migrations to `DATABASE_URL`. |
| `pnpm backup` | Backs up the database and the files, restores them and checks them (`create`, `restore`, `verify`). |
| `pnpm test` | Runs the tests in `test/`. `test/site.test.ts` is an empty file to start from. |
