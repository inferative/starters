# Setup steps: dashboard-cloudflare

The steps that deploy the Inferative dashboard made from this starter, and its daily work. The `inferative` skill runs
them (`npx skills add https://inferative.dev --global`): its file `references/setup.md` holds the rules, the start,
the state file and phases 1 to 3, and sends the agent here for phase 4 and on. `references/…` and `SCRIPTS` below are
files of that skill.

The dashboard is one Nuxt app, two Cloudflare Workers (the dashboard Worker and the applets Worker) and one Postgres
database. The dashboard is at the root of the dashboard Worker, `/`. The result is two deployed Workers with an owner
account and an organization, and a nightly backup that is encrypted and kept for 30 days. `<name>` is the `name` of the
state file.

The first run starts empty. The person creates the owner account and the organization in the browser. The setup
creates no other record: no channel, no department, no project.

## Rules of this starter

- Two env files hold the values: `.env` (the local run) and `.env.worker` (the Worker). Both are sealed, as every env
  file is.
- The local run and the Worker share one database, so the root secret is the same in both files.
- Each Wrangler command, `pnpm deploy:applets` and `pnpm deploy:live` carry the account (`references/setup-cloudflare.md`).

## State file

The keys of this starter, beside the shared keys:

```json
{
  "postgresProvider": "<provider>",
  "region": "<region>",
  "placementRegion": "aws:eu-central-1",
  "locationHint": "weur",
  "domain": "workers.dev",
  "singleOrganization": true,
  "assistantConnection": "none",
  "ids": { "hyperdrive": "<id>", "bucket": "acme-files", "queue": "acme-saga-timer-queue", "backupBucket": "acme-backups" },
  "origin": "https://acme.example.workers.dev"
}
```

## Phases

| # | Phase id | Done when | Details |
| :-- | :-- | :-- | :-- |
| 4 | `choices` | You hold every answer of the choices table | "Phase 4: choices" |
| 5 | `starter` | `pnpm heximon:check` exits 0, no `my-inferative-dashboard` is left in `nuxt.config.ts`, `heximon.config.ts`, `inferative.config.ts` and `package.json`, no `my-inferative-applets` is left in `heximon.config.ts` and `workers/applets/heximon.config.ts`, and the placement and the location hint of the state file are in `nuxt.config.ts` and `inferative.config.ts` | "Phase 5: the config" |
| 6 | `database` | `pnpm db:migrate` exits 0 against the `DATABASE_URL` of `.env` | "Phase 6: the database" |
| 7 | `cloudflare` | The Hyperdrive id is in `heximon.config.ts`, caching is off, and the bucket and the queue `<name>-saga-timer-queue` exist | "Phase 7: Cloudflare" |
| 8 | `secrets` | The secrets check shows each name as `set` in `.env` and in `.env.worker`, and the root as `same` | "Phase 8: secrets" |
| 9 | `local-run` | Under `pnpm dev`, `/api/ready` answers 200 and `/api/identity/session/setup` answers `"required":true` | "Phase 9: the local run" |
| 10 | `github` | The repository exists, `gh secret list` shows `DATABASE_URL` and each secret that the organization does not share, and `main` is pushed | "Phase 10: GitHub" |
| 11 | `deploy` | The Release run exits 0, the Worker secrets are set, `<origin>/api/ready` answers 200, and the Worker runs with the placement of phase 5 | "Phase 11: deploy" |
| 12 | `first-run` | `<origin>/api/identity/session/setup` answers `"required":false`, and the Worker holds `INFERATIVE_ROOT_SECRET` | "Phase 12: the first run" |
| 13 | `backup` | The private key is offline, the bucket of archives has the 30-day rule, and the last run of `backup.yml` ends with `success` | `references/setup-backup.md` |

After phase 13, tell the person the address of the dashboard.

## Known limits

- **No preview Worker.** The Durable Objects hold state that refers to the database. A second Worker on the same
  database splits that state.
- **No sample data.** A later tool of Inferative will seed an existing deployment. It does not exist yet, and the setup
  does not run it.

## Phase 4: choices

First collect the two lists that the questions offer. Both list the logins of the person:

1. The GitHub owners: "Choose the GitHub owner" of `references/setup-github.md`.
2. The Cloudflare accounts: "Login and account" of `references/setup-cloudflare.md`.

Then ask the person these questions in one message. Offer the default. A question with the default "none" has no
default: the person chooses. Write the answers to the state file.

