// The catalog of Mografy extras: optional helpers `mografy add <extra>` copies into a project from the package's
// extras/ folder. The CLI copies them; the scene build uses the catalog to name the fix when a scene imports an extra
// the project does not have yet.
export interface ExtraFont { family: string; path: string; weight: number }
export interface Extra {
  summary: string;
  /**
   * [source under extras/, destination in the project]. A `*-demo.ts` is a working tour of the helper: it lands in
   * scenes/ beside it but nothing imports it, so it costs the film nothing until a scene uses it.
   */
  files: [string, string][];
  /** Registered under `fonts` in mografy.json when missing. */
  fonts?: ExtraFont[];
  reference: string;
  next: string;
}
export const EXTRAS: Record<string, Extra> = {
  cinema: {
    summary: 'Camera moves on stills, transitions and atmosphere',
    files: [['cinema/cinema.ts', 'scenes/cinema.ts'], ['cinema/cinema-demo.ts', 'scenes/cinema-demo.ts']],
    reference: 'camera-transitions.md',
    next: "import { plate, move, crossfade, iris, particleWipe, drift } from './cinema.js';",
  },
  cjk: {
    summary: 'Chinese and Japanese typography, vertical text and two Noto CJK subsets (about 9.5 MB)',
    files: [
      ['cjk/cjk.ts', 'scenes/cjk.ts'],
      ['cjk/cjk-demo.ts', 'scenes/cjk-demo.ts'],
      ['cjk/fonts/NotoSansCJKtc-Medium-subset.otf', 'assets/NotoSansCJKtc-Medium-subset.otf'],
      ['cjk/fonts/NotoSerifCJKtc-Bold-subset.otf', 'assets/NotoSerifCJKtc-Bold-subset.otf'],
      ['cjk/fonts/OFL.txt', 'assets/OFL-NotoCJK.txt'],
    ],
    fonts: [
      { family: 'Noto Sans CJK TC', path: 'assets/NotoSansCJKtc-Medium-subset.otf', weight: 500 },
      { family: 'Noto Serif CJK TC', path: 'assets/NotoSerifCJKtc-Bold-subset.otf', weight: 700 },
    ],
    reference: 'cjk-typography.md',
    next: "import { cjkText, verticalText, CJK_SANS, CJK_SERIF } from './cjk.js';",
  },
  three: {
    summary: '3D layers with Three.js r186 (about 0.8 MB)',
    files: [['three/three.ts', 'scenes/three.ts'], ['three/three-demo.ts', 'scenes/three-demo.ts'], ['three/three.module.js', 'assets/three.module.js'], ['three/LICENSE-three.txt', 'assets/LICENSE-three.txt']],
    reference: 'three-d.md',
    next: "import { prepareStage, stage, orbit, studioLight } from './three.js';",
  },
  d3: {
    summary: 'Data visualisation with D3 7.9 on canvas: scales, shapes, layouts, maps, axes (about 0.23 MB)',
    files: [['d3/d3.ts', 'scenes/d3.ts'], ['d3/d3-demo.ts', 'scenes/d3-demo.ts'], ['d3/d3.module.js', 'assets/d3.module.js'], ['d3/LICENSE-d3.txt', 'assets/LICENSE-d3.txt']],
    reference: 'data-viz.md',
    next: "import { loadD3, axis, shape, trimPoints, sweepArcs, tweenData, simulate, positionsAt, seeded } from './d3.js';",
  },
  p5: {
    summary: 'Generative sketches with p5.js 2.4 driven frame by frame (about 1.2 MB, LGPL-2.1)',
    files: [['p5/p5.ts', 'scenes/p5.ts'], ['p5/p5-demo.ts', 'scenes/p5-demo.ts'], ['p5/p5.module.js', 'assets/p5.module.js'], ['p5/LICENSE-p5.txt', 'assets/LICENSE-p5.txt']],
    reference: 'p5-sketch.md',
    next: "import { prepareSketch, sketch, trail } from './p5.js';",
  },
  music: {
    summary: 'Contextual score generator (Python 3 with numpy, ffmpeg for MP3)',
    files: [['music/score.py', 'music-src/score.py'], ['music/music-example.json', 'music-src/music.json']],
    reference: 'music.md',
    next: 'Write music-src/music.json from the film, then: python3 music-src/score.py music-src/music.json assets/music.mp3',
  },
  walkthrough: {
    summary: 'Product walkthroughs: redrawn app screens, cameras, cursor and taps',
    files: [['walkthrough/walkthrough.ts', 'scenes/walkthrough.ts'], ['walkthrough/walkthrough-demo.ts', 'scenes/walkthrough-demo.ts']],
    reference: 'product-walkthrough.md',
    next: "import { createKit, camAt, withCamera, cursorAt, drawCursor } from './walkthrough.js';",
  },
  stage: {
    summary: 'Product UI loops: a script over state, windows and phones, placeholder lines, rolling numbers, looks',
    files: [['stage/stage.ts', 'scenes/stage.ts']],
    reference: 'ui-stage.md',
    next: "import { play, wait, set, click, tap, type, focus, mark, withStage, createKit, look, pin } from './stage.js';",
  },
};

/**
 * The extra whose scene module an import specifier names (`./cinema.js`, `./cinema`, `../scenes/three.ts`), or
 * undefined. Only extras that copy a module into scenes/ can be imported.
 */
export function extraForImport(specifier: string): string | undefined {
  if (!specifier.startsWith('.')) return undefined;
  const base = specifier.split(/[\\/]/).pop()!.replace(/\.[cm]?[jt]sx?$/, '');
  return Object.entries(EXTRAS).find(([, extra]) => extra.files.some(([, to]) => to.startsWith('scenes/') && to.slice(7).replace(/\.ts$/, '') === base))?.[0];
}
