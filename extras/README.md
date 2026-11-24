# Mografy extras

Optional helpers that are **not installed** with Mografy: `cinema`, `cjk`, `three`, `d3`, `p5`, `music`, `walkthrough` and `stage`. The agent copies one into a project only when the film needs it:

```sh
npx mografy add             # list the extras
npx mografy add cinema projects/my-film
```

What each extra contains, when to use it, the files it copies and the rules that come with it are in the Mografy Skill: [extras.md](../packages/core/skill/references/extras.md) (generated into [`.agents/skills/mografy/references/extras.md`](../.agents/skills/mografy/references/extras.md)).