| Question | Default | Notes |
| :-- | :-- | :-- |
| Display name | the name, capitalized | The name of the mails and of the MCP server. It goes into `inferative.config.ts`. |
| Cloudflare account | none | One of the accounts of the Wrangler login. One account can hold several dashboards: each has its own names. It goes into `cloudflareAccount`. |
| Postgres provider | none | Any Postgres server that Hyperdrive can reach over the internet. Examples: PlanetScale Postgres (Cloudflare can bill it), Neon, Supabase, or a server that the person runs. Ask the person. Do not choose for them. |
| Database region | none | The person picks it at the provider. Choose the region nearest to the people who use the dashboard. Write the cloud and the region code of the provider, for example `AWS eu-central-1`. |
| Domain | the `workers.dev` address of the Worker | A custom domain needs a zone in the same Cloudflare account (`references/setup-cloudflare.md`). |
| GitHub owner | none | The person's own account or one of their organizations, from the list of the `gh` login. It goes into `githubOwner`. |
| One organization only | yes | Yes: after the first run, the person turns it on in Platform, General (phase 12). Nobody can then create a second organization. |
| GitHub App | none: no CI check reaches the dashboard | Optional. The App reports a failed CI check of a commit that an agent pushed, and gives the write token of a push. A platform administrator creates it from Platform › Integrations after the deploy, because it needs the address of the dashboard ("Turn on the GitHub App" below). |
| Model of the assistant | none: AI is off until an organization has a model connection | Optional. A model connection of the kind `anthropic`, `openai`, `vercel-ai-gateway`, `cloudflare-ai-gateway` or `openrouter`. The person needs an API key of that provider and a model id. It can wait until later ("Turn on the assistant" below). |
| Capabilities | all | The modules of `server/app.module.ts` that the dashboard keeps. |

Then map the database region to the placement region and the location hint: "Placement and the location hint" of
`references/setup-cloudflare.md`. Write them to `placementRegion` and `locationHint`. When the region has no row of
its own, tell the person which row you used.

## Phase 5: the config

Edit these files yourself.

**`nuxt.config.ts`, `heximon.config.ts` and `workers/applets/heximon.config.ts`.** Replace every
`my-inferative-dashboard` and every `my-inferative-applets`, also in the comments:

| File | Place | New value |
| :-- | :-- | :-- |
| `heximon.config.ts` | `cloudflare.name` | `<name>` |
| `heximon.config.ts` | `cloudflare.resourcePrefix` | `<name>-` |
| `heximon.config.ts` | `bucketName` under `cloudflare.r2Buckets` | `<name>-files` |
| `heximon.config.ts` | `scriptName` of `APPLET_SUPERVISOR` under `cloudflare.durableObjects` | `<name>-applets` |
| `workers/applets/heximon.config.ts` | `cloudflare.name` | `<name>-applets` |

The build puts `cloudflare.resourcePrefix` before the names of the queue and the workflows: `<name>-saga-timer-queue`,
`<name>-assistant-api-run`, `<name>-assistant-room-consultation` and `<name>-notifications-chat-reply`. Cloudflare keeps
one queue and one workflow of a name in each account, so the prefix lets several dashboards share one account. The two
`<name>-applets` values must be the same: the dashboard Worker binds the applet supervisor of the applets Worker by
that name. Keep the binding names `HYPERDRIVE`, `FILES_BUCKET`, `APPLET_SUPERVISOR` and `APPLET_LOADER`: the packages
read them. Leave the Hyperdrive id `00000000000000000000000000000000` in `heximon.config.ts` for phase 7.

Keep the compatibility date of the two Workers the same: `compatibility_date` in `nuxt.config.ts` and
`compatibilityDate` in `workers/applets/heximon.config.ts`. Do not add the flag `nodejs_compat` to either Worker. From
the date 2026-08-04, workerd turns Node compatibility on by itself and rejects a Worker that names the flag. The build
removes the flag that Nitro adds.

**The placement of the dashboard Worker.** In `nuxt.config.ts`, add the placement to `nitro.cloudflare.wrangler`, beside
`compatibility_date`:

```ts
placement: { mode: "targeted", region: "<placement region>" },
```

`<placement region>` is `placementRegion` of the state file. Each `wrangler deploy` writes the config of the Worker
again, so the placement lives here, never in the Cloudflare dashboard. The applets Worker gets no placement: it reads
no database.

**`inferative.config.ts`.**

| Key | New value |
| :-- | :-- |
| `base.durable.locationHint` in `$production` | `"<location hint>"`: `locationHint` of the state file, in quotes, in place of `null` |
| `identity.catalog.serviceName` | `<name>` |
| `app.name` | the display name until a platform administrator saves one: the sender name of every mail, the title of the MCP server and the issuer that an authenticator app shows |
| `mcp.serverInfo.name` | `<name>` |

**`server/app.module.ts`.** Keep the full list when the answer is "all". To remove a capability, follow "Add or remove
a capability" in `README.md`. Then run `pnpm heximon:check`.

Check:

- `pnpm heximon:check` exits 0. Read each warning that it prints, and fix its cause when it names a file of the
  project.
- `grep -c my-inferative-dashboard nuxt.config.ts heximon.config.ts inferative.config.ts package.json` prints `0` for
  each file.
- `grep -c my-inferative-applets heximon.config.ts workers/applets/heximon.config.ts` prints `0` for each file.
- `pnpm exec heximon check --cwd workers/applets` exits 0.
- `grep -c 'My Inferative dashboard' inferative.config.ts` prints `0`.
- `grep -c 'region: "<placement region>"' nuxt.config.ts` prints `1`, and `grep -c placement workers/applets/heximon.config.ts`
  prints `0`.
