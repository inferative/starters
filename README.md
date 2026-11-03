# Inferative starters

The templates that `inferative init` (and `npm create inferative`) create a project from. Each folder is a complete
project: install it, run it, and start editing.

## Starters

| Starter | What you get |
| :-- | :-- |
| `nuxt-cloudflare` | One Nuxt app and one Cloudflare Worker. The public site is at `/`. The dashboard is at `/admin`. The database is Postgres or MySQL, reached through Hyperdrive. |
| `dashboard-cloudflare` | The Inferative dashboard with every capability, as one Nuxt app and one Cloudflare Worker. The dashboard is at `/`. The database is Postgres, reached through Hyperdrive. The first run starts empty. |
| `nuxt-sdk` | A plain Nuxt website with its own server, for a site whose content lives in a running Inferative deployment. It reads one channel over HTTP with `@inferative/sdk`. It has no dashboard, no database and no Inferative layer, and it builds a Node server by default. |

## Set up a project with an agent

The `inferative` skill sets up a project from a starter: the project, the database, the secrets, the GitHub
repository and the Workers. It needs nothing on the machine first. Install it, open a folder in your agent, and write
"Create an Inferative client site" or "Deploy the Inferative dashboard":

```sh
npx skills add https://inferative.dev --skill inferative --global
```

`--global` installs the skill in your user folder, so every project can use it. On a machine with no Node, the agent
fetches the files of the skill with `curl`:
https://inferative.dev/docs/getting-started/build-with-an-agent#install-without-node gives the commands.

The setup adapts to the starter. The skill holds the shared steps (`docs/skills/inferative/references/setup.md` in the
`inferative/inferative` repository), and each starter holds its own phases and daily work in `SETUP.md`. In a new
folder the agent lists the starters and asks which one. The setup stops at each browser step and says where to go. It
keeps its progress in `.inferative/setup.json`, with the name of the starter, and it never asks for a secret in the
chat. The docs site serves the skill at `https://inferative.dev/.well-known/skills/`.

## Create a project

```sh
npm create inferative@latest my-site
npm create inferative@latest my-dashboard -- --starter dashboard-cloudflare
npm create inferative@latest my-website -- --starter nuxt-sdk
```

The command needs read access to the `@inferative` and `@heximon` packages on GitHub Packages. It asks giget for the
branch `v<major.minor>` of its own version first, and for `main` second. A snapshot of the command asks for the tag
`v<version>` of its snapshot before both. Download a starter without the command:

```sh
npx giget gh:inferative/starters/nuxt-cloudflare my-site
```

## For maintainers

These folders live in `starters/` of the `inferative/inferative` repository. A tagged release copies them to the
public repository `inferative/starters`: one commit on `main`, and the branch `v<major.minor>` moved to it. A snapshot
release pushes its commit under the tag `v<version>` and moves no branch. Do not edit the public repository.

- `pnpm check starters` checks the files of each starter without a build (no workspace specifier, ranges that match
  the catalog, every import listed, the overrides of `pnpm-workspace.yaml`). Each starter needs a `SETUP.md`. The check
  also checks that each repository path, `pnpm` script and `.env` key that the `SETUP.md` of a starter names exists in
  that starter, that each one that a setup reference of the `inferative` skill names exists in one starter, and the name
  and the description of every skill in `docs/skills/`.
- `pnpm tools starters build` copies a starter to `.starters-work/`, links it to the workspace packages and builds it: the
  compile, the type check, the first migration, the Workers build, `wrangler deploy --dry-run` for the live and the
  preview Worker, the proof tests of `tools/repo/starters-proof/<name>/`, and a first run with a published home page.
  `--starter dashboard-cloudflare` builds the dashboard starter: the same steps without the site audit and the preview
  Worker, a check of the bindings and the size of its one Worker, and a first run of the built Worker under
  `wrangler dev` on an empty database that `db:migrate` prepared. `--starter nuxt-sdk` builds the SDK website: the
  site audit, the type check, a Node build, and a start of the built server with an API that does not answer (the home
  page answers 200 with its error state, and its own server route answers 502).
