# Mografy

Local Canvas motion design for Claude Code and Codex. Scenes are TypeScript modules drawn as a pure function of time;
`npx mografy dev` previews them live and `npx mografy export` writes MP4, WebM, MOV, Lottie or SVGA.

```sh
npx mografy@latest init   # creates ./mografy: a workspace with Mografy and all its extras inside
cd mografy
npx skills add mografy/mografy   # the agent Skill, in this folder (add -g for every folder)
npx mografy dev           # open the editor (or: npm run dev)
```

The workspace has `projects/` (your films), `examples/` (every reference film), `templates/` (every template) and
`showcase/` (website films: `npx mografy add showcase/ <film>`), and every command run inside it defaults to it.
Init fills `examples/` and `templates/` from the package, offline; `npx mografy dev` shows the folders on the left and opens nothing until you pick something. Open Claude Code or Codex in the
`mografy` folder and describe the animation; it is created in `projects/`. Everything lives in that folder: nothing is
installed globally, and deleting the folder removes it. `npx mografy@latest init my-workspace` names the folder.
To update, run `npx mografy@latest init` inside it.

You don't install FFmpeg or Chromium: Chrome or Edge renders checks and exports, and FFmpeg downloads into the
workspace the first time you export a video (a Chromium shell too, only without Chrome or Edge), or ahead of time with
`npx mografy setup`. Extras (cinema, cjk, three, d3, p5, music, walkthrough, stage) come with Mografy, and `npx mografy add <extra> projects/<film>` copies one into a film offline; showcase films download when `npx mografy add` needs them.

Optional, for every folder: `npm install -g mografy` and `npx skills add mografy/mografy -g`.

Documentation and the source: https://github.com/mografy/mografy
