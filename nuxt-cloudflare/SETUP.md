# Setup steps: nuxt-cloudflare

The steps that set up a client site made from this starter, and its daily work. The `inferative` skill runs them
(`npx skills add https://inferative.dev --global`): its file `references/setup.md` holds the rules, the start, the
state file and phases 1 to 3, and sends the agent here for phase 4 and on. `references/…` and `SCRIPTS` below are files
of that skill.

The site is one Nuxt app, one live Worker, one preview Worker and one database. The result is a live Worker, a preview
Worker, a working `/admin` with its first organization, and a nightly backup that is encrypted and kept for 30 days.
`<name>` is the `name` of the state file.

## Rules of this starter

- The local run, the preview Worker and the live Worker share one database. The root secret is the same in every file
  (`references/setup-env.md`).
- `HEXIMON_SCHEDULE=off` stays in `.env`: only the live Worker runs the scheduled jobs. A Worker file never sets it.

## State file

The keys of this starter, beside the shared keys:

```json
{
  "dialect": "pg",
  "region": "<PlanetScale region>",
  "placementRegion": "aws:eu-central-1",
  "domain": "workers.dev",
  "ids": { "caCertificate": "<id>", "hyperdrive": "<id>", "bucket": "acme-files", "cache": "<id>", "backupBucket": "acme-backups", "organization": "<id>", "channel": "<id>" },
  "origins": { "live": "https://acme.example.workers.dev", "preview": "https://acme-preview.example.workers.dev" }
}
```

## Phases

| # | Phase id | Done when | Details |
| :-- | :-- | :-- | :-- |
| 4 | `choices` | You hold every answer of the choices table | "Phase 4: choices" |
| 5 | `starter` | `pnpm heximon:check --json` exits 0 with no warning, no file holds `my-inferative-site`, and the placement of the state file is in `nuxt.config.ts` | "Phase 5: the config" |
| 6 | `database` | `node SCRIPTS/env-check.mjs --only DATABASE_URL --database --dialect <dialect>` prints `database  reachable` and ends with `env-check: ok` | "Phase 6: the database" |
| 7 | `cloudflare` | The Hyperdrive id, the bucket name and the cache namespace id are in `heximon.config.ts`, and the four `INFERATIVE_FILES_R2_*` values read `set` | "Phase 7: Cloudflare" |
| 8 | `secrets` | `node SCRIPTS/env-check.mjs --database` exits 0 and ends with `env-check: ok` | "Phase 8: secrets" |
| 9 | `first-run` | `node SCRIPTS/env-check.mjs --stage sync` exits 0 with `env-check: ok`, and `pnpm sync:manifest --first-sync` exits 0 | "Phase 9: the first run" |
| 10 | `github` | The repository exists, `gh secret list --repo <owner>/<name>` shows `DATABASE_URL` and each secret that the organization does not share, and `main` is pushed | "Phase 10: GitHub" |
| 11 | `deploy` | `pnpm exec inferative site doctor <origin>` exits 0 for the live and the preview origin, the channel has the live address as **Production** and the preview address as **Preview**, `pnpm sync:manifest` exits 0, and both Workers run with the placement of phase 5 | "Phase 11: deploy" |
| 12 | `backup` | The private key is offline, the bucket of archives has the 30-day rule, and the last run of `backup.yml` ends with `success` | `references/setup-backup.md` |

After phase 12, tell the person the two addresses and the `/admin` address. The MCP tools of a local run also need
`McpModule` in `server/app.module.ts`, which the starter does not import.

## Phase 4: choices

First collect the two lists that the questions offer. Both list the logins of the person:

1. The GitHub owners: "Choose the GitHub owner" of `references/setup-github.md`.
2. The Cloudflare accounts: "Login and account" of `references/setup-cloudflare.md`.

Then ask the person these questions in one message. Offer the default. A question with the default "none" has no
default: the person chooses. Write the answers to the state file.

