// Export policy: presets, sizes, frame rates and segment planning. Zod-free, so the browser imports it without zod.
import type { ExportFormat, RenderSettings } from './export-settings.js';

export type VideoFormat = Extract<ExportFormat, 'mp4' | 'webm' | 'mov'>;
export const isVideoFormat = (format: ExportFormat): format is VideoFormat => format === 'mp4' || format === 'webm' || format === 'mov';
/**
 * MP4 `crf` and `bitrate` are on the H.264 scale (the numbers existing projects and the quality presets use). Measured
 * on lossless masters of a 3D paper-texture film and a 2D motion film (docs/archive/STATUS-2026.md, 2026-10-31), libx265 at the
 * same CRF matched libx264's quality at 50–58 % of the size, so the CRF carries over unchanged; a two-pass target
 * takes 0.6 of the bitrate, a little above that ratio, so H.265 is never worse than the H.264 target.
 */
export const HEVC_EQUIVALENT = { crfOffset: 0, bitrateScale: 0.6 } as const;
/** The libx265 CRF and bitrate that match these H.264-scale settings. */
export function hevcQuality(settings: Pick<RenderSettings, 'crf' | 'bitrate'>) {
  const [, value, unit] = /^(\d+(?:\.\d+)?)([kM])$/.exec(settings.bitrate)!;
  const kbps = Math.max(1, Math.round(Number(value) * (unit === 'M' ? 1000 : 1) * HEVC_EQUIVALENT.bitrateScale));
  return { crf: Math.min(51, settings.crf + HEVC_EQUIVALENT.crfOffset), bitrate: `${kbps}k` };
}
/** WebM uses quality-based VP9 by default rather than inheriting the MP4 bitrate target. */
export const WEBM_DEFAULTS = { encoding: 'crf', crf: 32, preset: 'medium' } as const;
/**
 * Export presets. `share`: H.264 8-bit, plays everywhere. `high`: H.265 10-bit software encode (the MP4 default).
 * `fast`: the hardware H.265 encoder streamed during capture, GPU-drawn frames. `master`: ProRes 422 HQ in a MOV.
 */
export const EXPORT_PRESETS = {
  share: { format: 'mp4', render: { codec: 'h264', encoding: 'crf', dither: true } },
  high: { format: 'mp4', render: { codec: 'h265', encoding: 'crf', dither: true } },
  fast: { format: 'mp4', render: { codec: 'h265', encoding: 'hardware', hardwareQuality: 65, canvas: 'gpu', adaptiveSamples: false, dither: true } },
  master: { format: 'mov', render: { dither: false } },
} as const satisfies Record<string, { format: 'mp4' | 'mov'; render: Partial<RenderSettings> }>;
export type ExportPreset = keyof typeof EXPORT_PRESETS;
/** The MP4 preset these settings match, if any. */
export function mp4Preset(settings: Pick<RenderSettings, 'codec' | 'encoding'>): Exclude<ExportPreset, 'master'> | undefined {
  if (settings.encoding === 'hardware') return settings.codec === 'h265' ? 'fast' : undefined;
  if (settings.encoding !== 'crf') return undefined;
  return settings.codec === 'h264' ? 'share' : 'high';
}
/** Measured memory one 1080p capture segment holds at its peak (its Chromium page plus its encoder), in bytes. */
export const SEGMENT_MEMORY_1080P = 1.3 * 2 ** 30;
/** Measured memory every export holds whatever its segments: Chromium's browser process and Node. */
export const EXPORT_BASE_MEMORY = 0.9 * 2 ** 30;
/** Share of the computer's memory an `auto` export may plan for, leaving the rest to the system, the player and other apps. */
export const EXPORT_MEMORY_SHARE = 0.4;
/**
 * Capture segments for an export: the explicit count, or for `auto` one per two cores (CPU canvas, at most 6) or 3
 * (GPU: the graphics card is shared), and never more than 40% of the computer's memory holds. Each extra segment costs
 * about 1.3 GB at 1080p; past one per two cores it adds memory without adding speed (the CPU is already full).
 * `auto` budgets 40% of memory: the shared Chromium and Node (0.9 GB) plus 1.3 GB per 1080p segment.
 */
export function exportWorkers(settings: Pick<RenderSettings, 'workers' | 'canvas'>, cores: number, memory?: { total: number; pixels: number }) {
  if (settings.workers !== 'auto') return settings.workers;
  const byCores = settings.canvas === 'gpu' ? 3 : Math.max(1, Math.min(6, Math.floor(cores / 2)));
  if (!memory) return byCores;
  const perSegment = SEGMENT_MEMORY_1080P * Math.max(0.25, memory.pixels / (1920 * 1080));
  return Math.max(1, Math.min(byCores, Math.floor((memory.total * EXPORT_MEMORY_SHARE - EXPORT_BASE_MEMORY) / perSegment)));
}
export const EXPORT_MAX_FPS = { mp4: 60, webm: 60, mov: 60, lottie: 30, svga: 30 } as const;
export const SVGA_FRAME_RATES = [1, 2, 3, 5, 6, 10, 12, 15, 20, 30] as const;
export function validateExportFrameRate(format: ExportFormat, fps: number) {
  if (!Number.isInteger(fps) || fps < 1 || fps > EXPORT_MAX_FPS[format])
    throw new Error(`${format === 'lottie' ? 'Lottie' : format.toUpperCase()} frame rate must be between 1 and ${EXPORT_MAX_FPS[format]} fps.`);
  if (format === 'svga' && !SVGA_FRAME_RATES.some(rate => rate === fps))
    throw new Error(`SVGA frame rate must be one of ${SVGA_FRAME_RATES.join(', ')}.`);
}
export const EXPORT_SIZES = {
  lottie: [{ width: 256, height: 256, name: 'Square' }, { width: 640, height: 360, name: 'Landscape' }],
  svga: [{ width: 375, height: 375, name: 'Square' }, { width: 375, height: 750, name: 'Portrait' }],
  webm: [{ width: 1280, height: 720, name: '720p' }, { width: 1920, height: 1080, name: '1080p' }],
  mp4: [{ width: 1280, height: 720, name: '720p' }, { width: 1920, height: 1080, name: '1080p' }],
  mov: [{ width: 1280, height: 720, name: '720p' }, { width: 1920, height: 1080, name: '1080p' }],
} as const;
export const MP4_PORTRAIT_SIZES = EXPORT_SIZES.mp4.map(size => ({ ...size, width: size.height, height: size.width }));
