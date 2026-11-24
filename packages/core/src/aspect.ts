// Aspect-ratio layout for scene meta. Zod-free, so the browser entry shares it.
import type { AspectRatio, SceneMeta } from './scene-meta.js';

/** The meta resized to an exact ratio, keeping short-edge detail near the native size (not yet validated). */
export function aspectSize(meta: SceneMeta, aspectRatio: AspectRatio): SceneMeta {
  const unit = Math.min(480, Math.max(1, Math.round(Math.min(meta.width, meta.height) / 9)));
  const short = unit * 9, long = unit * 16;
  return { ...meta, width: aspectRatio === '9:16' ? short : long, height: aspectRatio === '9:16' ? long : short };
}