| Question | Default | Notes |
| :-- | :-- | :-- |
| Display name | the name, capitalized | It goes into `inferative.config.ts`. |
| Cloudflare account | none | One of the accounts of the Wrangler login. It goes into `cloudflareAccount`. Cloudflare bills the PlanetScale database to it. |
| Database | Postgres | PlanetScale. The single-node $5 plan is Postgres. MySQL is possible: phase 5 and phase 6 then switch the starter. Write `pg` or `mysql` to `dialect`. |
| Database region | none | The person picks it in PlanetScale. Choose the one nearest to the users. The create form lists regions as the cloud provider and the region, for example `AWS eu-central-1 (Frankfurt)`. The dashboard list, or `pscale region list` (it prints the slugs), is the full and current list. Write the name that the dashboard shows. |
| Domain | the `workers.dev` address of the Worker | A custom domain needs a zone in the same Cloudflare account (`references/setup-cloudflare.md`). |
| GitHub owner | none | The person's own account or one of their organizations, from the list of the `gh` login. It goes into `githubOwner`. |
| Capabilities | all | The modules of `server/app.module.ts` that the site keeps. |

Then map the database region to the placement region: "Placement and the location hint" of `references/setup-cloudflare.md`. Write it to
`placementRegion`. When the region has no row of its own, tell the person which row you used.

## Phase 5: the config

Edit these files yourself.

**`heximon.config.ts`.** Replace every `my-inferative-site`:

| File | Place | New value |
| :-- | :-- | :-- |
| `heximon.config.ts` | `name` under `cloudflare` | `<name>` (the preview Worker becomes `<name>-preview`) |
| `heximon.config.ts` | `bucketName` under `cloudflare.r2Buckets` | `<name>-files` |
| `heximon.config.ts` | `resourcePrefix` under `cloudflare` | `<name>-` |

Leave the Hyperdrive id `00000000000000000000000000000000` and the cache namespace id
`ffffffffffffffffffffffffffffffff` in `heximon.config.ts` for phase 7. Write each binding once,
in `cloudflare` of `heximon.config.ts`: Heximon copies it into the preview Worker.

**The placement of the Workers.** In `nuxt.config.ts`, add the placement to `nitro.cloudflare.wrangler`, beside
`compatibility_date`:

```ts
placement: { mode: "targeted", region: "<placement region>" },
```

`<placement region>` is `placementRegion` of the state file. The preview Worker takes the same placement: it reads the
same database. Each `wrangler deploy` writes the config of the Worker again, so the placement lives here, never in the
Cloudflare dashboard.

**`inferative.config.ts`.** Set `identity.catalog.serviceName` to `<name>`. Set `app.name` and `site.name` to the
display name.

**`server/app.module.ts`.** Keep the default list when the answer is "all". To remove a capability, follow "Add or
remove a capability" in `README.md`: delete its module line, its persistence module and its tables, and its layer in
`extends` of `nuxt.config.ts`.

**The database setup.** The starter holds a Postgres setup and a MySQL setup. Both compile with no warning, because
`heximon.config.ts` pins `root: "AppModule"`. Delete the unused one now:

- Postgres (the default): delete `server/persistence/mysql/`, and delete `mysql2` from `package.json`.
- MySQL: do the steps of "Use MySQL" in `README.md`, except step 5: `pnpm db:generate` waits for phase 9.

Then run `pnpm install`, because both choices change `package.json`.

Check:

- `pnpm heximon:check --json` exits 0, and its document has `"warnings": 0`. Any warning is a finding: read the
  `message` and the `hint` of each entry in `diagnostics` and fix its cause.
- `grep -c my-inferative-site nuxt.config.ts heximon.config.ts inferative.config.ts package.json` prints `0` for each
  file.
- `grep -c 'region: "<placement region>"' nuxt.config.ts` prints `1`.

## Phase 6: the database

One PlanetScale database serves the local run, the preview Worker and the live Worker. Cloudflare bills it. Postgres
on the single-node $5 plan is the default.

### Create the database

Use route A when `pscale-login` of `check-tools.sh` is `ok`. Use route B otherwise.

**Route A, command line.** The Cloudflare login of phase 4 is needed: the signature must come from the account of the
site (`cloudflareAccount`), and Cloudflare then bills the database.

```sh
pscale org list
CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler hyperdrive planetscale signature | pscale database create <name> --org <organization> --engine postgresql --cloudflare-billing @- --format json
```

- The first command shows the PlanetScale organization names. Ask the person which one to use.
- `@-` makes `pscale` read the signature from the pipe. The signature is a credential: do not print it or save it.
- For MySQL, leave out `--engine postgresql`. The default engine is MySQL (Vitess).
- Run `pscale database create --help` to see the flags for the region and the cluster size. Run `pscale region list`
  to see the region slugs. Pick the region of phase 4. Pick the single-node $5 plan.

