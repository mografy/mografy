// What `mografy check` reports about a scene.
import { z } from 'zod';
import { audioSchema } from './project-schema.js';
import type { SceneMeta } from './scene-meta.js';

export type Shot = NonNullable<SceneMeta['shots']>[number];
/** Problems that need the scene's duration: shots the scene cannot reach. */
export function shotIssues(meta: Pick<SceneMeta, 'duration' | 'shots'>): string[] {
  return (meta.shots ?? []).flatMap((shot, i) => [
    ...(shot.end > meta.duration + 1e-6 ? [`Shot ${i + 1} ends at ${shot.end}s, after the scene ends (${meta.duration}s).`] : []),
    ...(shot.stop !== undefined && (shot.stop > shot.end + 1e-6 || shot.stop <= (meta.shots![i - 1]?.end ?? 0) - 1e-6) ? [`Shot ${i + 1} stops at ${shot.stop}s, outside the shot.`] : []),
  ]);
}

/** A storyboard shot ID at the start of a shot title: `S01 Open`. */
export const SHOT_ID = /^S(\d{2,3})(?![\w])/;
const listed = (items: string[], max = 4) => items.slice(0, max).join(', ') + (items.length > max ? ` and ${items.length - max} more` : '');
/**
 * Warnings when a film loses its storyboard labels: shots titled with their IDs (S01, S02…) in film order,
 * and a tag colour on every layer (shotColour(n) for shot Sn, FILM_COLOUR for whole-film layers).
 */
export function shotLabelIssues(meta: Pick<SceneMeta, 'shots' | 'layers'>): string[] {
  const issues: string[] = [];
  const shots = meta.shots ?? [];
  if (!shots.length) issues.push('No meta.shots: list one shot per storyboard shot, titled with its ID ("S01 Open", "S02 …"), so the timeline shows the shots and review checks each one\'s stop frame.');
  else {
    const ids = shots.map(shot => SHOT_ID.exec(shot.title ?? '')?.[1]);
    const missing = ids.flatMap((id, i) => id ? [] : [String(i + 1)]);
    if (missing.length) issues.push(`Shot${missing.length === 1 ? '' : 's'} ${listed(missing)} ${missing.length === 1 ? 'has' : 'have'} no storyboard ID: title every shot with its ID from the storyboard ("S01 Open", "S02 …").`);
    else if (ids.some((id, i) => i > 0 && Number(id) <= Number(ids[i - 1]))) issues.push(`Shot IDs run ${listed(ids.map(id => `S${id}`), 8)}: number the shots in film order, one ID per storyboard shot.`);
  }
  const bare = (meta.layers?.layers ?? []).filter(layer => !layer.colour);
  if (bare.length) issues.push(`${bare.length} layer${bare.length === 1 ? '' : 's'} without a tag colour (${listed(bare.map(layer => layer.name || layer.id))}): set colour to shotColour(n) for the layers of shot Sn and FILM_COLOUR for layers that span the film.`);
  return issues;
}

/** Differences between the tempo a scene is timed to and the project's audio grid. */
export function tempoIssues(meta: Pick<SceneMeta, 'tempo'>, audio?: Pick<z.infer<typeof audioSchema>, 'bpm' | 'offset' | 'beatsPerBar'>): string[] {
  const tempo = meta.tempo;
  if (!tempo || !audio) return [];
  const issues: string[] = [];
  if (Math.abs(tempo.bpm - audio.bpm) > 1e-6) issues.push(`The scene is timed to ${tempo.bpm} BPM (meta.tempo) but the audio is set to ${audio.bpm} BPM.`);
  if (Math.abs((tempo.offset ?? 0) - (audio.offset ?? 0)) > 1e-3) issues.push(`meta.tempo.offset is ${tempo.offset ?? 0}s but audio.offset is ${audio.offset ?? 0}s.`);
  if ((tempo.beatsPerBar ?? 4) !== (audio.beatsPerBar ?? 4)) issues.push(`meta.tempo has ${tempo.beatsPerBar ?? 4} beats per bar but audio has ${audio.beatsPerBar ?? 4}.`);
  return issues;
}

/** Frame budget used by `mografy check`: slower frames make the player stutter. */
export const FRAME_BUDGET = { slowMs: 100, filters: 8 } as const;
/** One summary line and the warnings for a measured frame cost. */
export function frameCostReport(cost: import('./protocol.js').FrameCost): { summary: string; warnings: string[] } {
  const worst = cost.slowest[0], at = (t: number) => `${t.toFixed(1)}s`;
  const summary = `Frame cost at ${cost.width}×${cost.height} (${cost.canvas.toUpperCase()} canvas, ${cost.frames} frames): median ${cost.medianMs} ms`
    + (worst ? `, slowest ${worst.ms} ms at ${at(worst.time)}` : '');
  const warnings: string[] = [];
  if (worst && worst.ms > FRAME_BUDGET.slowMs)
    warnings.push(`Frames take up to ${worst.ms} ms (${cost.slowest.map(s => at(s.time)).join(', ')}), so the player will stutter. Blur layers instead of setting ctx.filter, reuse buffers, and cache paths and text layout (performance reference).`);
  if (cost.maxFilters.count > FRAME_BUDGET.filters)
    warnings.push(`${cost.maxFilters.count} filters were set on the frame context in one frame (${at(cost.maxFilters.time)}). Each blurs every later draw separately: use blurLayer for groups and blurText for type.`);
  if (cost.canvasesPerFrame > 0)
    warnings.push(`renderFrame creates about ${cost.canvasesPerFrame} canvas${cost.canvasesPerFrame === 1 ? '' : 'es'} per frame. Reuse them with buffer() or layer() from @mografy/runtime.`);
  return { summary, warnings };
}