- `grep -c 'locationHint: "<location hint>"' inferative.config.ts` prints `1`.

## Phase 6: the database

One Postgres database serves the local run and the Worker. The Worker reaches it through Hyperdrive (phase 7). The
local run, `drizzle-kit` and the Release workflow use the direct connection string.

### Create the database

The person creates the database at the provider of phase 4. Use the CLI of the provider when it is installed and
logged in. Use the browser route otherwise.

**PlanetScale Postgres from the command line.** Both `pscale auth login` and the Cloudflare login are needed. The
signature must come from the account of phase 4 (`cloudflareAccount`). Cloudflare then bills the database.

```sh
pscale org list
CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler hyperdrive planetscale signature | pscale database create <name> --org <organization> --engine postgresql --cloudflare-billing @- --format json
```

- The first command shows the PlanetScale organization names. Ask the person which one to use.
- `@-` makes `pscale` read the signature from the pipe. The signature is a credential: do not print it or save it.
- Run `pscale database create --help` for the flags of the region and of the cluster size. Run `pscale region list`
  for the region slugs.

**Any provider, browser route.** Tell the person:

1. Open the console of the provider. Create a Postgres database. Name it `<name>`, if the provider asks for a name.
2. Choose the region of phase 4. Another region changes the placement: map it again (phase 4) and change the two
   values of phase 5.
3. Tell me when the database exists.

Write `waiting` in the state file, then end your turn.

### Get the connection string

1. Make `.env` (`references/setup-env.md`, "Make `.env`").
2. Tell the person (browser step):
   1. Open the database at the provider, and find its connection string.
   2. Choose the **direct** connection, not the address of a connection pooler. Hyperdrive is the pool of the Worker.
   3. Use a role that can create tables. The migrations need that right.
   4. Copy the string. It starts with `postgresql://` or `postgres://`. Keep its `sslmode` part as it is.
   5. Open `.env` in an editor. Paste the string after `DATABASE_URL=`. Use no quotes. Save the file. Tell me when it
      is done.
3. Write `waiting` in the state file, then end your turn.

### The first migration

The starter commits no migration.

1. Run `pnpm db:generate`. It writes the first migration into a folder below `server/persistence/pg/migrations/`. It
   needs no database. Phase 10 commits that folder. Never edit a migration by hand.
2. Apply it to the database. This form hides any address in the output:

   ```sh
   log="${TMPDIR:-/tmp}/db-migrate.log"
   pnpm db:migrate > "$log" 2>&1; result_code=$?
   sed -E 's#postgres(ql)?://[^[:space:]]*#<address>#g' "$log"; rm -f "$log"; [ "$result_code" = 0 ]
   ```

The migrations run in three places, always over the direct connection:

- `pnpm db:migrate` by hand.
- A local `pnpm dev`, when the app starts.
- The Release workflow, before each deploy.

The Worker itself runs no migration. It has Hyperdrive and no direct connection string, so it skips them.

### Check

`pnpm db:migrate` exits 0. A failure prints a code. Fix the cause and run it again:

| Code or text | Cause | Fix |
| :-- | :-- | :-- |
| `ENOTFOUND` | wrong host | The person copies the string again. |
| `ECONNREFUSED`, `ETIMEDOUT` | wrong port, a pooler port, or no network | Check that the string is the direct connection. Check the network. |
| `28P01` | wrong password, or the role is gone | The person makes a new role or password and copies the new string. |
| `3D000` | the database name is wrong | The string must end with the database name that the provider shows. |
| a text with `CERT` or `self-signed` | the certificate check failed | Keep the `sslmode` of the provider. Change nothing else in the string. |
| a message about a missing migrations folder or journal | `pnpm db:generate` did not run | Run it, then run `pnpm db:migrate` again. |

## Phase 7: Cloudflare

The person creates four things once: the Hyperdrive config, the R2 bucket, the queue `<name>-saga-timer-queue` and,
for the local run, an R2 access key. The first deploy (phase 11) creates the Durable Objects, the Worker Loader of the
applets and the workflows `<name>-assistant-api-run`, `<name>-assistant-room-consultation` and
`<name>-notifications-chat-reply`.

1. Do "Login and account" of `references/setup-cloudflare.md`, with the account of phase 4.
2. **The names are free.** Run `grep -c 'resourcePrefix: "<name>-"' heximon.config.ts`. It must print `1`. Then run
   `CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler queues list` and
   `CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler workflows list`. The account must not hold the queue
   `<name>-saga-timer-queue` or the workflow `<name>-assistant-api-run`, `<name>-assistant-room-consultation` or
   `<name>-notifications-chat-reply` of another dashboard. If one of them exists and the state file does not name it in
   `ids`, stop. Tell the person that another dashboard uses the name `<name>` on this account, and ask for another
   name. The queues and the workflows of other dashboards, with other prefixes, do not matter.
3. Do "Hyperdrive" of `references/setup-cloudflare.md`, under the name `<name>`: the PlanetScale command with the CA
   certificate for PlanetScale Postgres, the other command for another provider.
