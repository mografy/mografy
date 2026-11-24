// Skill guidance. The Markdown lives in packages/core/skill/ and is bundled into skill-text.ts at build time;
// this module assembles it into the generated Skill files. Every file under skill/references/ is published as a
// reference automatically: write the Markdown and link it from SKILL.md or another reference, nothing to register here.
// Texts of earlier generated files, kept to recognise unedited old copies, are in guide-legacy.ts.
import { SKILL_TEXT } from './skill-text.js';
import {
  GITHUB_SOURCE, LEGACY_PROJECT_GUIDE, LEGACY_REPOSITORY_SKILL, LEGACY_SKILL, LEGACY_STORYBOARD_SKILL, LEGACY_USER_SCOPE_GUIDE,
  isPreviousProjectPointer, legacySharedProjectGuide, previousPointerGuides,
} from './guide-legacy.js';

const GUIDE_BODY = SKILL_TEXT['references/scene-authoring.md'];
export const SKILL = SKILL_TEXT['SKILL.md'];
export const GUIDE = SKILL_TEXT['project-guide.md'];

/** Every reference, by file name. Ones containing __REPOSITORY__ (and project.md's __INTRODUCTION__) are filled per repository. */
const REFERENCES: Record<string, string> = Object.fromEntries(Object.entries(SKILL_TEXT as Record<string, string>)
  .filter(([file]) => file.startsWith('references/')).map(([file, text]) => [file.slice('references/'.length), text]));

/** References that are the same in every repository: the generated Skill copies them unchanged. */
export const SKILL_REFERENCES: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(REFERENCES)
  .filter(([, text]) => !text.includes('__REPOSITORY__') && !text.includes('__INTRODUCTION__')));

/** Exact matches only: custom instructions, including edited generated files, survive upgrades. */
export function isLegacyAgentFile(contents: string, kind: 'guide' | 'skill', repository?: string) {
  const cancellation = ' Press Ctrl+C to cancel a CLI export. When `mografy dev` is running, player exports also print progress in that terminal and can be stopped with `mografy export [project] --cancel`.';
  const previous = kind === 'guide' ? GUIDE_BODY : LEGACY_SKILL;
  return contents === previous || contents === previous.replace(cancellation, '') ||
    contents === (kind === 'guide' ? LEGACY_PROJECT_GUIDE : LEGACY_REPOSITORY_SKILL) ||
    (kind === 'guide' && contents === LEGACY_USER_SCOPE_GUIDE) ||
    (kind === 'guide' && repository !== undefined && contents === legacySharedProjectGuide(repository)) ||
    (kind === 'guide' && (isPreviousProjectPointer(contents, GUIDE) || contents === projectGuide().replaceAll('mp4|webm|lottie|svga', 'mp4|lottie|svga')
      || previousPointerGuides().includes(contents)));
}

/** Both hosts read one Mografy Skill from the outer .agents folder. */
function skillFilesWithRepositoryLinks(repository: string, introduction = `This skill was generated for the Mografy repository at \`${repository}\`. Use the current checkout's instructions when another checkout is explicitly selected. For an animation project elsewhere, read that project's settings and assets; do not assume it is inside this repository.`): { mografy: Record<string, string> } {
  const references = Object.fromEntries(Object.entries(REFERENCES).map(([name, text]) =>
    [`references/${name}`, text.replaceAll('__REPOSITORY__', repository).replaceAll('__INTRODUCTION__', introduction)]));
  return { mografy: { 'SKILL.md': SKILL, ...references } };
}

/** Published guidance is identical in every checkout and never embeds a developer's disk paths. */
export function sharedSkillFiles(_repository?: string) {
  const files = skillFilesWithRepositoryLinks(GITHUB_SOURCE,
    'Canonical sources are on [GitHub](https://github.com/mografy/mografy). Resolve local files from the current checkout, never from a path in another installation. For an animation project elsewhere, read that project\'s settings and assets; do not assume it is inside this repository.',
  );
  for (const [file, contents] of Object.entries(files.mografy)) {
    const base = `${GITHUB_SOURCE}/.agents/skills/mografy/${file}`;
    files.mografy[file] = contents.replace(/\]\(([^)]+)\)/g, (_, link: string) => `](${new URL(link, base).href})`);
  }
  return files;
}

function skillPointer(guide: string, source: string) {
  return guide + `
Shared Skill: [Mografy](${source}/.agents/skills/mografy/SKILL.md). In a Mografy checkout it is the outer \`.agents/skills/mografy/\` folder; in a workspace, install it with \`npx skills add mografy/mografy\` and keep it current with \`npx skills update\`.
`;
}

export function projectGuide(_repository?: string) {
  return skillPointer(GUIDE, GITHUB_SOURCE);
}

/** Exact previous generated files, used only to remove the former separate storyboard Skill. */
export function obsoleteStoryboardFiles(repository: string): Record<string, string> {
  const current = skillFilesWithRepositoryLinks(repository).mografy;
  const files: Record<string, string> = { 'SKILL.md': LEGACY_STORYBOARD_SKILL };
  // The files that Skill shipped with; every other reference is newer and must not be removed.
  for (const name of ['scene-authoring', 'storyboard', 'animation-principles', 'video-compression', 'project']) files[`references/${name}.md`] = current[`references/${name}.md`]!;
  files['references/project.md'] = files['references/project.md']!.replace(
    "One `mografy` Skill lives in the source repository's outer `.agents/skills/` folder, with scene, storyboard, animation-principle, and project references. Codex reads it there; the root `.claude/skills/mografy` symlink points Claude to the same folder. Root `CLAUDE.md` also imports the shared Skill. Never create Skill folders inside animation subprojects.",
    "Skills live in the source repository's outer `.agents/skills/` folder. Codex and Claude share `mografy` and `mografy-storyboard` there, with local references. Never create Skill folders inside animation subprojects. Root `AGENTS.md` routes Codex; root `CLAUDE.md` imports the same shared Skill for Claude.",
  );
  return files;
}
