// Zod-free validators for the browser: scene meta, parameter definitions and export sizes.
// They accept and reject exactly what sceneMetaSchema, parameterDefinitionsSchema and exportSizeSchema do (a core test runs
// both on shared fixtures), so the player and export pages validate scenes without shipping zod (~450 KB minified).
import type { ExportSize } from './export-settings.js';
import type { LayerEdit, LayersMeta, ParameterDefinition, ParameterDefinitions, SceneMeta, TimelineEdits, TimelineLayer } from './scene-meta.js';

type Path = (string | number)[];
class ValidationError extends Error {
  constructor(readonly path: Path, readonly reason: string, what: string) {
    super(`Invalid ${what}${path.length ? ` at ${path.join('.')}` : ''}: ${reason}`);
    this.name = 'ValidationError';
  }
}
type Check<T> = (value: unknown, path: Path) => T;
const fail = (path: Path, reason: string): never => { throw new ValidationError(path, reason, ''); };

const number = (opts: { int?: boolean; min?: number; max?: number; gt?: number } = {}): Check<number> => (v, p) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fail(p, 'expected a finite number');
  if (opts.int && !Number.isSafeInteger(v)) return fail(p, 'expected an integer');
  if (opts.gt !== undefined && !(v > opts.gt)) return fail(p, `must be greater than ${opts.gt}`);
  if (opts.min !== undefined && v < opts.min) return fail(p, `must be at least ${opts.min}`);
  if (opts.max !== undefined && v > opts.max) return fail(p, `must be at most ${opts.max}`);
  return v;
};
const string = (opts: { min?: number; max?: number; regex?: RegExp; trim?: boolean } = {}): Check<string> => (v, p) => {
  if (typeof v !== 'string') return fail(p, 'expected a string');
  const s = opts.trim ? v.trim() : v;
  if (opts.min !== undefined && s.length < opts.min) return fail(p, `must have at least ${opts.min} characters`);
  if (opts.max !== undefined && s.length > opts.max) return fail(p, `must have at most ${opts.max} characters`);
  if (opts.regex && !opts.regex.test(s)) return fail(p, 'has an invalid format');
  return s;
};
const boolean: Check<boolean> = (v, p) => typeof v === 'boolean' ? v : fail(p, 'expected a boolean');
const oneOf = <T extends string>(values: readonly T[]): Check<T> => (v, p) => values.includes(v as T) ? v as T : fail(p, `expected one of ${values.join(', ')}`);
const array = <T>(item: Check<T>, opts: { min?: number; max?: number } = {}): Check<T[]> => (v, p) => {
  if (!Array.isArray(v)) return fail(p, 'expected an array');
  if (opts.min !== undefined && v.length < opts.min) return fail(p, `must have at least ${opts.min} items`);
  if (opts.max !== undefined && v.length > opts.max) return fail(p, `must have at most ${opts.max} items`);
  return v.map((x, i) => item(x, [...p, i]));
};
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
type Field = { check: Check<unknown>; optional?: boolean; fallback?: () => unknown };
const opt = (check: Check<unknown>): Field => ({ check, optional: true });
const withDefault = (check: Check<unknown>, fallback: unknown): Field => ({ check, fallback: () => fallback });
/** A strict object: unknown keys are rejected, optional keys stay absent, defaults fill missing keys. */
const object = <T>(shape: Record<string, Check<unknown> | Field>): Check<T> => (v, p) => {
  if (!isRecord(v)) return fail(p, 'expected an object');
  for (const key of Object.keys(v)) if (!(key in shape)) fail([...p, key], 'unknown key');
  const out: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(shape)) {
    const field: Field = typeof spec === 'function' ? { check: spec } : spec, value = v[key];
    if (value === undefined) {
      if (field.fallback) out[key] = field.check(field.fallback(), [...p, key]);
      else if (!field.optional) fail([...p, key], 'required');
      else if (key in v) out[key] = undefined;
      continue;
    }
    out[key] = field.check(value, [...p, key]);
  }
  return out as T;
};
const record = <T>(key: RegExp, item: Check<T>): Check<Record<string, T>> => (v, p) => {
  if (!isRecord(v)) return fail(p, 'expected an object');
  const out: Record<string, T> = {};
  for (const [k, x] of Object.entries(v)) {
    if (!key.test(k)) fail([...p, k], 'invalid key');
    out[k] = item(x, [...p, k]);
  }
  return out;
};
const refine = <T>(check: Check<T>, ok: (value: T) => boolean, reason: string): Check<T> => (v, p) => {
  const value = check(v, p);
  return ok(value) ? value : fail(p, reason);
};
const increasing = (values: number[]) => values.every((v, i) => i === 0 || v > values[i - 1]!);