4. Create the queue. The Worker sends each fired decision timer through it and reads it back:

   ```sh
   CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler queues create <name>-saga-timer-queue
   ```

   Write `<name>-saga-timer-queue` to `ids.queue` in the state file.
5. Do "The files bucket and its access key for a local run" of `references/setup-cloudflare.md`, with the bucket
   `<name>-files`.

Check:

1. `grep -c 00000000000000000000000000000000 heximon.config.ts` prints `0`, and the Hyperdrive check of
   `references/setup-cloudflare.md` passes.
2. `CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler r2 bucket list` lists `<name>-files`.
3. `CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler queues list` lists `<name>-saga-timer-queue`.
4. If the person made the access key, the four `INFERATIVE_FILES_R2_*` names read `set` in the secrets check of
   phase 8.

## Phase 8: secrets

The Worker needs one secret: the root secret, `INFERATIVE_ROOT_SECRET`. Every other secret of the dashboard derives
from it: the setup token, the signing keys of links, the realtime ticket secret, the webhook secret of the member chat
and the keys at rest. The first sign-in generates the key that signs sessions, and the secret store keeps it sealed.

The local run and the Worker use one database. So the root must be equal in both files, because it seals data in that
database. The commands below copy the generated root from `.env` into `.env.worker`.

### Generate the root secret

Run `set_env .env HEXIMON_SCHEDULE off` (`references/setup-env.md`) first.

The function `fill_secret <file> <variable> <maker>` makes a value with Node and writes it straight into the file. It
prints the name and `generated` or `kept`, never the value. It keeps a value that is set. Define it inside the same
command, because the shell forgets it between commands.

```sh
fill_secret() {
  (umask 077 && touch "$1") && chmod 600 "$1" || return 1
  if grep -Eq "^$2=.+" "$1"; then printf '%s kept\n' "$2"; return 0; fi
  fill_value="$(node -p "$3")" && [ -n "$fill_value" ] || { unset fill_value; return 1; }
  rm -f "$1.tmp" &&
    (umask 077 && set -C && { grep -v "^$2=" "$1"; printf '%s=%s\n' "$2" "$fill_value"; } > "$1.tmp") &&
    mv "$1.tmp" "$1" && chmod 600 "$1"
  fill_status=$?; unset fill_value
  [ "$fill_status" = 0 ] && printf '%s generated\n' "$2"
}
fill_secret .env INFERATIVE_ROOT_SECRET 'require("node:crypto").randomBytes(32).toString("base64")'
```

The maker is the Node command of "Secrets" in `README.md`. The output must be `INFERATIVE_ROOT_SECRET generated` or
`INFERATIVE_ROOT_SECRET kept`. Another output means that the step failed: do not go on. `.env.tmp` is a temporary file
of mode 600. `.gitignore` ignores it, and the function removes it.

Tell the person to keep a copy of the root outside the repository, in a password manager. A lost root makes the data
that it sealed unreadable: two-factor secrets, model history, the secrets of the secret store and the kept signing key.

### Make `.env.worker`

Copy the root into a new `.env.worker` of mode 600. An `.env.worker` that exists stays as it is.

```sh
[ -e .env.worker ] || (umask 077 && set -C && grep -E '^INFERATIVE_ROOT_SECRET=.' .env > .env.worker); chmod 600 .env.worker
```

### The lines that hold no secret

No line needs a value now. The mail sender and one organization only are no variables: a platform administrator saves
them on Platform, General. Phase 12 sets one organization only after the first run, and "Send real
email" below saves the sender.

`HEXIMON_SCHEDULE=off` stays in `.env`: only the Worker runs the scheduled jobs, on its cron trigger. `.env.worker`
never sets it. `.env.worker` needs no `DATABASE_URL`: the Worker uses Hyperdrive.

The values under "Local run only" in `.env.example` (`DATABASE_URL`, `HEXIMON_SCHEDULE` and the four
`INFERATIVE_FILES_R2_*` values) never go to `.env.worker`. No file sets the passkey settings or the extra MCP origins:
the deployment's domains give them.

### The model of the assistant (optional)

Only when phase 4 chose a model:

1. Add a model connection of the platform organization in the dashboard (browser step). Do this after the first
   sign-in to the dashboard. The person creates a key at the provider. The person opens Settings, AI, Connections,
   adds the connection and pastes the key there. The key goes into the secret store. No env file holds it. To let the
   other organizations use it, the person turns on the offer on credits for the connection.

AI turns on for an organization when it can use a connection. Its vendor must be on the saved processing list only
when a platform administrator saved one that is not empty (Platform, Data processing).

### Check

This check prints names and states, never a value:

