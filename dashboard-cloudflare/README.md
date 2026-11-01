# Inferative dashboard: dashboard-cloudflare

The Inferative dashboard as one Nuxt app on two Cloudflare Workers: the dashboard Worker and the applets Worker (see
"The two Workers"). The dashboard is at the root of the dashboard Worker, `/`.
It holds every capability of Inferative: projects and agents, the inbox and decisions, the assistant, memory,
the linked Telegram chat of a member, the connections to GitHub and to outside accounts, content, pages, files,
publishing, SEO, the visual editor, translations and categories, channels and realtime.

The database is Postgres, reached through Cloudflare Hyperdrive. A published release deploys both Workers.

The first run starts empty. You create the owner account and the organization at `/` with the setup token, and
everything else in the dashboard.

An agent can do the setup for you: the skill `dashboard-setup` (`npx skills add https://inferative.dev --skill
dashboard-setup`) runs each step below and stops at each browser step.

## The files

| File | What it holds |
| :-- | :-- |
| `server/app.module.ts` | The modules of the dashboard. Each line adds one capability. Delete a line to remove it. |
| `server/app.module.ts` (Cloudflare) | The Durable Objects of the Worker: the key-value `Storage` (`CloudflareStorageInfrastructure`), the rate limits, the timers (decisions, runner leases, agent wakes and chat deliveries), the assistant conversations and the realtime streams. `inferative.config.ts` names the `durable-object` driver for a production build, and the Worker refuses to boot on any other store. The response cache that every package of the Worker shares (`IsolateResponseCacheModule`) is in the memory of each isolate, at most 16 MB (`responseCache.maxBytes`); an edit empties it in every isolate within a second, through a hint in the `Storage`. |
| `server/app.module.ts` (files) | `CloudflareFilesStoreInfrastructure` stores the files and the large assistant rows in the R2 bucket. `FilesR2DevelopmentStore` reaches the same bucket under `nuxt dev`. |
| `server/demo/` | The demo data of a test install (`pnpm demo:seed`, see "The first run"). Delete the folder and its line in `server/app.module.ts` to leave it out. |
| `server/persistence/pg/` | The Postgres setup: the connection, the config, the persistence module and `schema.ts`. |
| `workers/applets/` | The applets Worker: the applet supervisor and its build. See "Applets" and "The two Workers". |
| `drizzle.config.ts` | The config of `drizzle-kit`. |
| `inferative.config.ts` | The values that this dashboard changes from the package defaults. `dashboard.render: "client"` makes the browser draw every screen, so the Worker holds no Vue server app. `assistant.playbooks` adds the notes of your own pages to the assistant. |
| `nuxt.config.ts` | The Nuxt layers. `nitro.minify` keeps the Worker below the Cloudflare limits of 64 MiB of code and 1 s of startup, and the ASCII output of `nitro.rolldownConfig` keeps the heap of an isolate below its limit of 128 MB. |
| `heximon.config.ts` | The compiler plugins, the one cron trigger of the schedule (every minute), and the name and the bindings of the dashboard Worker (`cloudflare`): the Hyperdrive id, the R2 bucket, the applet supervisor in the applets Worker, and the reader of the text of attached files there (`ATTACHMENT_TEXT`). |
| `heximon.upgrade.json` | The record of the durable surface: the events, the timers and the workflow steps that stored work names. It is generated: run `pnpm heximon:check --update` and commit the result. |
| `app/` | The navigation of the dashboard. |
| `.github/workflows/release.yml` | A published release, or a manual run, migrates the database and deploys the two Workers. |
| `.github/workflows/backup.yml` | Each night, or on a manual run, writes an encrypted archive of the database and the files and uploads it. |

## Start

1. Copy `.env.example` to `.env`. Fill the empty secrets (see "Secrets"). The values under "Local run only" are for
   this machine: the `INFERATIVE_FILES_R2_*` values are optional (see "Cloudflare").
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

