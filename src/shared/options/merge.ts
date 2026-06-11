import type { DeepPartial } from './primitives';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Deep merge for options: objects are merged recursively,
 * arrays and functions are replaced wholesale (updateDelta semantics).
 */
export function deepMerge<T extends object>(base: T, patch: DeepPartial<T>): T {
  const result = { ...base } as Record<string, unknown>;
  for (const [key, patchValue] of Object.entries(patch)) {
    if (patchValue === undefined) continue;
    const baseValue = result[key];
    result[key] = isPlainObject(baseValue) && isPlainObject(patchValue) ? deepMerge(baseValue, patchValue) : patchValue;
  }
  return result as T;
}
