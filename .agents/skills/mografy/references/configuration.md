# Configuration: install, workspace, folders and environment

Read this when the user asks how Mografy is installed or updated, where projects, examples or renders go, why the command or the MCP server finds the wrong project, or what an environment variable does. Most films need none of it: a workspace made with `npx mografy@latest init` works without any configuration.

## Ways Mografy is installed

| Install | How | Where Mografy runs from | Skill |
| --- | --- | --- | --- |
| **Workspace** (the default) | `npx mografy@latest init` makes `./mografy` (or `init <folder>`), then `cd mografy`, `npx mografy dev` | The workspace's own `node_modules/mografy`; nothing global | Installed separately in the workspace with `npx skills add mografy/mografy` (`.claude/skills/mografy`, `.agents/skills/mografy`); `init` prints the command |
| **Global package** (optional) | `npm install -g mografy` | The global package | Install with `npx skills add mografy/mografy -g`; update with `npx skills update` |
| **Source checkout** (developing Mografy) | `git clone`, `pnpm install` | The checkout's own build; `npx mografy` inside it runs the checkout's `bin` | Generated into `.agents/skills/mografy` by `pnpm build`; `.claude/skills/mografy` links to it |

Update a workspace with `npx mografy@latest init` inside it: Mografy and its extras move to the newer version (the Skill with `npx skills update`), and projects, showcase films, examples and installed templates stay as they are. `npx mografy update --check` reports whether a newer version exists. In an init'd folder the bare `mografy` command is not on PATH, so write every command as `npx mografy …` (or the workspace's `npm run dev`, `check`, `review`, `export` scripts).

With the MCP server connected (`npx mografy mcp`), the `read_guide` tool serves this same Skill, so an agent without the Skill installed can still read it ([mcp.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/mcp.md)).

## The workspace

A workspace is marked by `mografy.workspace.json` at its root. Nothing is installed in its folders at first; the player lists all four on the left, plus the built-in components:

| Folder | Holds |
| --- | --- |
| `projects/` | The user's own films; new projects go here. The sixteen built-in components live hidden in `projects/.components` |
| `showcase/` | Showcase films added with `npx mografy add showcase/ <film>` |
| `examples/` | Reference films added with `npx mografy add examples/ <film>`; study them, never edit them ([examples.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/examples.md)) |
| `templates/` | Templates the user installed with `npx mografy add templates/ <template>…` (listed in `templates/installed.json`); empty after init ([templates.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/templates.md)) |

`npx mografy add` takes the target folder first when it ends with `/`: `npx mografy add projects/ <film>` copies a film into `projects/<film>`. `npx mografy add <template…> projects/<name>` starts a film from templates.

`npx mografy init <name>` inside a workspace creates a new project in `projects/<name>`. Mografy finds the workspace by walking up from the current folder (also from `MOGRAFY_PROJECT`), so commands and the MCP server started anywhere inside it use it.

## Where things go

- **New projects:** `$MOGRAFY_HOME`, else `projects/` in the checkout or workspace, else `~/Mografy` (the global package outside a workspace).
- **Films** from `npx mografy add <folder>/ <film>`: that folder (`showcase/`, `examples/` or `projects/`). Without a folder, showcase films go to `showcase/` and reference films to `examples/` in a workspace, else the projects folder.
- **Templates:** `templates/` in a workspace, downloaded on `npx mografy add templates/ <template>`; a film started from templates gets its own copies.
- **Exports:** the project's `renders/`. Names given with `-o` must be file names or relative paths inside `renders/`. Exports work in the project's `.mografy/tmp/`, which the project's `.gitignore` excludes.
- **Paths** on the command line resolve from the terminal's current folder. `npx mografy dev` opens the project in the current folder when it has `mografy.json`; in a workspace with no project named it opens the empty workspace view, otherwise the last project used by that installation.
- **State:** each installation keeps its recent projects and active player under `~/.mografy/installations/`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `MOGRAFY_HOME` | Folder for new projects, overriding the workspace's `projects/` |
| `MOGRAFY_WORKSPACE` | The workspace to use, when it cannot be found from the current folder (for example in an MCP client's settings) |
| `MOGRAFY_PROJECT` | Default project when no path is passed; explicit paths win. MCP clients set it to the user's folder |
| `MOGRAFY_STATE` | State folder; sharing one across installations shares their history and active player |
| `MOGRAFY_FFMPEG` | FFmpeg executable. Without it, video exports use an FFmpeg Mografy downloaded earlier, else `ffmpeg` on PATH when it has every encoder Mografy uses (libx264, libx265, libvpx-vp9, prores_ks, AAC), else they download a pinned static build (about 20–30 MB, checked by SHA-256) on the first export. `npx mografy setup` downloads it ahead of time; `npx mografy setup --check` shows which one is used. Point it at a build with the GPU's encoders (NVENC, Quick Sync, AMF, VA-API) when the downloaded one lacks them; the `fast` preset uses whichever works |
| `MOGRAFY_SYSTEM_FFMPEG` | `0` never uses the `ffmpeg` on PATH. A workspace's own copy of Mografy sets it, so its exports do not depend on PATH |
| `MOGRAFY_BROWSER` | Chromium-based browser to render in (path to its executable). Without it: Playwright's headless shell when installed, else Google Chrome, Microsoft Edge or Chromium from their usual locations, else the headless shell is downloaded once. `PLAYWRIGHT_CHANNEL=chrome` or `msedge` picks the installed Chrome or Edge |
| `MOGRAFY_TOOLS` | Folder for downloaded tools (default `~/.mografy/tools`, shared by every installation). A workspace's own copy uses `node_modules/.cache/mografy/tools` and, only without Chrome or Edge, a Chromium shell in `node_modules/.cache/mografy/browsers` |
| `MOGRAFY_CANVAS` | `cpu` (default) or `gpu`: canvas backing for headless rendering, checks and review. Video exports follow `render.canvas` instead (the `fast` preset sets `gpu`). `cpu` gives identical pixels on every machine; `gpu` uses Metal on macOS and Direct3D 11 on Windows, and its edges may differ slightly |

Export settings under `render` in `mografy.json` are in [output.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/output.md#export-settings).