```sh
for file in .env .env.worker; do
  for name in INFERATIVE_ROOT_SECRET; do
    if grep -Eq "^$name=.+" "$file"; then printf '%s %s set\n' "$file" "$name"; else printf '%s %s missing\n' "$file" "$name"; fi
  done
done
for name in DATABASE_URL INFERATIVE_FILES_R2_ACCOUNT_ID INFERATIVE_FILES_R2_BUCKET INFERATIVE_FILES_R2_ACCESS_KEY_ID INFERATIVE_FILES_R2_SECRET_ACCESS_KEY; do
  if grep -Eq "^$name=.+" .env; then printf '.env %s set\n' "$name"; else printf '.env %s missing\n' "$name"; fi
done
if [ "$(grep "^INFERATIVE_ROOT_SECRET=" .env)" = "$(grep "^INFERATIVE_ROOT_SECRET=" .env.worker)" ]; then printf 'INFERATIVE_ROOT_SECRET same\n'; else printf 'INFERATIVE_ROOT_SECRET differs\n'; fi
printf 'secrets check: end\n'
```

The phase is done when the output ends with `secrets check: end`, every line of the first loop reads `set`,
`DATABASE_URL` reads `set`, and the root reads `same`. The four `INFERATIVE_FILES_R2_*` lines read `set` when the
person made the access key of phase 7. Set all four, or none.

A `missing` line: set it (no secret), or run the `fill_secret` line again (the root). A `differs` line: ask the person
which file holds the right value. When it is `.env`, the person deletes the line in `.env.worker` in an editor. Then
copy it with `grep "^<variable>=" .env >> .env.worker`, and run the check again. When it is `.env.worker`, swap the two
file names.

A wrong format shows in phase 9: the local run refuses to start and names the variable.

## Phase 9: the local run

The local run proves that the dashboard starts with the values of `.env`. It runs on the machine of the person and
reads and writes the hosted database over `DATABASE_URL`.

The first run does not happen here. It writes the owner into the shared database once, so it happens on the address
that people use (phase 12).

1. Run `pnpm dev` in the background. The migrations run when the app starts. They are applied already (phase 6), so
   the start changes nothing.
2. Wait until `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/ready` prints `200`. The first start
   compiles every layer and can take a few minutes.
3. Run `curl -s http://localhost:3000/api/identity/session/setup`. It must show `"required":true`: the database has no
   owner yet.

Two values of `.env` keep the local run apart from the Worker:

- `HEXIMON_SCHEDULE=off` keeps the scheduled jobs off. Only the Worker runs them, on its cron trigger.
- The four `INFERATIVE_FILES_R2_*` values reach the bucket through its S3 API. Without them, the log shows one warning
  and the files stay in memory.

**A change of `.env` restarts the server.** `nuxt dev` watches `.env` and restarts in a new process. Do not stop and
start `pnpm dev` after a save of `.env`. A browser tab that was open before the restart can show
`Failed to fetch dynamically imported module`. Tell the person to reload the tab.

A start that fails with a message that names a variable: the value of that variable has a wrong format. For a
generated secret, the person deletes the value in an editor. Then run its `fill_secret` line (phase 8) again. For a
shared key, copy the new line to `.env.worker` as the check of phase 8 says for a `differs` line.

A start that fails with a database error: run `pnpm db:migrate` as in phase 6 and fix the cause with its table.

**Look at it (browser step).** Tell the person:

1. Open http://localhost:3000. The sign-in page opens, with the first-run step.
2. Do not fill in the first-run step here. Close the tab, and tell me that the page showed.

Write `waiting` in the state file, then end your turn.

Check: `/api/ready` answered `200`, `/api/identity/session/setup` answered `"required":true`, and the person saw the
sign-in page. Stop the background `pnpm dev`.

## Phase 10: GitHub

The workflow `.github/workflows/release.yml` reads four secrets:

| Secret | Where it comes from |
| :-- | :-- |
| `READ_PACKAGES_TOKEN` | the organization when it shares it, else the repository: a token that can read `@inferative` and `@heximon` |
| `CLOUDFLARE_ACCOUNT_ID` | the organization when it shares it and names the account of phase 4, else the repository |
| `CLOUDFLARE_API_TOKEN` | the organization when it shares it and names the account of phase 4, else the repository |
| `DATABASE_URL` | the repository: the direct connection string of phase 6 |

Do `references/setup-github.md`: "Check that the account can create the repository", "Create the repository", "Set
the repository secret `DATABASE_URL`", "The secrets of the workflows" and "Commit and push". `git status --short`
must list no `.env.worker`. The commit holds the migration folder of phase 6.

A push does not deploy. Only a published release or a manual run starts the Release workflow (phase 11).

## Phase 11: deploy

The Release workflow runs five commands: `pnpm db:migrate`, `pnpm build`, `pnpm build:applets`,
`pnpm deploy:applets` and `pnpm deploy:live`. A deploy by hand runs the same five, in the same order ("Daily work").
The first deploy creates the two Workers: the applets Worker with the applet supervisor and the Worker Loader of the
applets, then the dashboard Worker with its eight Durable Objects and the workflows `<name>-assistant-api-run`,
`<name>-assistant-room-consultation` and `<name>-notifications-chat-reply`.

### 1. Check the size of the Workers

Cloudflare refuses a Worker above 64 MiB of code. Build both Workers once on this machine and read their sizes:

```sh
pnpm build
pnpm build:applets
CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler deploy --dry-run --config .output/server/wrangler.json
CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler deploy --dry-run --config workers/applets/dist/wrangler.json
```

The dry run uploads nothing. Read the line `Total Upload`: the first number is the size of the code. Each must be below
64 MiB. With every capability, the dashboard Worker is about 14 MiB and the applets Worker about 24 MiB. The dashboard
Worker is that small because the browser draws the screens (`dashboard.render: "client"` in `inferative.config.ts`);
do not change that value. A larger number for the dashboard Worker comes from a module that the person added: tell the
person which one, and stop.

### 2. Deploy

1. Start the Release workflow: `gh workflow run release.yml --repo <owner>/<name>`.
2. Find the run: `gh run list --workflow release.yml --repo <owner>/<name> --limit 1 --json databaseId,status`.
3. Wait: `gh run watch <run id> --repo <owner>/<name> --exit-status`. It must exit 0.

A failure: "A failed workflow run" of `references/setup-github.md` has the common causes. One more:

| Message | Fix |
| :-- | :-- |
| the queue `<name>-saga-timer-queue` does not exist | Phase 7 did not create it in this account. Create it, then start the workflow again. A queue name without the prefix `<name>-` means that `cloudflare.resourcePrefix` is missing from `heximon.config.ts`: add it (phase 5). |

### 3. Write down the address

Read the address of the dashboard Worker from the log of the run:
`gh run view <run id> --repo <owner>/<name> --log | grep -o 'https://<name>\.[A-Za-z0-9-]*\.workers\.dev' | sort -u`.
The run also deploys the applets Worker (`<name>-applets`), and the pattern leaves its address out. The command must
print exactly one line, `https://<name>.<subdomain>.workers.dev`. Write it to `origin` in the state file.

A custom domain: "A custom domain" of `references/setup-cloudflare.md`. Use `https://<domain>` as the address from
then on.

### 4. Fill `.env.worker`

No variable sets the address. The OAuth issuer and every address of the API come from the deployment's default domain,
which the first run stores. The passkey settings take its host name. So the first run must open the address that
people use.

Run the secrets check of phase 8 again.

### 5. Set the Worker secrets

```sh
CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler secret bulk .env.worker --name <name>
```

The command prints the names it sets, never the values. A change of the secrets deploys a new version of the Worker.
The workflow never sets Worker secrets: run this command again after each change of `.env.worker`.

### Check

1. `curl -s -o /dev/null -w '%{http_code}' <address>/api/ready` prints `200`. Right after the secret change, wait a few
   seconds and try again.
2. `curl -s <address>/api/identity/session/setup` shows `"required":true`.
3. `curl -s <address>/ | grep -c '/api/_boot'` prints `1`: the static assets answer a page address with the page shell
   of the build, and the Worker does not start for it. A `0` means that the deploy left out `.output/public`: build
   again and deploy again.
4. The placement: "The check of a deployed Worker" of `references/setup-cloudflare.md` passes for the dashboard
   Worker: `node SCRIPTS/placement-check.mjs --account <account id> --worker <name> --region <placement region>`.

A `500` on `/api/ready`: run `CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler tail <name>` in the background,
send the request again, and read the error. A missing or wrong variable shows by name. Fix it in `.env.worker` and run
step 5 again.

## Phase 12: the first run

The first run creates the owner account and the organization. The person does it in the browser, on the deployed
dashboard. It creates nothing else: no channel, no department, no project. The person creates them later in the
dashboard.

### 1. The owner and the organization (browser step)

Tell the person:

1. Open `<address>`. The sign-in page shows the first-run step. It asks for the **Setup token**.
2. In the project folder, run `pnpm exec inferative setup-token --env-file .env.worker`. It prints the setup token
   that the root of the Worker gives. Copy it into the field. Do not send it to me.
3. Enter your e-mail address, a password and the name of the organization. Keep the password in a password manager.
   Do not send it to me.
4. Press the button that creates the organization. The dashboard opens. You are the owner.
5. Tell me when it is done.

Write `waiting` in the state file, then end your turn.

### 2. One organization only (browser step)

Only when the answer of phase 4 is yes. Tell the person:

1. Open `<address>/platform/general`. Only an owner or an administrator of the platform organization, the first
   organization, sees the tab.
2. Under Organizations, turn on one organization only, then save.
3. Tell me when it is done.

Write `waiting` in the state file, then end your turn.

### 3. Two-factor sign-in (browser step)

Tell the person: open `<address>/settings/security` and enrol an authenticator. An owner account with only a password
is a weak point of the whole organization.

### Check

1. `curl -s <address>/api/identity/session/setup` shows `"required":false`.
2. `CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler secret list --name <name>` lists `INFERATIVE_ROOT_SECRET`.

Tell the person:

- The address of the dashboard.
- A published GitHub release deploys the Worker: "Daily work" below has the steps.
- The local run and the Worker share one database.

## Daily work

The rules about secrets of `references/setup.md` apply here too: never show a value of `.env` or of `.env.worker`.

