# Agent instructions: Inferative site

This is an [Inferative](https://inferative.dev) site on [Heximon](https://heximon.dev). Read the two skills before you
write code. The Heximon DI rules differ from NestJS and Angular, and a wrong version often compiles.

- Inferative skill: `npx skills add https://inferative.dev`. It covers the Nuxt layers, the dashboard, and the site SDK.
- Heximon skill: `npx skills add https://heximon.dev`. It covers modules, controllers, and the compile-time DI.

- Setup and daily work: `npx skills add https://inferative.dev --skill client-site-setup`. Its file `references/daily-work.md` covers deploy, release, schema changes, mail and Worker secrets.

## Rules that matter here

- `server/app.module.ts` lists the modules of the site. You own the list: add and delete lines as the site needs.
- Each module needs its persistence module and its tables. Add them to the files of your database setup.
- Both database setups sit in `server/persistence/`, and `heximon.config.ts` pins `root: "AppModule"`. Until the unused setup is deleted, `pnpm heximon:check` warns that its `PersistenceModule` has an unmet `requires`.
- No decorators. Dependencies are constructor parameters. Never silence a type error with `as any`.
- The site serves one origin, so it has no CORS policy and no frame-source policy. The response cache is the one policy, held by a Durable Object.
- Wrangler does not copy bindings into `env.preview`. Write each binding in both places in `nuxt.config.ts`.
- In `env.preview`, `RESPONSE_CACHE_ROOM` keeps `script_name` set to the live Worker's name: both Workers use one response cache. Deploy the live Worker before the first preview deploy.
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
pnpm build           # build the Worker
```
