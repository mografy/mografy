// Texts of earlier generated Skill and AGENTS.md files. They are matched exactly so that an unedited old copy is
// replaced on upgrade while anything a user changed survives. Add the outgoing text here whenever project-guide.md or
// the Skill pointer changes; never edit these copies.
import { SKILL_TEXT } from './skill-text.js';

const GUIDE_BODY = SKILL_TEXT['references/scene-authoring.md'];
export const GITHUB_SOURCE = 'https://github.com/mografy/mografy/blob/main';

/** project-guide.md as projects received it on 2026-11-21 (0.1.x), recognised so their unedited AGENTS.md is replaced. */
export const GUIDE_2026_11 = `# Mografy project instructions

This folder is a Mografy animation project. Animation belongs only in scene modules; \`mografy.json\` contains settings. Use synchronous \`renderFrame(ctx, time, params)\` with deterministic seeking. Scenes run only in the browser; do not introduce GSAP, SVG scene layers, resvg, clocks, or previous-frame state. Use \`ctx.draw\` for common drawing and \`ctx.withCanvas\` for native Canvas scopes.

Read the shared \`mografy\` Skill before scene work: its \`SKILL.md\`, then the references its table names for the task. Codex, Claude Code and other agents install it once with \`npx skills add mografy/mografy -g\`; with the Mografy MCP tools connected, \`read_guide\` serves the same files. Do not create Skill copies inside animation projects.

\`scenes/timeline.json\` and \`colors\` in \`mografy.json\` hold the user's own changes from the editor: read them before changing the film, and never write them by hand. The project's \`style.md\` records its design and motion decisions; read it before every change.

Codex storyboards use image generation; Claude uses Artifacts when available, otherwise a standalone HTML/Canvas preview. Write plans and prompts in English and save project-specific boards under \`storyboards/\`.

Open the player with \`mografy dev\`. After scene edits, run \`mografy check --motion\` and \`mografy review\`, then inspect the generated PNGs. Export with \`mografy export --format mp4|webm|mov|lottie|svga\` when requested.
`;

/** project-guide.md as projects received it until November 2026, recognised so their unedited AGENTS.md is replaced. */
export const PREVIOUS_GUIDE = `# Mografy project instructions

This folder is a Mografy animation project. Animation belongs only in scene modules; \`mografy.json\` contains settings. Use synchronous \`renderFrame(ctx, time, params)\` with deterministic seeking. Scenes run only in the browser; do not introduce GSAP, SVG scene layers, resvg, clocks, or previous-frame state. Use \`ctx.draw\` for common drawing and \`ctx.withCanvas\` for native Canvas scopes.

Codex and Claude share the single \`mografy\` Skill in the Mografy source repository's outer \`.agents/skills/mografy/\` folder. Read its \`SKILL.md\` and the local references relevant to the task: scene authoring, storyboards, animation principles, and project development. Do not create Skill copies inside animation projects. The source repository's root \`.claude/skills/mografy\` entry links Claude to the same Skill.

Codex storyboards use image generation; Claude uses Artifacts when available, otherwise a standalone HTML/Canvas preview. Write plans and prompts in English and save project-specific boards under \`storyboards/\`.

Open the player with \`mografy dev\`. After scene edits, run \`mografy check\` and \`mografy review\`, then inspect the generated PNGs. Export with \`mografy export --format mp4|webm|lottie|svga\` when requested.
`;

/** The GitHub home of the Skill before the repository moved to the mografy organisation. */
export const PREVIOUS_GITHUB_SOURCE = 'https://github.com/zz41354899/mografy/blob/main';

export const LEGACY_SKILL = `---
name: mografy
description: Create, edit, validate, visually review, and export Mografy Canvas scene projects. Use when a folder contains mografy.json or the user asks to build or change a Mografy animation.
---

${GUIDE_BODY}`;

export const LEGACY_REPOSITORY_SKILL = `---
name: mografy
description: Develop Mografy itself or create, edit, validate, visually review, and export Mografy Canvas scenes in this repository.
---

Read [packages/core/src/guide.ts](../../../packages/core/src/guide.ts) completely before editing a Mografy scene. Its \`GUIDE_BODY\` is the single source for the scene file format, runtime constraints, direct-file editing workflow, Chromium checks, visual review criteria, and CLI export flow.

For product code changes, also follow the repository's root \`AGENTS.md\`, \`docs/architecture.md\`, and required test commands.
`;

