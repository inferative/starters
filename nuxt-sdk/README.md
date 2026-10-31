# Inferative website

A website with its own markup and its own server, on [Nuxt](https://nuxt.com). It reads the content of one channel of
an Inferative deployment over HTTP, with `@inferative/sdk`. It has no dashboard, no database and no Inferative layer:
the content and the editors live in the dashboard of the deployment.

| File | What it does |
| :-- | :-- |
| `nuxt.config.ts` | Adds the `@inferative/sdk/nuxt` module and holds the public API block (`runtimeConfig.public.inferative`). |
| `shared/site.ts` | Declares the content types of the website. The manifest sync publishes them to the channel. |
| `app/pages/index.vue` | Lists the published posts. |
| `app/pages/[slug].vue` | Shows one post. |
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
7. **Write a post.** In the dashboard, open the content of the channel, create a post with a title, a slug and a body,
   and publish it.
8. **Run it.** Run `pnpm dev` and open http://localhost:3000. The post is in the list, and `/<slug>` shows it.
   http://localhost:3000/api/latest-posts answers the newest posts as JSON.

When the API does not answer, the home page shows an error state, a post page answers `503`, and
`/api/latest-posts` answers `502` (or `503` when `NUXT_PUBLIC_INFERATIVE_API_BASE_URL` is empty).

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
