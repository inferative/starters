# Agent instructions: Inferative dashboard

This is an [Inferative](https://inferative.dev) dashboard on [Heximon](https://heximon.dev). Read the two skills before
you write code. The Heximon DI rules differ from NestJS and Angular, and a wrong version often compiles.

- Inferative skill: `npx skills add https://inferative.dev`. It covers the Nuxt layers, the dashboard, and the packages.
- Heximon skill: `npx skills add https://heximon.dev`. It covers modules, controllers, and the compile-time DI.
- Setup skill: `npx skills add https://inferative.dev --skill dashboard-setup`. It covers the deploy, the secrets and the daily work of this dashboard.

## Rules that matter here

- `server/app.module.ts` lists the modules of the dashboard. You own the list: add and delete lines as the dashboard needs.
- `server-split/app.module.ts` repeats that list without `VisualEditingModule`, for the split topology (`INFERATIVE_WORKERS=visual-editing`, README "One Worker or more"). Change both lists together.
- Each module needs its persistence module and its tables. Add them to `server/persistence/pg/`.
- No decorators. Dependencies are constructor parameters. Never silence a type error with `as any`.
- The websites of the channels live on other origins. `INFERATIVE_CHANNELS_ADMINISTRATION_ORIGINS` lists them for the CORS policy and the frame-source policy of `server/app.module.ts`.
- The Worker runs one cron trigger, every minute, and the schedule runs every job that is due on it. Do not add a cron trigger.
- The Worker must stay below 64 MiB. Read the size after `pnpm build` with `pnpm exec wrangler deploy --dry-run --config .output/server/wrangler.json`. The applet supervisor is about 21 MiB of it: `INFERATIVE_WORKERS=applets` moves it to the Worker of `workers/applets/` (README "One Worker or more").
- The applet supervisor is `server/applets/host-applet.object.ts`. The build bakes its kit into `server/applets/forge-kit.generated.js`: never commit or edit that file. `workers/worker-topology.ts` names its bindings `APPLET_SUPERVISOR` (SQLite storage) and `APPLET_LOADER`: keep the names, the packages read them.
- A deploy that adds `applets` to `INFERATIVE_WORKERS` or removes it runs `pnpm transfer:durable-objects` after the builds and the deploy of the Worker of the visual editor, and before the other deploys: it moves the applets, with their data, to the Worker that the setting names. The Release workflow does it. Never deploy such a switch without it (README "Switch a deployed dashboard").
- `workers/worker-topology.ts` holds the name of the dashboard Worker (`dashboardWorker`) and of each part's Worker.
- There is no preview Worker. The Durable Objects hold state that refers to the database, and a second Worker on it would split that state.
- Never commit a secret. Put values in `.env`, and Worker secrets in `wrangler secret bulk`.
- A migration is never edited by hand. Change `schema.ts` or a module, then run `pnpm db:generate`.
- `heximon.upgrade.json` is generated. Run `pnpm heximon:check --update` and commit the result. Never edit it, and never delete it to clear an error.

## Commands

```sh
pnpm heximon:check   # compile the modules; run it after each change to a module
pnpm typecheck       # type-check the Vue files and the server
pnpm test            # run the tests in test/ (test/dashboard.test.ts is an empty file to start from)
pnpm dev             # run the dashboard at http://localhost:3000
pnpm build           # build the Worker
```
