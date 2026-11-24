// @mografy/core/browser: the zod-free part of core for the player, the runtime and scene bundles.
// Validation uses the hand-written parsers in scene-validate.ts, which accept and reject exactly what the zod schemas
// in the main entry do (tests/browser-validate.test.ts runs both on shared fixtures). Node code keeps `@mografy/core`.
import { aspectSize } from './aspect.js';
import { resolveParsedParams } from './param-values.js';
import { parseParameterDefinitions, parseSceneMeta } from './scene-validate.js';
import type { AspectRatio, ParameterDefinitions, ParameterValues, SceneMeta } from './scene-meta.js';

export * from './api.js';
export * from './timing.js';
export * from './export-policy.js';
export { sceneRuntimeKey } from './scene-inputs.js';
export { checkParamValue, resolveParsedParams } from './param-values.js';
export { parseSceneMeta, parseParameterDefinitions, parseExportSize } from './scene-validate.js';

/** `sceneMetaForAspect` from `@mografy/core`, validated without zod. */
export function sceneMetaForAspect(meta: SceneMeta, aspectRatio?: AspectRatio): SceneMeta {
  return aspectRatio ? parseSceneMeta(aspectSize(meta, aspectRatio)) : meta;
}
/** `resolveParams` from `@mografy/core`, validated without zod. */
export function resolveParams(definitions: ParameterDefinitions, values: ParameterValues): Readonly<ParameterValues> {
  return resolveParsedParams(parseParameterDefinitions(definitions), values);
}
