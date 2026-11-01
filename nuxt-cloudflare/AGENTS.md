# Agent instructions: Inferative site

This is an [Inferative](https://inferative.dev) site on [Heximon](https://heximon.dev). Read the two skills before you
write code. The Heximon DI rules differ from NestJS and Angular, and a wrong version often compiles.

- Inferative skill: `npx skills add https://inferative.dev`. It covers the Nuxt layers, the dashboard, and the site SDK.
- Heximon skill: `npx skills add https://heximon.dev`. It covers modules, controllers, and the compile-time DI.

- Setup and daily work: `npx skills add https://inferative.dev --skill client-site-setup --global`, in the user folder. Its file `references/daily-work.md` covers deploy, release, schema changes, mail and Worker secrets.

## Rules that matter here

- `server/app.module.ts` lists the modules of the site. You own the list: add and delete lines as the site needs.
- Each module needs its persistence module and its tables. Add them to the files of your database setup.
- Both database setups sit in `server/persistence/`, and `heximon.config.ts` pins `root: "AppModule"`. The unused setup compiles with no warning.
- No decorators. Dependencies are constructor parameters. Never silence a type error with `as any`.
- The browser draws the screens below `/admin` (`dashboard.render: "client"` in `inferative.config.ts`), and the Worker renders the site. The Worker is about 37 MiB of code; Cloudflare takes at most 64 MiB.
- The shell of the screens below `/admin` is a static file of the build (`.output/public/admin/_shell.html`, with `_redirects` and `_headers`): a page document below `/admin` does not start the Worker. Do not add a file named `_redirects` or `_headers` to `public/`, and do not serve a route of your own below `/admin`.
- The site serves one origin, so it has no CORS policy and no frame-source policy. The response cache is the one policy, held in the memory of each isolate (`IsolateResponseCacheModule`).
- The Worker name and the bindings are in `cloudflare` of `heximon.config.ts`. Heximon copies each binding into the preview Worker, the Durable Object bindings of the modules too. Write a binding once.
- `pnpm build` writes the live Worker. `pnpm build:preview` writes the preview Worker. `pnpm deploy:live` and `pnpm deploy:preview` deploy the last build and refuse a bundle of the other Worker (`deploy/assert-worker.mjs`).
- In `environments.preview` of `heximon.config.ts`, `STORAGE_ROOM` keeps `scriptName` set to the live Worker's name: both Workers read the hint that empties the response cache from one room. Deploy the live Worker before the first preview deploy.
- The site has no mail provider: each mail goes to the log. "Send email" in `README.md` adds one.
- Never commit a secret. Put values in `.env`, and Worker secrets in `wrangler secret bulk`.
- A migration is never edited by hand. Change `schema.ts` or a module, then run `pnpm db:generate`.
- `heximon.upgrade.json` is generated. Run `pnpm heximon:check --update` and commit the result. Never edit it.

## Commands

```sh
pnpm heximon:check   # compile the modules; run it after each change to a module
pnpm typecheck       # type-check the Vue files and the server
pnpm test            # run the tests in test/ (test/site.test.ts is an empty file to start from)
pnpm dev             # run the site at http://localhost:3000
pnpm build           # build the live Worker
pnpm build:preview   # build the preview Worker
```