const color = string({ regex: /^#[\da-f]{6}$/i });
const localPath = refine(string({ min: 1 }), p => !p.startsWith('/') && !p.includes('\\') && !p.split('/').includes('..') && !p.includes(':'), 'use a project-relative path');
const dimension = number({ int: true, min: 2, max: 7680 });
const shots = refine(array(object<{ end: number; stop?: number; title?: string }>({
  end: number({ gt: 0 }), stop: opt(number({ min: 0 })), title: opt(string({ max: 120 })),
}), { min: 1, max: 200 }), s => increasing(s.map(shot => shot.end)), 'shot ends must be in increasing time order');
const tempo = object({ bpm: number({ gt: 0, max: 1000 }), beatsPerBar: withDefault(number({ int: true, min: 1, max: 32 }), 4), offset: withDefault(number(), 0) });
const MOTIONS = ['none', 'fade', 'fade-up', 'pop', 'blur-in', 'wipe'] as const;
const motion = oneOf(MOTIONS);
const LAYER_ID = /^[\w-]{1,64}$/;
const layerId = string({ regex: LAYER_ID });
const seconds = number({ min: 0, max: 3600 });
const LAYER_EDIT_KEYS = ['name', 'in', 'out', 'enter', 'exit', 'hidden', 'colour', 'locked'] as const satisfies readonly (keyof LayerEdit)[];
const layerEdit = object<LayerEdit>({
  name: opt(string({ trim: true, min: 1, max: 120 })), in: opt(seconds), out: opt(seconds), enter: opt(motion), exit: opt(motion),
  hidden: opt(boolean), colour: opt(color), locked: opt(boolean),
});
const timelineEdits = object<TimelineEdits>({
  layers: opt(record(LAYER_ID, layerEdit)),
  added: opt(array(object({ id: layerId, base: layerId }), { max: 200 })),
  removed: opt(array(layerId, { max: 400 })),
  order: opt(array(layerId, { max: 400 })),
  shots: opt(refine(array(number({ gt: 0, max: 3600 }), { min: 1, max: 200 }), increasing, 'shot ends must increase')),
});
const timelineLayer = object<TimelineLayer>({
  id: layerId, base: layerId, name: string({ max: 120 }), in: seconds, out: seconds, enter: motion, exit: motion, hidden: boolean, locked: boolean,
  colour: opt(color), source: opt(string({ max: 200 })), subtitles: array(string(), { max: 32 }), edited: array(oneOf(LAYER_EDIT_KEYS)),
});
const layersMeta = object<LayersMeta>({
  file: refine(localPath, p => /\.json$/.test(p), 'the timeline file must be a .json file'),
  layers: array(timelineLayer, { max: 400 }), edits: timelineEdits, sequence: opt(boolean),
});
const sceneMeta = object<SceneMeta>({
  width: dimension, height: dimension, duration: number({ gt: 0, max: 3600 }), fps: number({ int: true, min: 1, max: 240 }), background: color,
  shots: opt(shots), tempo: opt(tempo), loop: opt(boolean), layers: opt(layersMeta),
});
const name = string({ min: 1 });
const PARAMETERS: Record<ParameterDefinition['type'], Check<ParameterDefinition>> = {
  number: object({ name, type: oneOf(['number']), default: number(), min: number(), max: number(), step: opt(number({ gt: 0 })) }),
  color: object({ name, type: oneOf(['color']), default: color }),
  boolean: object({ name, type: oneOf(['boolean']), default: boolean }),
  string: object({ name, type: oneOf(['string']), default: string({ max: 4096 }), role: opt(oneOf(['subtitle'])) }),
  enum: object({ name, type: oneOf(['enum']), default: string(), options: array(string(), { min: 1 }) }),
};
const parameter: Check<ParameterDefinition> = (v, p) => {
  const type = isRecord(v) ? v.type : undefined;
  if (typeof type !== 'string' || !(type in PARAMETERS)) return fail([...p, 'type'], 'unknown parameter type');
  return PARAMETERS[type as ParameterDefinition['type']](v, p);
};
const parameterDefinitions: Check<ParameterDefinitions> = (v, p) => {
  const defs = record(/^[a-zA-Z]\w*$/, parameter)(v, p);
  for (const [id, d] of Object.entries(defs)) {
    if (d.type === 'number' && (d.min > d.max || d.default < d.min || d.default > d.max)) fail([...p, id], 'invalid range or default');
    if (d.type === 'enum' && !d.options.includes(d.default)) fail([...p, id], 'default must be an option');
  }
  return defs;
};
const exportSize = object<ExportSize>({ width: dimension, height: dimension, fit: withDefault(oneOf(['contain', 'cover', 'reflow']), 'contain') });

const parser = <T>(check: Check<T>, what: string) => (value: unknown): T => {
  try { return check(value, []); }
  catch (error) { if (error instanceof ValidationError) throw new ValidationError(error.path, error.reason, what); throw error; }
};
/** Same result as `sceneMetaSchema.parse`, without zod. */
export const parseSceneMeta = parser(sceneMeta, 'scene meta');
/** Same result as `parameterDefinitionsSchema.parse`, without zod. */
export const parseParameterDefinitions = parser(parameterDefinitions, 'scene params');
/** Same result as `exportSizeSchema.parse`, without zod. */
export const parseExportSize = parser(exportSize, 'export size');