**Route B, browser step.** Tell the person:

1. Open https://dash.cloudflare.com, then **Storage & databases**, then **Postgres & MySQL (Hyperdrive)**.
2. Press **Create PlanetScale database**. Choose the PlanetScale organization. Press **Create database**.
3. PlanetScale opens. Set the name to `<name>`, the engine to **Postgres** (or **MySQL**), the region from phase 4, and
   the single-node $5 cluster size. Press **Create database**.

Done when the database `<name>` exists in https://app.planetscale.com. Ask the person to confirm the plan is the $5
single node (**Settings**, **Cluster configuration**).

### Get the connection string

1. Make `.env` (`references/setup-env.md`, "Make `.env`").
2. Tell the person (browser step):
   1. Open https://app.planetscale.com, choose the database `<name>`, press **Connect**.
   2. Keep the default role. The migrations need the right to create tables.
   3. Copy the plain connection string. For Postgres it starts with `postgresql://` and ends with
      `?sslmode=verify-full&sslrootcert=system`. Use it as it is: the site reads `sslrootcert=system` as "check the
      certificate against the CA store of Node".
   4. Open `.env` in an editor. Paste the string after `DATABASE_URL=`. Use no quotes. Save the file. Tell me when it
      is done.
3. Write `waiting` in the state file, then end your turn.

### Check

Run `node SCRIPTS/env-check.mjs --only DATABASE_URL --database --dialect pg` (use `mysql` for MySQL). The line before
the last must read `database  reachable`, and the last line must read `env-check: ok`. `references/setup-env.md` has
the table of error codes. The string must end with the name that PlanetScale shows (Postgres: `postgres`).

## Phase 7: Cloudflare

Do these parts of `references/setup-cloudflare.md`:

1. "Login and account", with the account of phase 4.
2. "Hyperdrive", with the PlanetScale CA certificate and the PlanetScale command, under the name `<name>`. Heximon
   copies the id into the preview Worker.
3. "The files bucket and its access key for a local run", with the bucket `<name>-files`.
4. "The cache namespace", with the namespace `<name>-cache`. The binding `INFERATIVE_CACHE` is fixed.
5. The queue that Cloudflare Email Service writes its delivery events to. The live Worker consumes it, and the first
   deploy fails when it does not exist:

   ```sh
   CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler queues create <name>-email-events
   ```

Check: `grep -c 00000000000000000000000000000000 heximon.config.ts` and
`grep -c ffffffffffffffffffffffffffffffff heximon.config.ts` each print `0`,
`CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler queues list` lists `<name>-email-events`, and
`node SCRIPTS/env-check.mjs --only INFERATIVE_FILES_R2_ACCOUNT_ID,INFERATIVE_FILES_R2_BUCKET,INFERATIVE_FILES_R2_ACCESS_KEY_ID,INFERATIVE_FILES_R2_SECRET_ACCESS_KEY`
shows four `set` and ends with `env-check: ok`.

## Phase 8: secrets

Two secrets are generated: the root secret `INFERATIVE_ROOT_SECRET` and the identity signing key
`INFERATIVE_IDENTITY_SIGNING_KEY`. The setup token, the signing keys of preview links and the MFA key derive from the
root, so no file sets them. Three files get the values:

- `.env`: the local run.
- `.env.workers.live` and `.env.workers.preview`: the Worker files for `wrangler secret bulk`. The pattern `.env.*` in
  `.gitignore` keeps them out of the repository.

1. Set `set_env .env HEXIMON_SCHEDULE off` (`references/setup-env.md`). No other line needs a value now: the lines of
   `.env.example` keep their default. The mail setup is no variable: "Send real email" below sets it on a screen.
2. Run the generator (`references/setup-env.md`, "The secrets generator"):

   ```sh
   node SCRIPTS/generate-secrets.mjs --env .env --workers .env.workers.live --workers .env.workers.preview
   ```

   The root must be equal in all three files: the MFA key that derives from it seals data in the shared database, and
   a preview link made on one Worker must verify on the others.

