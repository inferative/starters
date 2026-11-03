# Setup steps: nuxt-sdk

The steps that set up a website made from this starter, and its daily work. The `inferative` skill runs them
(`npx skills add https://inferative.dev --global`): its file `references/setup.md` holds the rules, the start, the
state file and phases 1 to 3, and sends the agent here for phase 4 and on. `references/…` below are files of that
skill.

The website is a Nuxt app with its own server. It reads one channel of a running Inferative deployment over HTTP, with
`@inferative/sdk`. It has no dashboard, no database and no Worker of its own: the content and its editors live in the
dashboard of the deployment. The result is a website that draws the published pages of the channel, and a Node build
that starts. `<name>` is the `name` of the state file.

## Rules of this starter

- The person needs a running Inferative dashboard where their role can manage channels and API keys. Ask for its
  address in phase 4. Without one, stop: set one up first (the `dashboard-cloudflare` or the `nuxt-cloudflare`
  starter).
- The two `NUXT_PUBLIC_` values reach the browser. Only the public key (`pk_`) and the API address go there. The sync
  key (`INFERATIVE_MANIFEST_TOKEN`, `ak_`) is a secret: only `pnpm sync:manifest` reads it.

## State file

The keys of this starter, beside the shared keys:

```json
{
  "apiBaseUrl": "https://cms.example.com/api",
  "ids": { "channel": "<channel id>", "channelIdentifier": "<identifier>" }
}
```

## Phases

| # | Phase id | Done when | Details |
| :-- | :-- | :-- | :-- |
| 4 | `channel` | You hold the API address, the channel id, the Identifier and the public key, and the person pasted the sync key into `.env` | "Phase 4: the channel" |
| 5 | `env` | The check of phase 5 shows each name as `set` | "Phase 5: `.env`" |
| 6 | `sync` | `pnpm check:manifest`, `pnpm sync:manifest --first-sync` and `pnpm sync:manifest` each exit 0 | "Phase 6: the manifest" |
| 7 | `first-page` | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` prints `200` under `pnpm dev` | "Phase 7: the first page" |
| 8 | `build` | `pnpm typecheck` and `pnpm build` exit 0, and the built server answers `200` on `/` | "Phase 8: the build" |
| 9 | `github` | The repository exists and `main` is pushed | "Phase 9: GitHub" |

After phase 9, tell the person the local address and how the build runs ("Daily work").

## Phase 4: the channel

Ask the person for the address of the dashboard. The API address is the origin of the dashboard with `/api` at the end,
for example `https://cms.example.com/api`. Write it to `apiBaseUrl`.

Make `.env` (`references/setup-env.md`, "Make `.env`").

Tell the person (browser step):

1. In the dashboard, open **Settings**, then **Channels**, and select **New channel**. Enter a **Name**, choose the
   **Kind** `Website`, and select **Create and set up**. Send me the **Identifier**: it is the namespace of the content
   types. It is not a secret.
2. On the **Settings** tab of the channel, add the address of this website under **Advanced: allowed origins**
   (`http://localhost:3000` for the local run, and the deployed address later).
3. On the **Overview** tab, select **Open the guide** in the step **Next step: connect the website**. Send me the
   **Channel ID** and the public key (`pk_`). Neither is a secret. If the guide shows no public key, open **Keys**,
   select **New key**, then **Make key**.
4. In the same guide, select **Create the sync key**, choose how long it works, and copy the secret (`ak_`) at once. It
   holds `channels:manifest` and `channels:read`. The dashboard shows it one time only. Open `.env` in an editor and
   paste it after `INFERATIVE_MANIFEST_TOKEN=`, with no quotes. Save. Do not send it to me.
5. Tell me when it is done.

Write `waiting` in the state file, then end your turn. Write the Channel ID to `ids.channel` and the Identifier to
`ids.channelIdentifier`.

## Phase 5: `.env`

Set the lines that hold no secret with `set_env` (`references/setup-env.md`). Each call must exit 0:

| Variable | Value |
| :-- | :-- |
| `NUXT_PUBLIC_INFERATIVE_API_BASE_URL` | `apiBaseUrl` |
| `NUXT_PUBLIC_INFERATIVE_CHANNEL_KEY` | the public key (`pk_`) |
| `INFERATIVE_SITE_CHANNEL_ID` | `ids.channelIdentifier` (the Identifier, not the Channel ID) |
| `INFERATIVE_SITE_NAME` | the display name of the website |
| `INFERATIVE_SITE_SYNC_CHANNEL_ID` | `ids.channel` (the Channel ID) |
| `INFERATIVE_SITE_SYNC_API_BASE_URL` | `apiBaseUrl` |

Check. It prints names and states, never a value:

```sh
for name in NUXT_PUBLIC_INFERATIVE_API_BASE_URL NUXT_PUBLIC_INFERATIVE_CHANNEL_KEY INFERATIVE_SITE_CHANNEL_ID INFERATIVE_SITE_NAME INFERATIVE_SITE_SYNC_CHANNEL_ID INFERATIVE_SITE_SYNC_API_BASE_URL INFERATIVE_MANIFEST_TOKEN; do
  if grep -Eq "^$name=.+" .env; then printf '%s set\n' "$name"; else printf '%s missing\n' "$name"; fi
done
if grep -Eq '^NUXT_PUBLIC_[A-Z_]*=ak_' .env; then printf 'sync key in a public value\n'; fi
printf 'env check: end\n'
```

The phase is done when the output ends with `env check: end`, every name reads `set`, and no line reads
`sync key in a public value`. That line means that the sync key went into a value that the browser reads: ask the
person to move it to `INFERATIVE_MANIFEST_TOKEN` in an editor.

## Phase 6: the manifest

1. Run `pnpm check:manifest`. It audits `shared/site.ts` with no network and no key. It must exit 0.
2. Run `pnpm sync:manifest --first-sync`. A new channel refuses `sharedSection` until it has served a first schema, so
   the first sync publishes the catalog of `firstSyncSectionTypes` in `shared/site.ts`, which leaves that section out.
   It waits until the channel serves it, and must exit 0. A refused key: the person makes a new sync key (phase 4,
   step 4).
3. Run `pnpm sync:manifest`. It publishes the whole catalog of `shared/site.ts` and waits until the channel serves it.
   It must exit 0. Each later sync uses `pnpm sync:manifest` only.

## Phase 7: the first page

1. Tell the person (browser step): in the dashboard, open the content of the channel, create a page with a title, a
   slug and some sections, publish it, and place it in the page tree of the channel (the root page answers `/`). Tell
   me when it is done. Write `waiting` in the state file, then end your turn.
2. Run `pnpm dev` in the background. Wait until `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` prints
   `200`. `http://localhost:3000/api/latest-posts` answers the newest posts as JSON.
3. Tell the person to open http://localhost:3000 and look at the page. Stop the background `pnpm dev`.

An address that no page answers shows a `404` page. When the API does not answer, the home page shows an error state
and every other page answers `503`: check `NUXT_PUBLIC_INFERATIVE_API_BASE_URL` and the allowed origins of the channel.

## Phase 8: the build

1. Run `pnpm typecheck`. It must exit 0.
2. Run `pnpm build`. It writes a Node server to `.output/`.
3. Start it in the background: `node --env-file=.env .output/server/index.mjs`. Wait until
   `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` prints `200`. Stop it.

## Phase 9: GitHub

Do "Create the repository" and "Commit and push" of `references/setup-github.md`. The website has no workflow and no
database, so it reads no secret: skip the check of the organization secrets (step 2 of "Create the repository"), and
set no repository secret.

## Daily work

The rules about secrets of `references/setup.md` apply here too: never show a value of `.env`.

- **Change the content types.** Edit `shared/site.ts`. Run `pnpm check:manifest`, then `pnpm sync:manifest`.
- **Change the look.** Edit the components of `app/components/sections/`. A section type of `shared/site.ts` draws
  through the component that `app/app.vue` registers for its key.
- **Deploy.** "Build and run with Node" and "Other platforms" in `README.md`. Give the deployed site the two
  `NUXT_PUBLIC_` values as public variables. Give the sync key to the deploy step only, as a secret, and run
  `pnpm sync:manifest` there before the deploy. Add the deployed address to the allowed origins of the channel, and set
  it as the **Preview** address of the channel for the visual editor.
- **The read cache.** "The read cache" in `README.md` lists its limits and its settings.