The dashboard Worker refuses to boot without one secret. The applets Worker needs none. Make it once, with Node:

| Variable | Make it with |
| :-- | :-- |
| `INFERATIVE_ROOT_SECRET` | `node -p 'require("node:crypto").randomBytes(32).toString("base64")'` |

`INFERATIVE_ROOT_SECRET` is the root secret. Every other secret of the dashboard derives from it: the setup token, the
signing keys of links, the realtime ticket secret, the webhook secret of the member chat, and the keys at rest (the key
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

Keep a copy of the root outside the repository, in a password manager. A lost root makes the data that it sealed
unreadable: two-factor secrets, model history, the secrets of the secret store and the kept signing key. Sign-in then
stops until you delete the kept key (the `identity/signing-key` row of `secret_envelopes`): the next sign-in generates a
new key, and every session starts again.

A local run and the Worker use one database. Use the same root in `.env` and on the Worker: it seals data in that
database.

The mail sender (its address and name) and the switches of the background work (IndexNow and the daily price sync) are
on Settings › Organization › Platform: a platform administrator saves them there, so set no variable for them. The
Worker needs no assistant driver: a production build always calls models through the model connections. The OAuth issuer, the MCP address, the passkey
settings and the links in mail come from the deployment's default domain, which the first run stores, so set none of them.
For the linked Telegram chat, see "Telegram". For the GitHub App, see "GitHub". AI turns on for an
organization when it has a model connection: one that it adds under Organization > Models, or one that the platform
organization (the first organization) adds there and offers on Inferative's credits. The platform organization's
connections also give the field writer, the translator and the second-opinion reviewer their model. To limit the
vendors that may get the text, a platform administrator saves the list on Settings › Organization › Platform. With no
saved list, the vendor of any connection that an organization adds may get it. For the websites of your channels, set
`INFERATIVE_CHANNELS_ADMINISTRATION_ORIGINS`. The Worker needs no `DATABASE_URL`: it uses Hyperdrive. The values under
"Local run only" in `.env.example` never go to the Worker.

The name that people see is `app.name` in `inferative.config.ts`, until a platform administrator saves another one on
Settings › Organization › Platform. It is also the sender name of every mail (until a sender name is saved on the same
tab), the title of the MCP server and the issuer that an authenticator app shows. The organization rules (one
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

### Older variables

An install made before the root secret and the settings screens may still set these variables. A production boot logs
one warning for each one that is still set: the line names the variable and where its value lives now, and never its
value. A Worker keeps a secret until you delete it (`pnpm exec wrangler secret delete <name> --name
my-inferative-dashboard`). Delete its line from `.env.worker` too, so that a later `wrangler secret bulk` does not set it
again.

| Variable | What the dashboard does with it | Retire it |
| :-- | :-- | :-- |
| `INFERATIVE_IDENTITY_SETUP_TOKEN` | It wins over the token of the root. | Delete it: the first-run step closes after its first run. |
| `INFERATIVE_REALTIME_TICKET_SECRET` | It wins over the secret of the root. | Delete it. A ticket lives two minutes, so an open stream signs in again once. |
| `INFERATIVE_BASE_SIGNED_ACCESS_SIGNING_KEYS` | It wins over the keys of the root. | Delete it from `.env` and the Worker at once. The links (preview, download, visualization) and the MCP session ids of outside agents that its keys signed stop working; an outside agent then connects again. |
| `INFERATIVE_NOTIFICATIONS_CHAT_TELEGRAM_WEBHOOK_SECRET` | It wins over the secret of the root. | Delete it, then save the bot again on Settings › Organization › Credentials: the save registers the webhook with the secret of the root. |
| `INFERATIVE_IDENTITY_SIGNING_KEY` | It wins over the kept key. | Delete it. The kept key then signs, and the key that it replaces still verifies for the access-token lifetime (one hour by default), so nobody is signed out. |
| `INFERATIVE_IDENTITY_MFA_ENCRYPTION_KEY` | With the root set, it only decrypts. A two-factor secret is sealed again under the root's key at its next sign-in. | Run `pnpm mfa:reseal`. Delete the key only when the task reports `remaining: 0` and the outbox holds no account mail (an invitation, a password reset) queued before that reseal: the link of such a mail is sealed under a key of the MFA key, and a link that no key opens drops its mail. |
| `INFERATIVE_ASSISTANT_HISTORY_ENCRYPTION_KEY` | With the root set, it only decrypts the model history that it sealed. | Keep it for as long as the install keeps that history, and until every agent session open before the change has ended: a runner session token derives from this key. The assistant's task `ResealModelHistory` seals the history again, but it runs only on a host that `heximon task run` compiles for Node, and this starter compiles for Cloudflare Workers only. |
| `INFERATIVE_SECRETS_KEYS` | With the root set, each listed key only decrypts what it sealed. The key marked `derive` stays the root of the webhook secrets of agent bots. | Run `pnpm secrets:rewrap`: it seals every value again under the root's key and keeps the `derive` root. Delete the list when the task reports no value under a listed key. |
| `INFERATIVE_MODELS_DEPLOYMENT_CONNECTIONS` | It applies only while the platform organization stores no model connection. | Add the connections on Settings › AI › Models of the platform organization, then delete it. |
| `INFERATIVE_NOTIFICATIONS_CHAT_TELEGRAM_BOT_TOKEN`, `INFERATIVE_NOTIFICATIONS_CHAT_TELEGRAM_BOT_USERNAME` | They apply only while no bot is saved. | Save the bot on Settings › Organization › Credentials, then delete them. |
| `INFERATIVE_IDENTITY_ORGANIZATION_SINGLE_ORGANIZATION` and the other organization rules, `INFERATIVE_IDENTITY_ORGANIZATION_DEFAULT_TIME_ZONE`, `INFERATIVE_LOCALIZATION_TIME_ZONE`, `INFERATIVE_APP_NAME` | They apply only until a platform administrator saves the setting. | Save the setting on Settings › Organization › Platform, then delete them. |
| `INFERATIVE_NOTIFICATIONS_SENDER_EMAIL`, `INFERATIVE_NOTIFICATIONS_SENDER_NAME` | They apply only until a platform administrator saves the mail sender. | Save the address and the name under "Mail sender" on Settings › Organization › Platform, then delete them. |
| `INFERATIVE_SEO_INDEX_NOW_ENABLED`, `INFERATIVE_AGENTS_PRICE_SYNC_ENABLED` | They apply only until a platform administrator saves the switch. | Save each switch under "Background work" on Settings › Organization › Platform, then delete them. |
| `INFERATIVE_APP_ORIGIN`, `INFERATIVE_MODELS_PUBLIC_ONLY_EGRESS`, `INFERATIVE_BASE_PROCESSING_*` | Nothing reads them. | Delete them. |
| `INFERATIVE_ASSISTANT_BACKEND_DRIVER` on the Worker | Nothing reads it: a production build calls models through the model connections. | Delete it from the Worker. Keep it in `.env` when a local run must call a model. |

## Cloudflare

Replace the placeholders in `heximon.config.ts`: the name of the dashboard Worker, the resource prefix
(`resourcePrefix`, the name of the Worker and a dash), the id of the Hyperdrive configuration, the name of the R2
bucket, and the name of the applets Worker (`scriptName`). The name of the applets
Worker is also in `workers/applets/heximon.config.ts`: keep the two the same. Then create the resources once:

```sh
pnpm exec wrangler hyperdrive create my-inferative-dashboard --connection-string="<the direct postgres:// address>" --caching-disabled --origin-connection-limit 10 --sslmode require
pnpm exec wrangler r2 bucket create my-inferative-dashboard-files
pnpm exec wrangler queues create my-inferative-dashboard-saga-timer-queue
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
agent wake, a chat delivery) through the queue `my-inferative-dashboard-saga-timer-queue` and reads it back.

Run the dashboard Worker in the region of the database. Without a placement, the Worker runs in the data centre of
each visitor, and every statement crosses to the database's region: on a database in another country that is about
50 ms for each round of reads. Put the region of the database into the `nitro.cloudflare.wrangler` block of `nuxt.config.ts`:

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

Put the same region into `base.durable.locationHint` in the `$production` block of `inferative.config.ts`, as a
Cloudflare location hint: `weur` for western Europe, `enam` for eastern North America, and so on. Cloudflare then
creates the `Storage` room in that region. Without a hint, each room starts near the first
caller that reaches it, and it never moves after that.

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

## Deploy

| Event | What runs |
| :-- | :-- |
| A published release, or a manual run | `pnpm db:migrate`, `pnpm build`, `pnpm build:applets`, `pnpm deploy:applets`, then `pnpm deploy:live`. |

The workflow reads these secrets of the organization: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and
`READ_PACKAGES_TOKEN`. It reads `DATABASE_URL` from the secrets of the repository. A deploy by hand runs the same
five commands, in the same order.

After an upgrade to a new release, run `pnpm tiers:seed` once, after the Release run. It loads the plans of the release
into the database of the `DATABASE_URL` of `.env`, and prints what it changed. A second run changes nothing. It runs the
app on this machine in development mode, so it needs no Worker binding.

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

Optional, for a test install: `pnpm demo:seed` loads demo data into the organization of the first run, so each screen
has data to show: a department that the owner heads (only in an organization with no department), the project `DEMO`
with three tasks, an agent, and a website channel with a content type and three entries. It acts as the owner, so it
writes nothing before the first run. It writes only the parts that the organization lacks, and it never changes or
deletes a row that exists, so a run that stopped half way finishes on the next run, and a second run writes nothing.
It runs the app on this machine against the database of `.env`.

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
   import { SecretStore } from "@inferative/base/secrets";
   import { KeyedEmailTransport, MailProviderKey } from "@inferative/notifications/server";

   /** Sends the mails of the dashboard through Resend, with the key that an operator saves on a screen. */
   export class MailModule extends Module({
     requires: [SecretStore],
     providers: [
       {
         provide: EmailTransport,
         useFactory: (store: SecretStore): EmailTransport =>
           new KeyedEmailTransport(
             new MailProviderKey(store),
             (apiKey) => new ResendTransport({ apiKey })
           )
       }
     ],
     exports: [EmailTransport]
   }) {}
   ```

3. Add `MailModule` to `imports` in `server/app.module.ts`.
4. Sign in as an owner or an administrator of the platform organization (the first organization). Open Settings ›
   Organization › Credentials and save the Resend API key under "Mail provider key". The key goes into the secret
   store, and the server reads it each time it sends a mail. No Worker secret is needed for it.
5. On Settings › Organization › Platform, under "Mail sender", save an address on a domain that Resend verified.

## Telegram

`ChatModule` links the Telegram chat of a member. The member gets the inbox items that need them in the chat, with
answer buttons, and can write to their own assistant there. A member links the chat in Your account › Profile. The
chat is off until a bot is saved on Settings › Organization › Credentials, "Member chat bot". Only an owner or an
administrator of the platform organization (the first organization) sees the tab. The token goes into the secret store
and is not shown again. The webhook secret derives from `INFERATIVE_ROOT_SECRET`.

Create the bot with [BotFather](https://t.me/BotFather) (`/newbot`). Use a bot of its own for each dashboard: Telegram
sends the updates of a bot to one address. When you save the token, the dashboard asks Telegram for the user name of
the bot (`getMe`) and registers the webhook at `https://<your dashboard>/api/chat/telegram/webhook` with the webhook
secret. If Telegram refuses one of the two calls, the screen says why and keeps nothing.

After a rotation of the root, save the bot again: the save registers the webhook with the new secret. Until then the
dashboard still accepts the secret of `INFERATIVE_ROOT_SECRET_PREVIOUS`.

`max_connections=1` makes Telegram send the updates one at a time, in order. A local run on `localhost` gets no
update: Telegram reaches only a public `https://` address.

`ChatDeliveryTimersModule` sends an item that waits for its place in the pace of a chat (one message a second) at
that place. Delete its line, and the minute sweep sends such an item, up to a minute late.

## GitHub

`ConnectorsModule` holds the connections of an organization: the outside accounts (mail, files) on Your account ›
Connections and on Settings › Organization › Connections, and the installations of the GitHub App of the deployment.
`ConnectorTriggersModule` runs the triggers of the outside connections on the minute tick. The App is what reports a
failed CI check: when CI fails on a commit that an agent pushed, GitHub sends a webhook delivery to the dashboard, and
the agent works on its task again with the output of the failed checks. The App also gives the write token of a
runner's checked push and opens draft pull requests.

The App is a setting of the deployment: one App for the dashboard. Create it on GitHub (Settings › Developer settings ›
GitHub Apps › New GitHub App, on your account or on your GitHub organization):

| Field | Value |
| :-- | :-- |
| Webhook URL | `https://<your dashboard>/api/connectors/github/webhook` |
| Webhook secret | `node -p 'require("node:crypto").randomBytes(32).toString("base64url")'` |
| Repository permissions | Actions: Read-only. Checks: Read-only. Contents: Read and write. Issues: Read and write. Metadata: Read-only. Pull requests: Read and write. Workflows: Read and write. |
| Subscribe to events | Check suite, Workflow run, Pull request, Pull request review |

Then generate a private key on the page of the App (Private keys), and set three secrets of the dashboard Worker. Put
the same values in `.env` for a local run:

| Variable | Value |
| :-- | :-- |
| `INFERATIVE_CONNECTORS_GITHUB_APP_ID` | The App ID on the page of the App. |
| `INFERATIVE_CONNECTORS_GITHUB_APP_PRIVATE_KEY` | The text of the `.pem` file that GitHub gives. In `.env`, put it in double quotes on one line, with `\n` for each line break. |
| `INFERATIVE_CONNECTORS_GITHUB_WEBHOOK_SECRET` | The webhook secret of the App. |

Without the App ID and the key, no installation gives a token. Without the webhook secret, the webhook route refuses
every delivery. A GitHub Enterprise server sets `INFERATIVE_CONNECTORS_GITHUB_API_BASE_URL` (the default is
`https://api.github.com`). A local run on `localhost` gets no delivery: GitHub reaches only a public `https://` address.

Install the App on the GitHub account that owns each repository. The webhook delivery of an installation reaches an
organization of the dashboard only when the organization holds the connection of that installation. The repository
dialog of a project shows GitHub with its logo for a repository on GitHub, and offers "Wake the agent when CI fails"
only when GitHub reports the checks of that repository: the App is set, and the organization holds the active
installation of the owner of the repository. For any other repository, the dialog says why the wake is off.

The catalog of outside accounts (mail, files) is data of the release. After each Release run, run
`pnpm connectors:catalog` once. It writes the entries of the release into the database of `.env`, and a second run
writes nothing. Without it, Add connection offers no provider.

## The two Workers

| Worker | Folder | What it runs |
| :-- | :-- | :-- |
| The dashboard Worker | the project root (`server/`, Nuxt) | Every module of `server/app.module.ts`: the pages, the API, the database and the files. It serves every route of the hostname, the routes of the applets included. |
| The applets Worker | `workers/applets/` (Heximon, no Nuxt) | The applet supervisor and the Worker Loader of the applets. The supervisor builds each applet and assembles its page. The Worker also reads the text of the PDF and Office files that a person attaches to a message (`src/attachment-text.entrypoint.ts`), each in a Dynamic Worker with no network, no binding and 5 s of CPU time. It has no route, no database and no secret: the dashboard Worker reaches it through the `APPLET_SUPERVISOR` and `ATTACHMENT_TEXT` bindings only. `src/app.module.ts` composes no module yet: add a module there when this Worker needs one. |

The applets have a Worker of their own because of the size limit. Cloudflare takes at most 64 MiB of code for one
Worker. The applet supervisor carries a compiler, a bundler and the kit of the applets: the applets Worker is about 24 MiB.
The reader of attached files carries its PDF and Office parsers there too (about 1.6 MiB), and a parse needs more memory
than the isolate of the dashboard Worker has free.
The dashboard Worker is about 14 MiB without it (3.5 MiB with gzip, 95 modules), and it grows with each release. It is
this small because the browser draws every screen, the sign-in pages too (`dashboard.render: "client"` in
`inferative.config.ts`): the Worker holds no Vue server app. With the server render it is about 23 MiB and 917 modules.
An isolate keeps the source of every module in its heap, so each MiB of code is also a MiB of the 128 MB memory limit
of the isolate.

The page shell is a static file: the build writes `.output/public/_shell.html`, and `.output/public/_redirects` sends
each page address to it, so a page document does not start the Worker. The shell starts one boot request
(`GET /api/_boot`) before the code of the app loads; the Worker answers it with the session, the capabilities, the
locale and the build. `.output/public/_headers` gives the shell the security headers of the Worker. The Worker's own
paths (`/api` and `/.well-known`, from the route census of the build) reach the Worker first
(`assets.run_worker_first` in `.output/server/wrangler.json`). Every other address that is no page address and no file
of the build reaches the Worker after the assets: a missing file (an old `/_nuxt/` chunk, a scanner's `/wp-login.php`)
answers 404 with `no-store`, and an address that no page holds gets the Worker's page shell, whose not-found page
draws it.

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

Add the module of the package and its Postgres persistence module to `server/app.module.ts`, and its tables to
`schema.ts`. Add its layer to `extends` in
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

A restore needs the root that sealed the data of the archive, or the older keys that sealed it: the archive holds no
key. Put `INFERATIVE_ROOT_SECRET` (and `INFERATIVE_ROOT_SECRET_PREVIOUS` or `INFERATIVE_SECRETS_KEYS`, when the install
still uses them) in the env file of `restore` and `verify`. The check then opens one value of each key of the secret
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
| `pnpm deploy:live` | Deploys the last build of the dashboard Worker. |
| `pnpm typecheck` | Type-checks the Vue files and the server. |
| `pnpm heximon:check` | Compiles the modules and reports the wiring errors. |
| `pnpm db:generate` | Writes a migration from `schema.ts`. |
| `pnpm db:migrate` | Applies the migrations to `DATABASE_URL`. |
| `pnpm demo:seed` | Loads the demo data of a test install into the organization of the first run (see "The first run"). |
| `pnpm tiers:seed` | Loads the plans of the release into the database of `.env`. Run it once after an upgrade (see "Deploy"). |
| `pnpm connectors:catalog` | Writes the catalog of outside accounts of the release into the database of `.env`. Run it once after a Release run (see "GitHub"). |
| `pnpm mfa:reseal` | Seals every two-factor secret in the database of `.env` again under the MFA key of the root, and prints how many secrets remain (see "Secrets"). |
| `pnpm secrets:rewrap` | Seals every value of the secret store in the database of `.env` again under the key of the root, and prints how many values are still under another key (see "Secrets"). |
| `pnpm backup` | Backs up the database and the files, restores them, checks them and uploads an archive (`create`, `restore`, `verify`, `upload`, `keygen`). |
| `pnpm test` | Runs the tests in `test/`. `test/dashboard.test.ts` is an empty file to start from. |
