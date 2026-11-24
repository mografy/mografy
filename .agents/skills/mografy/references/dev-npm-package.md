# The `mografy` npm package

Read this before changing how Mografy is packed, installed or released.

A second way to install Mografy, for people who only make films: `npm install -g mografy`. The source checkout
(README, Get started) stays the way to work on Mografy itself, and both can live on one computer: inside a checkout
installed on this computer, the package's `mografy` command runs that checkout instead.

## What is in it

`apps/cli/pack.mjs` assembles the package from a built checkout:

| Path | Contents |
| --- | --- |
| `bin/mografy.js` | The command |
| `lib/node_modules/@mografy/*` | The six workspace packages, vendored as built: `dist/` without sourcemaps, plus the server's built-in components and previews, the CLI's `bin/`, and the player's `web/dist` |
| `examples/` | `catalog.json` only; every reference film, the intro included, downloads on demand |

npm installs the third-party dependencies beside them (esbuild, protobufjs, ws, zod). There is no install script and no
browser library: Mografy drives Chromium over the DevTools Protocol and renders in the Chrome or Edge already on the
computer (or Playwright's headless shell, when one is installed). FFmpeg downloads the first time a video export needs
it, into `~/.mografy/tools`; the headless shell downloads (through `npx playwright-core`, into Playwright's browser
folder) only on a computer with no Chromium at all. Both are shared by every installation; `npx mografy setup` fetches
them ahead of time. Templates,
helpers and reference films download from GitHub at the release tag `v<version>`, falling back to `main`.

The packages are vendored under `lib/node_modules` rather than declared as `bundleDependencies`: a global npm install
of a package with bundled dependencies installs every platform's optional esbuild binary (about 280 MB).

`installation` in `@mografy/server` recognises the layout (`kind: 'package'`): projects go to `~/Mografy`,
`mografy update` checks the npm registry and prints the update command.

The package carries no Skill: `init` does not write one and only prints the install command. Users install it in the
workspace with `npx skills add mografy/mografy` (`-g` for every folder) and update it with `npx skills update`. The extras
(`extras/`, git-tracked files only) ship inside the package, so `npx mografy add <helper>` works offline.
`init` always prints that command; `npx mografy dev` prints it when neither the workspace nor the home folder has a Skill.

## Check it

```sh
pnpm build
pnpm pack:cli        # apps/cli/dist/mografy-<version>.tgz, with its packed and unpacked size; fails above 12 MB
pnpm test:package    # pack, npm install -g into a temporary prefix, run version, setup --check, add and check
```

`packages/cli/tests/package.test.ts` (part of `pnpm check`) checks what the tarball contains.

## Release

1. Set `version` in `apps/cli/package.json` (`0.2.0-beta.1` for a beta).
2. `pnpm build && pnpm check && pnpm pack:cli && pnpm test:package`.
3. Tag the commit `v<version>` and push the tag, so the package's downloads find matching files.
4. `npm publish apps/cli/dist/mografy-<version>.tgz --access public` publishes a release under `latest`, which is
   what `npm install -g mografy` and `npx mografy` install. For a beta, add `--tag beta`. A pre-release version checks
   the `beta` tag in `npx mografy update`, a release the `latest` tag.

Users start with `npx mografy@latest init`, `cd mografy` and `npx mografy dev`. `init` creates the workspace `./mografy`
(or `init <folder>`): `projects/`, `examples/`, `templates/` (copied from the package) and the `mografy.workspace.json`
marker, this version's Skill for both hosts (`.agents/skills/mografy`, `.claude/skills/mografy`), and a `package.json`
with a dev dependency on this exact version plus `dev`, `check`, `review` and `export` scripts; then it runs
`npm install`, so `npx mografy dev` runs the workspace's own copy. Nothing is installed globally. `npx mografy@latest init`
in the workspace (or `npx mografy@latest`) moves that copy, the templates and the Skill to the newer version; projects
are kept. `init <name>` inside a workspace creates `projects/<name>`. A source checkout skips the install.
`npm install -g mografy` and `npx skills add mografy/mografy -g` remain the optional global route. See
[configuration.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/configuration.md) for folders and environment variables.