export const LEGACY_PROJECT_GUIDE = `# Mografy project instructions

This folder is a Mografy project. Animation lives only in scene modules, normally \`scenes/main.ts\`; \`mografy.json\` contains settings. Render with synchronous \`renderFrame(ctx, time, params)\` and keep seeking deterministic. Scene code runs only in the browser; do not introduce GSAP, SVG scene layers, or resvg.

Read the project Skill in \`.agents/skills/mografy/SKILL.md\` (Codex) or \`.claude/skills/mografy/SKILL.md\` (Claude). Both contain the same English workflow and local references. If skill discovery is unavailable, read these references directly:

- [Scene authoring](.agents/skills/mografy/references/scene-authoring.md): required before scene edits; includes \`ctx.withCanvas\`, drawing APIs, runtime constraints, and CLI review.
- [Storyboards](.agents/skills/mografy/references/storyboard.md): project-specific shot planning, Codex image generation, and Claude Artifacts or a local HTML fallback.
- [Animation principles](.agents/skills/mografy/references/animation-principles.md): the twelve principles applied through deterministic Canvas motion.

Open the player with \`mografy dev\`. After scene edits, run \`mografy check\` and \`mografy review\`, then inspect every generated review PNG. Export with \`mografy export --format mp4|lottie|svga\` when requested. Keep storyboards in \`storyboards/\` and out of project animation settings.
`;

export const LEGACY_STORYBOARD_SKILL = `---
name: mografy-storyboard
description: Write project-specific Mografy storyboards and shot lists with visual key poses and animation direction. Use when the user requests a Mografy storyboard, shot breakdown, or visual plan before scene implementation.
---

# Mografy storyboard

Read the project's \`mografy.json\`, scene entry, imported modules, and assets. Use its actual dimensions, palette, fonts, brand artwork, and characters.

- Read [references/storyboard.md](references/storyboard.md) for the English shot list and visual deliverables. In Codex, invoke image generation; in Claude, use Artifacts when available, otherwise write the standalone HTML preview.
- Read [references/animation-principles.md](references/animation-principles.md) to select expressive motion for each shot, with clear anticipation, action, settle, and reading holds.
- Read [references/scene-authoring.md](references/scene-authoring.md) when implementation is requested, and [references/project.md](references/project.md) when working on Mografy itself.

Save the written plan and visual output links under \`storyboards/\`. Keep all plans, shot labels, and prompts in English. Preserve supplied copy and artwork unless the user requests changes. A storyboard-only request delivers the board; implement scene modules when the request also includes animation. Review actual rendered frames separately from conceptual panels.
`;

export const LEGACY_USER_SCOPE_GUIDE = `# Mografy project instructions

This folder is a Mografy project. Animation belongs only in scene modules; \`mografy.json\` contains settings. Use synchronous \`renderFrame(ctx, time, params)\` with deterministic seeking. Scenes run only in the browser; do not introduce GSAP, SVG scene layers, resvg, clocks, or previous-frame state. Use \`ctx.draw\` for common drawing and \`ctx.withCanvas\` for native Canvas scopes.

Read the external \`mografy\` Skill at \`~/.agents/skills/mografy/SKILL.md\` in Codex or \`~/.claude/skills/mografy/SKILL.md\` in Claude Code. Its local references contain the scene contract and animation principles. For shot planning, use the external \`mografy-storyboard\` Skill in the same host directory. Codex uses image generation; Claude uses Artifacts when available, otherwise a standalone HTML/Canvas preview. Write plans and prompts in English and save project-specific boards under \`storyboards/\`.

Never create Skill folders inside this project. If the external Skills are missing, run \`pnpm build\` and \`pnpm sync:skills\` from the Mografy source repository to install them.

Open the player with \`mografy dev\`. After scene edits, run \`mografy check\` and \`mografy review\`, then inspect the generated PNGs. Export with \`mografy export --format mp4|lottie|svga\` when requested.
`;

export const LEGACY_SHARED_PROJECT_GUIDE = `# Mografy project instructions

This folder is a Mografy animation project. Animation belongs only in scene modules; \`mografy.json\` contains settings. Use synchronous \`renderFrame(ctx, time, params)\` with deterministic seeking. Scenes run only in the browser; do not introduce GSAP, SVG scene layers, resvg, clocks, or previous-frame state. Use \`ctx.draw\` for common drawing and \`ctx.withCanvas\` for native Canvas scopes.

Codex and Claude read the same Skills from the Mografy source repository's outer \`.agents/skills/\` folder. Read \`mografy/SKILL.md\` and its local references before scene work. For shot planning, also read \`mografy-storyboard/SKILL.md\`. The shared Skill root is linked below; do not create Skill copies inside animation projects or install duplicate host-specific folders.

Codex uses image generation; Claude uses Artifacts when available, otherwise a standalone HTML/Canvas preview. Write plans and prompts in English and save project-specific boards under \`storyboards/\`.

Open the player with \`mografy dev\`. After scene edits, run \`mografy check\` and \`mografy review\`, then inspect the generated PNGs. Export with \`mografy export --format mp4|lottie|svga\` when requested.
`;

export function legacySharedProjectGuide(repository: string) {
  return LEGACY_SHARED_PROJECT_GUIDE + `
Shared Skills: [Mografy](${repository}/.agents/skills/mografy/SKILL.md) and [Storyboards](${repository}/.agents/skills/mografy-storyboard/SKILL.md). If missing, run \`pnpm build\` and \`pnpm sync:skills\` from \`${repository}\`.
`;
}

