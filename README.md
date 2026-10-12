# Inferative starters

The templates that `inferative init` (and `npm create inferative`) create a project from. Each folder is a complete
Inferative site: install it, run it, and start editing.

## Starters

| Starter | What you get |
| :-- | :-- |
| `nuxt-cloudflare` | One Nuxt app and one Cloudflare Worker. The public site is at `/`. The dashboard is at `/admin`. The database is Postgres or MySQL, reached through Hyperdrive. |

## Set up a client site with an agent

The skill `client-site-setup` sets up a whole client site from an empty folder: the project, the database, the
secrets, the GitHub repository, the preview Worker and the live Worker. It needs nothing on the machine first. Install
it, open an empty folder in your agent, and write "Create an Inferative client site":

```sh
npx skills add https://inferative.dev --skill client-site-setup
```

The skill stops at each browser step and says where to go. It keeps its progress in `.inferative/setup.json`, and it
never asks for a secret in the chat. The source of the skill is `docs/skills/client-site-setup/` in the
`inferative/inferative` repository. The docs site serves it at `https://inferative.dev/.well-known/skills/`.

## Create a project

```sh
npx inferative init my-site
```

The command needs read access to the `@inferative` and `@heximon` packages on GitHub Packages. It asks giget for the
branch `v<major.minor>` of its own version first, and for `main` second. Download a starter without the command:

```sh
npx giget gh:inferative/starters/nuxt-cloudflare my-site
```

## For maintainers

These folders live in `starters/` of the `inferative/inferative` repository. A tagged release copies them to the
public repository `inferative/starters`: one commit on `main`, and the branch `v<major.minor>` moved to it. Do not
edit the public repository.

- `pnpm check:starters` checks the files of each starter without a build (no workspace specifier, ranges that match
  the catalog, every import listed, the overrides of `pnpm-workspace.yaml`). It also checks that each repository path,
  `pnpm` script and `.env` key that the skill `client-site-setup` names exists in the starter, and the name and the
  description of every skill in `docs/skills/`.
- `pnpm starters:build` copies a starter to `.starters-work/`, links it to the workspace packages and builds it: the
  compile, the type check, the first migration, the Workers build, `wrangler deploy --dry-run` for the live and the
  preview Worker, the starter's own test, and a first run with a published home page.
