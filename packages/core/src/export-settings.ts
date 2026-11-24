// Render settings and the export policy built on them.
import { z } from 'zod';
import { localPath } from './schema-parts.js';
import { isVideoFormat, validateExportFrameRate } from './export-policy.js';

export * from './export-policy.js';
export const exportPresetSchema = z.enum(['share', 'high', 'fast', 'master']);

export const renderSettingsSchema = z.strictObject({
  /** Device pixels per logical pixel for output capture. */
  scale: z.number().finite().min(0.1).max(4).default(1),
  /** Parallel capture segments; `auto` picks from the CPU count and canvas (see exportWorkers). */
  workers: z.union([z.number().int().min(1).max(8), z.literal('auto')]).default('auto'),
  /** Output frame rate. */
  fps: z.number().int().min(1).max(120).default(30),
  /** Equal-weight samples per output frame (4 × 30fps = 120 samples per second). */
  samples: z.number().int().min(1).max(16).default(4),
  mixing: z.enum(['srgb', 'linear']).default('srgb'),
  /**
   * Shutter angle in degrees: the share of each frame interval the samples cover. 360 spreads them over the whole
   * interval (the long-standing look); 180 is the film convention, with shorter trails.
   */
  shutter: z.number().finite().min(1).max(360).default(360),
  /**
   * Where frame k's samples sit. `after` (the original timing): in the interval after k/fps, so the picture is
   * centred half a frame after its timestamp. `centred`: around k/fps, in step with the audio. Kept as `after`
   * by default so existing films render exactly as before.
   */
  sampleWindow: z.enum(['after', 'centred']).default('after'),
  /**
   * Frames whose first and last samples barely differ mix only those two. Decided by how far the change spreads,
   * so small fast objects keep every sample. Off by default.
   */
  adaptiveSamples: z.boolean().default(false),
  /**
   * Where export frames are drawn. 'cpu' is identical on every machine. 'gpu' rasterizes on the graphics card
   * (Metal on macOS, Direct3D 11 on Windows), with antialiased edges a little different; elsewhere it falls back to 'cpu'.
   */
  canvas: z.enum(['cpu', 'gpu']).default('cpu'),
  /** Ordered dither before the final 8-bit rounding: hides banding in soft gradients. Off by default (exact old output). */
  dither: z.boolean().default(false),
  bitrate: z.string().regex(/^\d+(\.\d+)?[kM]$/).default('12M'),
  glow: z.number().finite().min(0).max(1).default(0.12),
  grain: z.number().finite().min(0).max(0.1).default(0.008),
  /**
   * MP4 video codec (WebM is always VP9, MOV always ProRes). H.265 / HEVC is written 10-bit and keeps the same look in
   * a markedly smaller file; it plays in QuickTime, Safari, Chrome and Edge with hardware decoding, phones and social
   * uploads. H.264 (8-bit) also plays in Firefox, older players and Windows PCs without HEVC support.
   */
  codec: z.enum(['h265', 'h264']).default('h265'),
  /**
   * `crf`: software constant quality, encoded while frames are captured. `two-pass`: software target bitrate from a
   * lossless master (slower; for a fixed file size). `hardware`: the GPU's encoder (VideoToolbox, NVENC, Quick Sync,
   * AMF or VA-API), falling back to software constant quality where none works.
   */
  encoding: z.enum(['crf', 'two-pass', 'hardware']).default('crf'),
  preset: z.enum(['ultrafast', 'veryfast', 'fast', 'medium', 'slow']).default('medium'),
  crf: z.number().int().min(0).max(51).default(18),
  /** Hardware encoder quality, 1–100: higher keeps more detail in a larger file. 65 looks like libx265 CRF 14. */
  hardwareQuality: z.number().int().min(1).max(100).default(65),
  includeAudio: z.boolean().default(true),
});
export type RenderSettings = z.infer<typeof renderSettingsSchema>;
export const exportFormatSchema = z.enum(['mp4', 'webm', 'mov', 'lottie', 'svga']);
export type ExportFormat = z.infer<typeof exportFormatSchema>;
/** Output viewport only; the scene keeps its logical dimensions. */
export const exportSizeSchema = z.strictObject({
  width: z.number().int().min(2).max(7680),
  height: z.number().int().min(2).max(7680),
  fit: z.enum(['contain', 'cover', 'reflow']).default('contain'),
});
export type ExportSize = z.infer<typeof exportSizeSchema>;
type RenderShape = typeof renderSettingsSchema.shape;
/** Each setting, optional and without its default; derived so a new setting cannot be forgotten here. */
const renderOverrides = Object.fromEntries(Object.entries(renderSettingsSchema.shape).map(([key, field]) => [key, field.unwrap().optional()])) as {
  [K in keyof RenderShape]: z.ZodOptional<ReturnType<RenderShape[K]['unwrap']>>;
};
export const renderOverridesSchema = z.strictObject(renderOverrides);
export const exportRequestSchema = z.strictObject({
  format: exportFormatSchema.default('mp4'),
  output: localPath.optional(),
  size: exportSizeSchema.optional(),
  render: renderOverridesSchema.optional(),
}).superRefine((request, ctx) => {
  if (request.size && isVideoFormat(request.format) && (request.size.width % 2 || request.size.height % 2))
    ctx.addIssue({ code: 'custom', path: ['size'], message: 'Video needs even pixel dimensions.' });
  if (request.render?.fps === undefined) return;
  try { validateExportFrameRate(request.format, request.render.fps); }
  catch (error) { ctx.addIssue({ code: 'custom', path: ['render', 'fps'], message: (error as Error).message }); }
});
export type ExportRequest = z.input<typeof exportRequestSchema>;