### Change code and deploy

1. Edit. After a change to a module, run `pnpm heximon:check`. Before a push, run `pnpm typecheck` and `pnpm test`.
2. Push to `main`. A push does not deploy.
3. To deploy, publish a GitHub release: `gh release create v<version> --generate-notes --repo <owner>/<name>`.
   `.github/workflows/release.yml` runs the migrations, builds both Workers, then deploys the applets Worker and the
   dashboard Worker. A manual run does the same: `gh workflow run release.yml --repo <owner>/<name>`.

**A deploy by hand** runs the same five commands on this machine, in the same order: the dashboard Worker binds the
applets Worker, so the applets Worker deploys first. `pnpm exec wrangler whoami` must list the account of the
dashboard, and each deploy names it:

```sh
pnpm db:migrate
pnpm build
pnpm build:applets
CLOUDFLARE_ACCOUNT_ID=<account id> pnpm deploy:applets
CLOUDFLARE_ACCOUNT_ID=<account id> pnpm deploy:live
```

The workflow keeps two deploys apart. A deploy by hand does not: do not start one while a Release run is busy.

### Read the size of the dashboard Worker

Cloudflare refuses a Worker above 64 MiB of code. After a change that adds a module or a dependency, read the size of
the dashboard Worker:

```sh
pnpm build
CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler deploy --dry-run --config .output/server/wrangler.json
```

The first number of the line `Total Upload` is the size of the code. Keep it below 64 MiB. `nitro.minify` in
`nuxt.config.ts` keeps the size low: do not turn it off. Do not remove the ASCII output of `nitro.rolldownConfig`
either: without it, the heap of an isolate grows by about 18 MiB and a page render can go over the memory limit of
128 MB.

The applet supervisor is in the applets Worker, not in this size. When the size of the dashboard Worker comes near
64 MiB, tell the person which module makes it large.

### Backups

`.github/workflows/backup.yml` backs up the database and the files each night: "Daily work" of
`references/setup-backup.md`.

### Change the schema

Edit `server/persistence/pg/schema.ts`, or add a module with tables. Run `pnpm db:generate`. Commit the new migration
folder below `server/persistence/pg/migrations/`. Never edit a migration by hand.

The Release workflow applies the migration before the new code goes live. The Worker never runs a migration.
`pnpm db:migrate` applies the migrations to the `DATABASE_URL` of `.env` by hand. Write a migration that the running
code can read: between the migration and the deploy, the old code runs on the new schema.

### Update the packages

The `@heximon/*` versions are exact, and the overrides of `pnpm-workspace.yaml` follow the release of Inferative. So an
update takes the versions of the starter of the new release:

1. Download the new starter into a folder outside the project:
   `npx giget gh:inferative/starters/dashboard-cloudflare#v<major.minor> <temporary folder>`.
2. Compare its `package.json` and `pnpm-workspace.yaml` with the files of the project. Take each version and each
   override of the new starter. Keep the lines that the person added.
3. Read `README.md` of the new starter for a new Cloudflare resource or a new Worker secret. Create it before the
   deploy. Copy its `SETUP.md` over the one of the project, so that the steps match the release.
4. Run `pnpm install`, `pnpm heximon:check`, `pnpm typecheck` and `pnpm test`.
5. Run `pnpm db:generate`. A package with new tables gives a new migration folder: commit it.
6. When `pnpm heximon:check` reports a change of the durable surface, run `pnpm heximon:check --update` and commit
   `heximon.upgrade.json`. Never edit that file, and never delete it to clear an error.
7. Read the size of the Worker, then deploy.
8. After the Release run, run `pnpm tiers:seed` once. It loads the plans of the release into the database of `.env`
   and prints what it changed.
9. After the Release run, run `pnpm connectors:catalog` once. It writes the catalog of outside accounts (mail, files)
   of the release into the database of `.env`. A second run writes nothing.

Delete the temporary folder at the end.

### Rotate or add a Worker secret

1. Change the value in `.env.worker`. For a secret from a web page, the person pastes it in an editor.
2. Run `CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler secret bulk .env.worker --name <name>`. It deploys a new
   version of the Worker.
3. For the root, set the same value in `.env` too.

Ask the person before a change of the root, `INFERATIVE_ROOT_SECRET`. Follow "Secrets" in `README.md`: move the old
value to `INFERATIVE_ROOT_SECRET_PREVIOUS` in both files, then set a new root in both files. Never delete the previous
root before every condition of the README is over: the data that it sealed becomes unreadable.

### Turn on the assistant

AI is a fact of each organization. It turns on, with no reload, when the organization has a model connection that
works. The vendor of that connection must be on the processing list only when a platform administrator saved a list
that is not empty, in Platform, Data processing. No environment variable sets the list.

- For one connection that every organization may use: follow "The model of the assistant" of phase 8. The platform
  organization adds the connection and offers it on credits.
- For a connection of one organization: an administrator adds it in the dashboard, in Settings, AI, Models (browser
  step). When a platform administrator saved a processing list that is not empty, the vendor of that connection must
  be on it (browser step).

