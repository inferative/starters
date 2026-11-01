# Inferative website

A website with its own markup and its own server, on [Nuxt](https://nuxt.com). It reads the content of one channel of
an Inferative deployment over HTTP, with `@inferative/sdk`. It has no dashboard, no database and no Inferative layer:
the content and the editors live in the dashboard of the deployment.

| File | What it does |
| :-- | :-- |
| `nuxt.config.ts` | Adds the `@inferative/sdk/nuxt` module and holds the public API block (`runtimeConfig.public.inferative`). |
| `shared/site.ts` | Declares the content types (`page`, `menu`, `post`) and the section catalog. The manifest sync publishes them to the channel. |
| `app/app.vue` | Registers the component of each section type and mounts the edit chrome of the visual editor. |
| `app/pages/[...slug].vue` | Every page address, the root included: the page tree names the page, and the file draws its sections, sets the status, the cache headers and the head. |
| `app/components/sections/` | The plain components of the sections, with no UI library. Change them to give the site its own look. |
| `server/api/latest-posts.get.ts` | One route of the website's own server: the five newest posts as JSON. |

## Set up

You need Node 24, pnpm, read access to the `@inferative` and `@heximon` packages on GitHub Packages, and a running
Inferative dashboard where your role can manage channels and API keys.

1. **Create the channel.** In the dashboard, open **Settings**, then **Channels**, and select **New channel**. Enter a
   **Name**, choose the **Kind** `Website`, and select **Create and set up**. Write down the **Identifier**: it is the
   namespace of your content types. On the **Settings** tab of the channel, add the address of this website under
   **Advanced: allowed origins**.
2. **Make the public key.** On the **Overview** tab, select **Open the guide** in the step **Next step: connect the
   website**. Copy the **Channel ID**, the **Dashboard address** and the public key (`pk_`). If the guide shows no
   public key, open **Keys**, select **New key**, then **Make key**.
3. **Make the sync key.** In the same guide, select **Create the sync key**, choose how long it works, and copy the
   secret (`ak_`) at once. It holds `channels:manifest` and `channels:read`. The dashboard shows it one time only.
4. **Fill `.env`.** Copy `.env.example` to `.env`, and fill each value. The comment above each line says what goes
   there. The sync key goes into `INFERATIVE_MANIFEST_TOKEN` only: no `NUXT_PUBLIC_` value may hold it, because the
   browser reads those.
5. **Install.** Run `pnpm install`.
6. **Sync the manifest.** Run `pnpm check:manifest` (no network, no key), then `pnpm sync:manifest`. The sync publishes
   `shared/site.ts` to the channel and waits until the channel serves it. Exit code `0` means it does. Run the sync
   again after each change to `shared/site.ts`.
7. **Write a page.** In the dashboard, open the content of the channel, create a page with a title, a slug and some
   sections, publish it, and place it in the page tree of the channel (the root page answers `/`).
8. **Run it.** Run `pnpm dev` and open http://localhost:3000. The page tree names the page of each address, and the
   site draws its sections. http://localhost:3000/api/latest-posts answers the newest posts as JSON.

An address that no page answers shows a `404` page, and a moved page redirects (`308`) to its current address. When the
API does not answer, the home page shows an error state, every other page answers `503`, and `/api/latest-posts`
answers `502` (or `503` when `NUXT_PUBLIC_INFERATIVE_API_BASE_URL` is empty).

## Visual editing

The dashboard opens the site in a frame and edits a page in place: select a section, change a text, and the frame
draws the change before you save it. `@inferative/sdk/nuxt` brings the browser half of the editor:
`<ASiteEditOverlay>` in `app/app.vue` draws the chrome, `<ASiteEditConnecting>` in the page draws a notice while the
editor connects, and the module serves the page of an entry with no address yet (`/_site/edit-entry`). Each draws
nothing for an ordinary reader. They have a plain look; pass your own words through their `words` prop, or draw your
own chrome over `useSiteEditChrome()`.

An edit render reads the dashboard origins that may frame the site from the API (the domains of the channel's
organization and the deployment's default domain) and holds them for one minute. To allow exactly one list instead,
state it in `nuxt.config.ts` before the build: `inferativeSite: { site: { editorOrigins: ["https://cms.example.com"] } }`.
With no origin known, an edit render answers `frame-ancestors 'none'`. In the dashboard, set the **Preview** address of the
channel to the address of this website.

## The read cache

The server keeps the API's answers, so a page renders fast and still renders when the API is slow or down:

- Within the answer's lifetime (30 seconds for a content read), a render sends no API read.
- After it, a render gets the stored answer at once, and one read refreshes it behind the render.
- When the API fails or does not answer in time, a page that was read before renders from the stored answer for up to
  one day, and the server writes one warning line to its log.
- A preview and an edit render always read the API. The browser has its own cache.

The answers are in memory by default: 1000 answers and 16 MiB. Set the limits and the times in `.env` with the
`NUXT_INFERATIVE_READ_CACHE_*` values, for example `NUXT_INFERATIVE_READ_CACHE_STALE_IF_ERROR_SECONDS=3600`. A site
on more than one server or Worker mounts a shared store (KV, Redis) at `inferative-reads` under `nitro.storage` in
`nuxt.config.ts`. The README of `@inferative/sdk`, "A site with its own markup", lists every setting.

The route `/api/latest-posts` builds its own client, which reads the API each time. To read it through the cache
too, give `Inferative.client` the option `readCache: SiteReadCache.of(event)` (`SiteReadCache` is in
`@inferative/sdk/site`).

## Build and run with Node

```sh
pnpm build
node --env-file=.env .output/server/index.mjs
```

`pnpm build` writes a Node server to `.output/`. It reads the two `NUXT_PUBLIC_` values when it starts, so one build
runs against any deployment. `PORT` sets the port (default 3000). `pnpm preview` starts the same server.

## Other platforms

The build uses the default Nitro preset, a Node server. To build for another platform, set `NITRO_PRESET` when you
build, or `nitro: { preset: "…" }` in `nuxt.config.ts`:

```sh
NITRO_PRESET=cloudflare-module pnpm build
NITRO_PRESET=vercel pnpm build
NITRO_PRESET=netlify pnpm build
```

Each preset writes the files of its platform to `.output/`. The [Nitro deploy guide](https://nitro.build/deploy) lists
every preset and the steps of each platform. Give the deployed site the two `NUXT_PUBLIC_` values as public variables.
Give the sync key to the deploy step only, as a secret, and run `pnpm sync:manifest` there before the deploy.

## Commands

```sh
pnpm dev              # run the website at http://localhost:3000
pnpm typecheck        # type-check the Vue files and the server
pnpm build            # build the Node server into .output/
pnpm preview          # start the built server
pnpm check:manifest   # audit shared/site.ts and measure its manifest (no network)
pnpm sync:manifest    # publish shared/site.ts to the channel
```

## Read more

- The SDK: the `README.md` of `@inferative/sdk` (`node_modules/@inferative/sdk/README.md`), "A site with its own
  markup" and "One client".
- The command line: `pnpm exec inferative site --help`.
- The docs: https://inferative.dev/docs.
