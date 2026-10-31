# Agent instructions: Inferative dashboard

This is an [Inferative](https://inferative.dev) dashboard on [Heximon](https://heximon.dev). Read the two skills before
you write code. The Heximon DI rules differ from NestJS and Angular, and a wrong version often compiles.

- Inferative skill: `npx skills add https://inferative.dev`. It covers the Nuxt layers, the dashboard, and the packages.
- Heximon skill: `npx skills add https://heximon.dev`. It covers modules, controllers, and the compile-time DI.
- Setup skill: `npx skills add https://inferative.dev --skill dashboard-setup`. It covers the deploy, the secrets and the daily work of this dashboard.

## Rules that matter here

- `server/app.module.ts` lists the modules of the dashboard. You own the list: add and delete lines as the dashboard needs.
- Each module needs its persistence module and its tables. Add them to `server/persistence/pg/`.
- No decorators. Dependencies are constructor parameters. Never silence a type error with `as any`.
- The websites of the channels live on other origins. `INFERATIVE_CHANNELS_ADMINISTRATION_ORIGINS` lists them for the CORS policy and the frame-source policy of `server/app.module.ts`.
- The dashboard Worker runs one cron trigger, every minute, and the schedule runs every job that is due on it. Do not add a cron trigger.
- There are two Workers (README "The two Workers"). The dashboard Worker is the project root: Nuxt, `server/` and every module. The applets Worker is `workers/applets/`: a Heximon host that `vite build` builds, with the applet supervisor and an empty `src/app.module.ts`. Each Worker must stay below 64 MiB, so the applet supervisor (about 24 MiB) stays in the applets Worker. The dashboard Worker is about 14 MiB.
- The browser draws every screen (`dashboard.render: "client"` in `inferative.config.ts`). The dashboard Worker holds no Vue server app. Keep this value: with the server render the Worker is about 23 MiB, and an isolate holds each MiB of code in its heap, below the limit of 128 MB.
- The page shell is a static file of the build (`.output/public/_shell.html`, with `_redirects` and `_headers`): a page document does not start the Worker. The shell starts the boot request `GET /api/_boot`, which brings the session. Do not add a file named `_redirects` or `_headers` to `public/`. The static assets answer each page address with the shell and each file of the build with the file. The first path segments of the Worker's routes (`/api`, `/.well-known`) reach the Worker first, and every other address reaches the Worker after the assets: a missing file answers 404, an unknown address the Worker's page shell. Serve a route of your own below `/api`, never at a new first segment that only the Worker knows at boot.
- The applet supervisor is `workers/applets/src/host-applet.object.ts`. The build of the applets Worker bakes its kit from `cloudflare.forge.kit` of `workers/applets/heximon.config.ts` (`AppletForgeKitConfig`); the supervisor reads it with `loadForgeKit()`. Keep the binding names `APPLET_SUPERVISOR` (SQLite storage) and `APPLET_LOADER`: the packages read them.
- The applets Worker also exports `AttachmentTextEntrypoint` (`workers/applets/src/attachment-text.entrypoint.ts`, named under `cloudflare.entrypoints` of `workers/applets/heximon.config.ts`). The dashboard Worker calls it over the `ATTACHMENT_TEXT` service binding (`services` in `heximon.config.ts`) to read the text of attached PDF and Office files. Keep the binding name: the packages read it.
- The dashboard Worker binds `APPLET_SUPERVISOR` by the name of the applets Worker (`scriptName` in `heximon.config.ts`). Keep that name, and the `service` of `ATTACHMENT_TEXT`, the same as `cloudflare.name` in `workers/applets/heximon.config.ts`. Deploy the applets Worker before the dashboard Worker. The Release workflow does it in that order.
- There is no preview Worker. The Durable Objects hold state that refers to the database, and a preview Worker on it would split that state.
- Never commit a secret. Put values in `.env`, and Worker secrets in `wrangler secret bulk`.
- A migration is never edited by hand. Change `schema.ts` or a module, then run `pnpm db:generate`.
- `heximon.upgrade.json` is generated. Run `pnpm heximon:check --update` and commit the result. Never edit it, and never delete it to clear an error.

## Commands

```sh
pnpm heximon:check   # compile the modules; run it after each change to a module
pnpm typecheck       # type-check the Vue files and the server
pnpm test            # run the tests in test/ (test/dashboard.test.ts is an empty file to start from)
pnpm dev             # run the dashboard at http://localhost:3000
pnpm build           # build the dashboard Worker
pnpm build:applets   # build the applets Worker
```
