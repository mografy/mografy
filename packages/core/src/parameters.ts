// Scene parameters: resolving saved values against their definitions.
import { parameterDefinitionsSchema } from './scene-meta.js';
import type { ParameterDefinitions, ParameterValue, ParameterValues } from './scene-meta.js';
import { checkParamValue, resolveParsedParams } from './param-values.js';

export { checkParamValue, resolveParsedParams } from './param-values.js';
/** Strict: unknown ids or invalid values throw. Missing values use defaults. */
export function resolveParams(definitions: ParameterDefinitions, values: ParameterValues): Readonly<ParameterValues> {
  return resolveParsedParams(parameterDefinitionsSchema.parse(definitions), values);
}
export interface ParameterIssue { id: string; value: ParameterValue; reason: 'removed' | 'type-changed' | 'out-of-range' }
/**
 * After a scene update, keep saved values that still fit the new definitions.
 * Values for removed or incompatible parameters are dropped and reported.
 */
export function reconcileParams(definitions: ParameterDefinitions, values: ParameterValues): { values: ParameterValues; issues: ParameterIssue[] } {
  const defs = parameterDefinitionsSchema.parse(definitions);
  const kept: ParameterValues = {}, issues: ParameterIssue[] = [];
  for (const [id, value] of Object.entries(values)) {
    const d = defs[id];
    if (!d) issues.push({ id, value, reason: 'removed' });
    else if (typeof value !== typeof d.default) issues.push({ id, value, reason: 'type-changed' });
    else if (!checkParamValue(d, value)) issues.push({ id, value, reason: 'out-of-range' });
    else kept[id] = value;
  }
  return { values: kept, issues };
}