### Turn on the linked Telegram chat

Follow "Telegram" in `README.md`. The person creates the bot with BotFather (browser step). The bot token is no longer
a variable that you set.

The person pastes the token in the dashboard (browser step):

1. Sign in as an owner or an administrator of the platform organization, the first organization.
2. Open Platform, Credentials.
3. Paste the token under "Member chat bot", then save.

The save asks Telegram for the user name of the bot. It also registers the webhook at
`https://<dashboard address>/api/chat/telegram/webhook`. If Telegram refuses, the screen says why. It keeps nothing.

The webhook secret derives from the root: no file sets it. After a rotation of the root, the person saves the bot again
on the same tab, and the save registers the webhook with the new secret.

### Turn on the GitHub App

The GitHub App of the deployment reports a failed CI check of a commit that an agent pushed, so the agent works on its
task again with the output of the check. It also gives the write token of a runner's push. The App is a setting of the
dashboard, not a variable: no file and no Worker secret holds it. Follow "GitHub" in `README.md`.

1. The person signs in to the dashboard as an administrator of the platform organization, and opens Platform ›
   Integrations (browser step).
2. Under "GitHub App", the person types a GitHub organization (or leaves the field empty for a personal account) and
   clicks "Create the GitHub App". GitHub shows the new App with its name, its permissions and its events. The person
   clicks "Create GitHub App" on GitHub, and GitHub sends the browser back to Platform › Integrations, which saves the App
   (browser step). Write `waiting` in the state file, then end your turn.
3. The person installs the App on the GitHub account that owns each repository: Settings › Organization ›
   Connections, "Install on GitHub" (browser step).

Check: Platform › Integrations shows the name of the App under "GitHub App", and the Connections tab offers "Install on
GitHub".

In the repository dialog of a project, a repository on GitHub shows GitHub with its logo. "Wake the agent when CI
fails" shows only when GitHub reports the checks of that repository: the App is set, and the organization holds the
active installation of the owner of the repository. Otherwise the dialog says why the wake is off.

### Connect the website of a channel

The websites of the channels live on other origins. Set `INFERATIVE_CHANNELS_ADMINISTRATION_ORIGINS` in `.env.worker`
to a JSON list of their origins, for example `["https://acme.example"]`. Use `set_env`. Then run the
`wrangler secret bulk` command. The origins may call the channel routes, and the visual editor frames them.

### Send real email

Follow "Send email" in `README.md`. The person pastes the Resend API key in the dashboard, not in an env file (browser
step):

1. Sign in as an owner or an administrator of the platform organization, the first organization.
2. Open Platform, Credentials.
3. Paste the key under "Mail provider key", then save.

The server reads the key from the secret store at each send. No env file holds the key.

Then the person saves the sender (browser step): open Platform, General, choose "Use this value" under
"Mail sender", enter an address on a domain that the provider verified (and a name, when the mails must not take the
deployment name), then save. No env file holds the sender, and the next mail uses it with no deploy.

### Add or remove a capability

Follow "Add or remove a capability" in `README.md`. A module that adds a Durable Object, a queue or a workflow adds it
to the Worker by itself: read `.output/server/wrangler.json` after `pnpm build`. Create a new queue with
`CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler queues create` before the deploy. Then read the size of the
Worker.

### Check a deployment

- `curl -s -o /dev/null -w '%{http_code}' <address>/api/ready` prints `200`.
- The Workers Cache keeps the bytes of a public file for one day ("File cache" in `README.md`). Copy the public address
  of a public file from the Files screen, and read it twice:
  `curl -s -o /dev/null -D - <public address> | grep -i '^cf-cache-status'`. The second read prints `HIT`. Make the
  file private, then read the address again: it answers `404` at once, because the file route decides each read before
  it asks the cache.
- `CLOUDFLARE_ACCOUNT_ID=<account id> pnpm exec wrangler tail <name>` streams the log of the Worker.

### Read the logs

The dashboard Worker writes each log line as one JSON object. A line that a request writes carries the `requestId` of
that request. Each request that a route serves also writes one wide event at its end: `method`, `route` (the pattern,
never the actual path), `status`, `durationMs`, `requestId`, and the permission check of the request
(`authorization`, with ids only). An error shows only its name, code and status.

- On Cloudflare the lines go to Workers Logs. `observability: { enabled: true }` in the `wrangler` block of
  `nuxt.config.ts` turns it on. Read it on the Observability page of the Worker in the Cloudflare dashboard, and filter
  by `requestId`.
- On a Node build the lines go to the standard output of the process.
- To follow one request, read the `x-request-id` header of its response, then search the logs for that id. The server
  makes the id; it ignores an `x-request-id` header that a client sends.
- `INFERATIVE_LOGGER_REPORTER=pretty` gives the human form of the lines. Keep the JSON form in production: Workers Logs
  reads its fields.
- The dashboard exports no traces. A trace drain (OTLP) comes with the deploy target: on Workers it must send over
  `fetch`.
