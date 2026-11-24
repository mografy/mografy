// Scene parameters: checking values against definitions. Zod-free, so the browser shares it.
import type { ParameterDefinition, ParameterDefinitions, ParameterValue, ParameterValues } from './scene-meta.js';

/** Whether a value fits its definition. Zod-free: the browser entry shares it. */
export function checkParamValue(d: ParameterDefinition, value: unknown): value is ParameterValue {
  if (typeof value !== typeof d.default) return false;
  switch (d.type) {
    case 'number': return Number.isFinite(value) && (value as number) >= d.min && (value as number) <= d.max;
    case 'color': return /^#[\da-f]{6}$/i.test(String(value));
    case 'enum': return d.options.includes(String(value));
    case 'string': return String(value).length <= 4096;
    case 'boolean': return true;
  }
}
/** resolveParams for definitions already validated (by the schema or by parseParameterDefinitions). */
export function resolveParsedParams(defs: ParameterDefinitions, values: ParameterValues): Readonly<ParameterValues> {
  for (const id of Object.keys(values)) if (!(id in defs)) throw new Error(`Unknown parameter: ${id}`);
  const result: ParameterValues = {};
  for (const [id, d] of Object.entries(defs)) {
    const value = values[id] ?? d.default;
    if (!checkParamValue(d, value)) throw new Error(`Invalid parameter: ${id}`);
    result[id] = value;
  }
  return Object.freeze(result);
}