export function previousProjectGuide(guide: string, repository: string) {
  return guide + `
Shared Skill: [Mografy](${repository}/.agents/skills/mografy/SKILL.md). If missing, run \`pnpm build\` and \`pnpm sync:skills\` from \`${repository}\`.
`;
}

export function isPreviousProjectPointer(contents: string, guide: string) {
  const match = contents.match(/\nShared Skill: \[Mografy\]\((.+)\/\.agents\/skills\/mografy\/SKILL\.md\)\. If missing, run/);
  if (!match) return false;
  return [guide, PREVIOUS_GUIDE].some(guide => {
    const previous = previousProjectGuide(guide, match[1]!);
    return contents === previous || contents === previous.replaceAll('mp4|webm|lottie|svga', 'mp4|lottie|svga');
  });
}

/** The pointer to the Skill that ends every project's AGENTS.md. */
export function legacySkillPointer(guide: string, source: string, owner: string) {
  return guide + `
Shared Skill: [Mografy](${source}/.agents/skills/mografy/SKILL.md). Inside a Mografy checkout, use its outer \`.agents/skills/mografy/\` folder. Elsewhere, install it once with \`npx skills add ${owner}/mografy -g\` (and keep it current with \`npx skills update\`).
`;
}

/** The project guide from 21 November 2026, when \`npx mografy@latest init\` still wrote the Skill into the workspace. */
export const GUIDE_2026_11_WORKSPACE = `# Mografy project instructions

This folder is a Mografy animation project. Animation belongs only in scene modules; \`mografy.json\` contains settings. Use synchronous \`renderFrame(ctx, time, params)\` with deterministic seeking. Scenes run only in the browser; do not introduce GSAP, SVG scene layers, resvg, clocks, or previous-frame state. Use \`ctx.draw\` for common drawing and \`ctx.withCanvas\` for native Canvas scopes.

Read the shared \`mografy\` Skill before scene work: its \`SKILL.md\`, then only the references its table names for the task. A workspace made with \`npx mografy@latest init\` already has it for Claude Code (\`.claude/skills/mografy\`) and Codex (\`.agents/skills/mografy\`); with the Mografy MCP tools connected, \`read_guide\` serves the same files; elsewhere install it once with \`npx skills add mografy/mografy -g\`. Do not create Skill copies inside animation projects.

\`scenes/timeline.json\` and \`colors\` in \`mografy.json\` hold the user's own changes from the editor: read them before changing the film, and never write them by hand. The project's \`style.md\` records its design and motion decisions; read it before every change.

Storyboards label every shot \`S01\`, \`S02\`, …; those IDs become the beat titles, \`meta.shots\` and the layer names, and every layer gets its shot's tag colour. Codex storyboards use image generation; Claude uses Artifacts when available, otherwise a standalone HTML/Canvas preview. Write plans and prompts in English and save project-specific boards under \`storyboards/\`.

Open the player with \`npx mografy dev\`. After scene edits, run \`npx mografy check --motion\` and \`npx mografy review\`, then inspect the generated PNGs. Export with \`npx mografy export --format mp4|webm|mov|lottie|svga\` only when requested.
`;
/** The pointer that ended AGENTS.md then. */
export function workspaceSkillPointer(guide: string, source: string) {
  return guide + `
Shared Skill: [Mografy](${source}/.agents/skills/mografy/SKILL.md). In a Mografy checkout it is the outer \`.agents/skills/mografy/\` folder; in a workspace, \`npx mografy@latest init\` keeps it current.
`;
}

/** Earlier generated AGENTS.md files, replaced when found unedited: the guide before November 2026 under each pointer it shipped with. */
export function previousPointerGuides() {
  return [
    legacySkillPointer(PREVIOUS_GUIDE, PREVIOUS_GITHUB_SOURCE, 'zz41354899'),
    legacySkillPointer(PREVIOUS_GUIDE, GITHUB_SOURCE, 'mografy'),
    legacySkillPointer(GUIDE_2026_11, GITHUB_SOURCE, 'mografy'),
    workspaceSkillPointer(GUIDE_2026_11_WORKSPACE, GITHUB_SOURCE),
    // Before the Skill was installed with the skills CLI.
    PREVIOUS_GUIDE + `
Shared Skill: [Mografy](${PREVIOUS_GITHUB_SOURCE}/.agents/skills/mografy/SKILL.md). For local work, use the current installation's outer \`.agents/skills/mografy/\` folder. If missing, run \`pnpm build\` and \`pnpm sync:skills\` from your Mografy checkout.
`,
  ].flatMap(guide => [guide, guide.replaceAll('mp4|webm|lottie|svga', 'mp4|lottie|svga')]);
}