Check: `node SCRIPTS/env-check.mjs --database`. The exit code must be 0: every required variable reads `set`, the line
before the last reads `database  reachable`, and the last line reads `env-check: ok`. A `missing` line: set it
(no secret) or ask the person to paste it (secret). A `wrong format` line: the text in brackets says what the rule is.
A `no longer needed` line names a variable that an older `.env` still sets: the text in brackets says how to retire
it, and the line does not fail the check. The Worker files get their other lines in phase 11.

## Phase 9: the first run

The first run creates the schema, the first organization and the first manifest. It runs on the person's machine and
writes to the hosted database.

### 1. The first migration

The starter commits no migration. Run `pnpm db:generate` once. It writes a folder below
`server/persistence/pg/migrations/` (MySQL: `server/persistence/mysql/migrations/`). Phase 10 commits it. Do not edit
it by hand.

Then run `pnpm db:migrate`. It applies the migration to the database of `.env` and must exit 0. On PlanetScale
Postgres it can print `Applied <folder> one statement at a time`: the server refused the statements in one transaction
(code `NK013`), and the command applied them one at a time.

### 2. Start the site

Run `pnpm dev` in the background. The migrations run when the app starts. Wait until
`curl -sL -o /dev/null -w '%{http_code}' http://localhost:3000/admin` prints `200`.

**A change of `.env` restarts the server.** `nuxt dev` watches `.env` and restarts in a new process
(`.env changed. Restarting Nuxt in a new process...`). Do not stop and start `pnpm dev` after a save of `.env`. A
browser tab that was open before the restart can show `Failed to fetch dynamically imported module` or
`SendBeforeConnectError`. That is not a defect of the site: tell the person to reload the tab.

A start that fails with a database error: run `node SCRIPTS/env-check.mjs --database` and fix the cause with the table
of `references/setup-env.md`.

### 3. The first organization (browser step)

Tell the person:

1. Open http://localhost:3000/admin. The first-run form appears. It asks for the **Setup token**. The token derives
   from the root secret of `.env`.
2. In a terminal of your own, in the folder of the site, run `pnpm exec inferative setup-token`. It prints the token.
   Paste it into the **Setup token** field. Do not send it to me.
3. Enter the organization name, then the name, email and password of the owner. Keep the password in a password
   manager. Do not send it to me.
4. Press the button that creates the organization. The dashboard opens.
5. Open http://localhost:3000/api/identity/session in the same browser. Copy the value of `activeOrganizationId`. Send
   me that id. It is not a secret.

Write `waiting` in the state file, then end your turn.

### 4. The default organization

Run `set_env .env INFERATIVE_CHANNELS_DEFAULT_ORGANIZATION_ID <id>`. It must exit 0. Write the id to
`ids.organization` in the state file.

With the default organization set, the site reads its pages through the stamped reads of the default channel. The site
finds the channel's key itself, so no channel key goes into `.env`. A key that the `api` section names wins.

Nuxt restarts by itself when `.env` changes. Wait until `/admin` answers `200` again. Tell the person to reload the
browser tab before the next step.

### 5. The channel and the sync key (browser step)

`pnpm sync:manifest` needs the channel id and a sync key. The channel has a **Connect the website** guide that makes
the sync key and copies the sync values as `.env` lines. Tell the person:

1. Open http://localhost:3000/admin/settings/channels. Open the default channel. The **Overview** tab opens.
2. The site boot made the channel with the website address and the preview address set to `http://localhost:3000`,
   the address of a local run. On the **Overview** tab, the line **Website addresses** of the setup list must read
   `localhost:3000 · Preview: localhost:3000`. A channel that an earlier start made has no address: open the
   **Settings** tab, set both **Production** and **Preview** in the section **Website addresses** to
   `http://localhost:3000`, and save. Phase 11 replaces both with the live and the preview Worker address. The Overview
   step **Check the preview** can report that the address is on a private network. Ignore it until phase 11.
3. Open the **Overview** tab. In the setup list, at the step **Connect the website**, press **Open the guide**. The
   panel **Connect the website** opens.
4. In the panel, press **Create the sync key**. The key has the purpose **Website sync**. The panel shows the key
   once.
5. Press **Copy the sync values as .env**. Do this before you close the panel: Inferative cannot show the key again.
6. Open `.env` in an editor. Paste into it the three lines: `INFERATIVE_SITE_SYNC_CHANNEL_ID`,
   `INFERATIVE_SITE_SYNC_API_BASE_URL` and `INFERATIVE_MANIFEST_TOKEN`. The file holds these names already, with an
   empty or a default value. Replace those lines, so that each name is in the file once. Save. Do not send me the
   lines.
