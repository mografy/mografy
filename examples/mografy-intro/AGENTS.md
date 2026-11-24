# Mografy project instructions

This folder is a Mografy animation project. Animation belongs only in scene modules; `mografy.json` contains settings. Use synchronous `renderFrame(ctx, time, params)` with deterministic seeking. Scenes run only in the browser; do not introduce GSAP, SVG scene layers, resvg, clocks, or previous-frame state. Use `ctx.draw` for common drawing and `ctx.withCanvas` for native Canvas scopes.

Read the shared `mografy` Skill before scene work: its `SKILL.md`, then only the references its table names for the task. Install it in the Mografy workspace with `npx skills add mografy/mografy` (it lands in `.claude/skills/mografy` and `.agents/skills/mografy`; add `-g` only to install it for every folder); with the Mografy MCP tools connected, `read_guide` serves the same files. Do not create Skill copies inside animation projects.

`scenes/timeline.json` and `colors` in `mografy.json` hold the user's own changes from the editor: read them before changing the film, and never write them by hand. The project's `style.md` records its design and motion decisions; read it before every change.

Storyboards label every shot `S01`, `S02`, …; those IDs become the beat titles, `meta.shots` and the layer names, and every layer gets its shot's tag colour. Codex storyboards use image generation; Claude uses Artifacts when available, otherwise a standalone HTML/Canvas preview. Write plans and prompts in English and save project-specific boards under `storyboards/`.

Open the player with `npx mografy dev`. After scene edits, run `npx mografy check --motion` and `npx mografy review`, then inspect the generated PNGs. Export with `npx mografy export --format mp4|webm|mov|lottie|svga` only when requested.

Shared Skill: [Mografy](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/SKILL.md). In a Mografy checkout it is the outer `.agents/skills/mografy/` folder; in a workspace, install it with `npx skills add mografy/mografy` and keep it current with `npx skills update`.
