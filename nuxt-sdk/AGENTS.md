# Agent instructions: Inferative website

This is a Nuxt website that reads one channel of an [Inferative](https://inferative.dev) deployment over HTTP, with
`@inferative/sdk`. Read the Inferative skill before you write code: `npx skills add https://inferative.dev`. It covers
the site SDK.

## Rules that matter here

- The website has no Inferative layer, no dashboard, no Heximon app and no database. Do not add one to this project:
  the content and its editors live in the dashboard of the deployment.
- `shared/site.ts` declares the content types. After each change, run `pnpm check:manifest`, then `pnpm sync:manifest`.
- A page reads content with the composables of `@inferative/sdk/nuxt` (`useSitePage`, `useContent`, `useSiteCache`,
  `useSiteHead`, `useSiteSchema`), which need no import. Await each read during setup, so the server render carries
  the answer.
- A section type of `shared/site.ts` draws through the component that `app/app.vue` registers for its key.
- A type key in a read is the channel's key: `useSiteSchema().typeKey("post")` on a page, `TypeKey.normalize` on the
  server.
- Server code goes in `server/`. It reads the API with `Inferative.client(...)` (`@inferative/sdk/client`).
- `runtimeConfig.public` reaches the browser. Never put a secret there. The sync key (`INFERATIVE_MANIFEST_TOKEN`) is
  read by the command line only.
- Never commit a secret. Put values in `.env`.
- Never silence a type error with `as any`.

## Commands

```sh
pnpm dev              # run the website at http://localhost:3000
pnpm typecheck        # type-check the Vue files and the server
pnpm build            # build the Node server into .output/
pnpm check:manifest   # audit shared/site.ts (no network)
pnpm sync:manifest    # publish shared/site.ts to the channel
```