7. Send me the channel id. It is the value of **Channel ID** in the panel, and the Overview shows it with a **Copy**
   button also when the panel is closed. It is not a secret.

Do not press **Copy for a separate website**. It copies the two lines that start with `INFERATIVE_API_`. This site
serves its own API, and `INFERATIVE_API_BASE_URL` must stay empty. A value there makes the dashboard send its API
requests with no cookies. The sign-in then fails, and the person cannot create the first page. The check after this
step fails when that line has a value.

The manual way: the person opens http://localhost:3000/admin/settings/organization/api-keys, presses **New API key**,
chooses the purpose **Website sync** (it gives exactly the grants `channels:manifest` and `channels:read`), and pastes
the key after `INFERATIVE_MANIFEST_TOKEN=`. Use it only when the guide is not usable. The channel id and the other
lines then come from the panel **Connect the website** or from the address bar.

Write `waiting` in the state file, then end your turn.

Then run `node SCRIPTS/env-check.mjs --stage sync`. It must exit 0: a line `INFERATIVE_API_BASE_URL  wrong format`
means the person pasted the API address. Ask the person to empty or delete that line in the editor. If
`INFERATIVE_SITE_SYNC_CHANNEL_ID` reads `missing`, set it with `set_env` from the id the person sent (it must exit 0).
Write the id to `ids.channel`. `INFERATIVE_SITE_SYNC_API_BASE_URL` has its default `http://localhost:3000/api`. The
guide copies the same address.

Nuxt restarts again when `.env` changes. Wait for `200` on `/admin`. Tell the person to reload the browser tab.

### 6. Publish the manifest

1. Run `node SCRIPTS/env-check.mjs --stage sync`. It must exit 0.
2. Run `pnpm sync:manifest --first-sync`. A new channel refuses `sharedSection` until it has served a first schema, so
   the first sync uses `--first-sync`. It must exit 0. Later syncs use `pnpm sync:manifest`.
3. In the dashboard, the person creates a page, publishes it and makes it the home page (browser step: the dashboard
   menu lists the screens for content and pages). Check: `curl -sL -o /dev/null -w '%{http_code}' http://localhost:3000/`
   prints `200`.

Stop the background `pnpm dev`.

## Phase 10: GitHub

Do `references/setup-github.md`: "Check that the account can create the repository", "Create the repository", "Set
the repository secret `DATABASE_URL`", "The secrets of the workflows" and "Commit and push". The workflows read
`READ_PACKAGES_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (from the organization when it shares them,
else from the repository) and the repository secret `DATABASE_URL`. The commit holds the migration folder of phase 9. `git status --short` must list no
`.env.workers.live` and no `.env.workers.preview`.

The push starts the Preview workflow. It stops at its first check with a message that the live Worker does not exist
yet. That is expected: phase 11 deploys the live Worker first.

## Phase 11: deploy

The order is fixed. The live Worker comes first, because the preview Worker binds its `Storage` room. Both Workers
share the one database, so the migrations of phase 9 are done.

### 1. Deploy the live Worker

1. Start the Release workflow: `gh workflow run release.yml --repo <owner>/<name>`.
2. Find the run: `gh run list --workflow release.yml --repo <owner>/<name> --limit 1 --json databaseId,status`.
3. Wait: `gh run watch <run id> --repo <owner>/<name> --exit-status`. It must exit 0.

A failure: "A failed workflow run" of `references/setup-github.md` has the common causes.

### 2. Deploy the preview Worker

The push of phase 10 started the Preview workflow, and it stopped. Run it again:
`gh run list --workflow preview.yml --repo <owner>/<name> --limit 1 --json databaseId`, then
`gh run rerun <run id> --repo <owner>/<name>`, then
`gh run watch <run id> --repo <owner>/<name> --exit-status`. It must exit 0.

### 3. Write down the addresses

Read the live address from the log of the Release run:
`gh run view <run id> --repo <owner>/<name> --log | grep -o 'https://[A-Za-z0-9.-]*workers.dev' | sort -u`. It
looks like `https://<name>.<subdomain>.workers.dev`. The preview address is
`https://<name>-preview.<subdomain>.workers.dev`. Write both to `origins` in the state file.

