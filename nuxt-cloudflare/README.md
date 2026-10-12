# Inferative site: nuxt-cloudflare

One Nuxt app and one Cloudflare Worker. The public site is at `/`. The dashboard is at `/admin`. Both use one origin.

The database is Postgres or MySQL, reached through Cloudflare Hyperdrive.
A push to `main` deploys a preview Worker. A published release deploys the live Worker.

## The files

| File | What it holds |
| :-- | :-- |
| `server/app.module.ts` | The modules of the site. Each line adds one capability. Delete a line to remove it. |
| `server/app.module.ts` (cache) | `ChannelHttpCachePolicy` is the one HTTP policy: the response cache. One Durable Object holds the cache (`CloudflareResponseCacheInfrastructure`), so an edit in one isolate clears it for all. The preview Worker uses the cache of the live Worker. |
| `server/app.module.ts` (storage) | `CloudflareStorageInfrastructure` binds the key-value `Storage` to one Durable Object. The claims of command idempotency live there, so a retried write runs once in every isolate. `inferative.config.ts` names the `durable-object` driver for a production build, and the Worker refuses to boot on any other store. |
| `server/app.module.ts` (files) | `CloudflareFilesStoreInfrastructure` stores files in the R2 bucket. `FilesR2DevelopmentStore` reaches the same bucket under `nuxt dev`. |
| `server/persistence/pg/` | The Postgres setup: the connection, the config, the persistence module and `schema.ts`. |
| `server/persistence/mysql/` | The MySQL setup. It is the same set of files as the Postgres setup. |
| `drizzle.config.ts` | The config of `drizzle-kit`. It names the database setup in use. |
| `inferative.config.ts` | The values that this site changes from the package defaults. |
| `nuxt.config.ts` | The Nuxt layers, and the Cloudflare values: the Worker names, the bindings, `env.preview`. |
| `shared/site.ts` | The content types of the site (the page type and the menu type) and its sections. |
| `app/` | The site: its layout, its catch-all page and the dashboard navigation. |
| `.github/workflows/` | `preview.yml` (push to `main`) and `release.yml` (published release). |

## Start

Keep Postgres? Then delete `server/persistence/mysql/` and `mysql2` from `package.json` first. This removes the warning of `pnpm heximon:check` about the unused setup.

1. Copy `.env.example` to `.env`. Fill the empty values. The `INFERATIVE_FILES_R2_*` values are optional (see "Cloudflare"), and the default organization id comes after the first run.
2. Run `pnpm install`. Commit `pnpm-lock.yaml`: the workflows install with `--frozen-lockfile`.
3. Run `pnpm db:generate` once. It writes the first migration into `server/persistence/pg/migrations/`. Commit it.
4. Run `pnpm dev`. The site is at `http://localhost:3000`.

`inferative init` wrote the registry lines of `@inferative` and `@heximon` into `.npmrc`. It holds no token. Commit it.

The migrations run when the app starts. A local run uses the direct `DATABASE_URL`, so it reads and writes the
hosted database. `HEXIMON_SCHEDULE=off` keeps the scheduled jobs off: only the live Worker runs them.

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

Replace every placeholder in `nuxt.config.ts`:

- The Worker name, and the `-preview` name in `env.preview`.
- The `script_name` of `RESPONSE_CACHE_ROOM` in `env.preview`: the name of the live Worker.
- The id of the Hyperdrive configuration (`wrangler hyperdrive create`). Keep its caching off.
- The name of the R2 bucket for files (`FILES_BUCKET`), here and in `env.preview`. Create it once:
  `wrangler r2 bucket create <site>-files`. Both Workers and every local run use this one bucket.

For local development, create an R2 access key in the Cloudflare dashboard: **R2 object storage**, **Manage API
tokens**, **Create API token**. Give it **Object Read & Write** on the bucket of the site only. The dashboard shows the
key id and the secret once. The account id is on the R2 overview page. Put the four values in `.env`
(`INFERATIVE_FILES_R2_ACCOUNT_ID`, `INFERATIVE_FILES_R2_BUCKET`, `INFERATIVE_FILES_R2_ACCESS_KEY_ID`,
`INFERATIVE_FILES_R2_SECRET_ACCESS_KEY`). Without them, a local run keeps files in memory and prints one warning.
The built Worker uses the binding and carries no AWS code.

Wrangler does not copy a binding from the top level into an environment. Each binding is in `env.preview` again,
the Durable Object bindings too. When you add a module that uses a Durable Object, build once, read `durable_objects`
in `.output/server/wrangler.json`, and add the same bindings to `env.preview`.
`env.preview.triggers.crons` is empty, so only the live Worker has the cron trigger.

Both Workers use one database, so they use one response cache. In `env.preview`, `RESPONSE_CACHE_ROOM` binds the
Durable Object of the live Worker (`script_name`). An edit through either dashboard clears the one cache. The preview
Worker also fills that cache with answers from the code on `main`; this is accepted. `RATE_LIMIT_ROOM` and `STORAGE_ROOM` stay per Worker.

Set the secrets of each Worker once: `wrangler secret bulk`. The workflows do not set Worker secrets.

## Deploy

| Event | What runs |
| :-- | :-- |
| A push to `main` | `pnpm db:migrate`, `pnpm build`, then `pnpm deploy:preview`. |
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

`heximon.config.ts` pins the root, so both setups can stay in `server/`. Until you delete the unused one,
`pnpm heximon:check` warns that its `PersistenceModule` has an unmet `requires`.

## Add or remove a capability

Add the module of the package to `server/app.module.ts`. Add its persistence module to the `persistence.module.ts`
of your database and its tables to `schema.ts`. Add its layer to `extends` in `nuxt.config.ts`. Run
`pnpm heximon:check`. Delete the same lines to remove one.

## Commands

| Command | What it does |
| :-- | :-- |
| `pnpm dev` | Runs the app with hot reload. |
| `pnpm build` | Builds the Worker into `.output/`. |
| `pnpm typecheck` | Type-checks the Vue files and the server. |
| `pnpm heximon:check` | Compiles the modules and reports the wiring errors. |
| `pnpm db:generate` | Writes a migration from `schema.ts`. |
| `pnpm db:migrate` | Applies the migrations to `DATABASE_URL`. |
| `pnpm test` | Runs the tests in `test/`. `test/site.test.ts` is an empty file to start from. |