A custom domain: "A custom domain" of `references/setup-cloudflare.md`, with `preview.<domain>` for the preview
Worker. Start the Release workflow again. Use the two domains as the addresses.

### 4. Fill the Worker files

Run `set_env .env.workers.live INFERATIVE_CHANNELS_DEFAULT_ORGANIZATION_ID <id>` and the same for
`.env.workers.preview`, with `ids.organization` of the state file. Each call must exit 0.

A Worker file sets no address. The passkey settings and the links in mail come from the address of each request, and
`inferative.config.ts` sets the rule of one organization. A site that already sets `INFERATIVE_IDENTITY_WEBAUTHN_RP_ID`
or `INFERATIVE_IDENTITY_WEBAUTHN_ALLOWED_ORIGINS` to a real domain (an RP ID of the parent domain, the origin of a
preview or a native client) keeps the value: the passkeys made under it stop working when it goes. Only the
`localhost` placeholder of an older `.env.example` goes.

Check both files: `node SCRIPTS/env-check.mjs --profile worker --stage organization --file .env.workers.live`, and the
same with `.env.workers.preview`. Both must exit 0. Each file holds `INFERATIVE_ROOT_SECRET` and
`INFERATIVE_IDENTITY_SIGNING_KEY` from phase 8.

### 5. Set the Worker secrets

```sh
CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler secret bulk .env.workers.live --name <name>
CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler secret bulk .env.workers.preview --name <name>-preview
```

A secret change deploys the Worker again. The workflows never set Worker secrets, so run these two commands again after
any change to a Worker file.

### 6. Set the addresses of the channel

The default channel still has the address `http://localhost:3000` from phase 9. Its **Production** and **Preview**
addresses drive the **Open website** and **Preview** actions of the dashboard. The bundled editor frames its own origin
and does not read them. Tell the person (browser step):

1. Open `<live address>/admin/settings/channels` and sign in with the owner of phase 9. Open the default channel.
2. In the section **Website addresses**, set **Production** to the live address and **Preview** to the preview
   address. Save the channel.
3. Tell me when it is done.

The database is shared, so this one change holds for the local run, the preview Worker and the live Worker.

Then publish the manifest to the live API. It restates the addresses of the channel, so it fails or reports drift
until they are saved:

1. Run `set_env .env INFERATIVE_SITE_SYNC_API_BASE_URL <live address>/api`. It must exit 0.
2. Run `pnpm sync:manifest`. It must exit 0.

### 7. Check

1. `pnpm exec inferative site doctor <live address>` exits 0. Do the same for the preview address.
2. `curl -sL -o /dev/null -w '%{http_code}' <address>/admin` prints `200` for both.
3. The placement: "The check of a deployed Worker" of `references/setup-cloudflare.md` passes for both Workers:
   `node SCRIPTS/placement-check.mjs --account <account id> --worker <name> --worker <name>-preview --region <placement region> --url <live address>/api/ready --url <preview address>/api/ready --colo <colo>`, where `<colo>` is the colo of the placement region (`FRA` for `aws:eu-central-1`; see `references/setup-cloudflare.md`).
4. Browser step: the person opens `<live address>/admin` and signs in with the owner of phase 9. Both Workers use the
   same database, so the same account works on both. On the channel, **Open website** must open the live address and
   **Preview** must open the preview address.

Tell the person:

- A push to `main` deploys `<name>-preview`.
- A published GitHub release deploys `<name>`.
- Preview, live and the local run share one database. Migrations run when the app starts and in each workflow before
  the deploy. Between a push and the next release, live can run older code on a newer schema.

## Daily work

The rules about secrets of `references/setup.md` apply here too: never show a value of `.env` or of a Worker file.

### Change code and deploy

1. Edit. After a change to a module run `pnpm heximon:check`. Before a push run `pnpm typecheck` and `pnpm test`.
2. A push to `main` runs `.github/workflows/preview.yml`: the migrations, the build, then the deploy of
   `<name>-preview`.
3. To release, publish a GitHub release: `gh release create v<version> --generate-notes --repo <owner>/<name>`.
   `.github/workflows/release.yml` runs the migrations, the build, then the deploy of `<name>`. A manual run does the
   same: `gh workflow run release.yml --repo <owner>/<name>`.

Preview and live share one database. Write migrations that the older code can read.

### Edit and preview the local site

The local run, the preview Worker and the live Worker share one channel. The channel row holds one **Production** and
one **Preview** address (phase 11). A local run uses its own addresses with an override in `inferative.config.ts`. The
override never writes the channel row.

1. For the default channel of the bundled site, `http://localhost:3000/admin` already frames `http://localhost:3000`.
   Set no override for it.
2. For a website on its own dev server, for example `http://localhost:3001`, add this to `$development` in
   `inferative.config.ts`:

   ```ts
   channels: { addressOverrides: { blog: { preview: "http://localhost:3001" } } }
   ```

   The key is the slug of the channel. Add `production` to change the **Open website** link too.
3. One person can set it without a commit:
   `INFERATIVE_CHANNELS_ADDRESS_OVERRIDES='{"blog":{"preview":"http://localhost:3001"}}'` in `.env`.
4. Restart `pnpm dev`. The local dashboard now frames, opens and checks the local address and shows **Local override**
   beside it. The preview Worker and the live Worker still use the stored addresses.

Do not prerender a route, and do not add a static file with no extension or an HTML file outside a folder that starts
with `_` (`_site/` is not such a folder: the editor frames `/_site/edit-entry`). Cloudflare serves a static file before
the Worker, at the address of a page with the same name, so the editor's frame of that page gets no frame policy.

A production process refuses an override that it cannot verify as public (a private address, `localhost`, or a name it
cannot resolve) and stops when the channels package loads. Never set an override in `.env.workers.live` or
`.env.workers.preview`.

### Change the schema

Edit `server/persistence/pg/schema.ts` (MySQL: `server/persistence/mysql/schema.ts`) or a module. Run
`pnpm db:generate`. Commit the new migration folder. Never edit a migration by hand. `pnpm db:migrate` applies the
migrations to `DATABASE_URL`.

### Change the site declarations

After a change in `shared/site.ts` run `pnpm sync:manifest`. It needs the key in `INFERATIVE_MANIFEST_TOKEN`
(phase 9). If the key is gone, the person creates a new one in `/admin/settings/organization/api-keys`.

### Add or remove a capability

Follow "Add or remove a capability" in `README.md`. Add the layer to `extends` in `nuxt.config.ts`. A module that uses
a Durable Object needs no binding edit: Heximon writes its binding into the live and the preview Worker.

### Send real email

Follow "Send email" in `README.md`. The person runs `pnpm exec wrangler email sending enable <domain>` for the domain
of the mail, then adds the provider, the domain and the address on `/admin`, Settings, Organization, Mail and SMS
(browser step), and sets the ownership record that the screen shows at the domain's DNS host. The person also adds an
event subscription in the Cloudflare account that sends the events of Cloudflare Email Service to the queue
`<name>-email-events`. Without it, only Cloudflare's own suppression list stops a send to a bounced address. No env file
holds a mail setting.

### Backups

`.github/workflows/backup.yml` backs up the database and the files each night: "Daily work" of
`references/setup-backup.md`.

### Use MySQL

Follow "Use MySQL" in `README.md`. This changes the database of a site that has no data yet. For a site with data, ask
the person first.

### Rotate or add a Worker secret

Change the value in the Worker file (the person, in an editor, for a secret). Run the two `wrangler secret bulk`
commands of phase 11.

`INFERATIVE_ROOT_SECRET` must stay equal in `.env`, `.env.workers.live` and `.env.workers.preview`. Never replace it in
one file only, and never delete it: the MFA key that derives from it seals data in the shared database. Ask the person
before you change it. To rotate it, follow the rotation in "Cloudflare" of `README.md`: the old value moves to
`INFERATIVE_ROOT_SECRET_PREVIOUS`.

### Retire an older variable

A site made before the root secret and the settings screens can still set a variable that the starter no longer
lists. `node SCRIPTS/env-check.mjs` prints each one as `no longer needed`, with how to retire it, and still passes.
Follow "Older variables" in `README.md`. Ask the person before a change: the person deletes the line in an editor.
After a change of a Worker file, run the two `wrangler secret bulk` commands of phase 11, and
`CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler secret delete <variable> --name <worker>` for each Worker that
still has the variable.

### Check a deployment

`pnpm exec inferative site doctor <address>` reports the readiness of a Worker. `pnpm exec inferative site check`
audits `shared/site.ts` without a network.
