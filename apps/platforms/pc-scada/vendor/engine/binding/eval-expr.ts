import type { TagValueMap } from "../../core";

const fnCache = new Map<string, Function>();

/**
 * Build a nested scope object from a TagValueMap so expressions can reference
 * tags by their dotted path.
 *
 * Example:
 *   tags = { "props.running": { value: true }, "props.num": { value: 75 } }
 *   → scope = { props: { running: true, num: 75 } }
 *
 * This allows transforms like `props.running === true ? 'red' : 'green'`
 * to work naturally instead of requiring the generic `value` variable.
 */
export function buildTagScope(values: TagValueMap): Record<string, any> {
  const scope: Record<string, any> = {};
  for (const [tagName, tagValue] of Object.entries(values)) {
    const parts = tagName.split(".");
    if (parts.length < 2) continue; // single-segment tags don't need path scope

    let current: Record<string, any> = scope;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (typeof current[key] !== "object" || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, any>;
    }
    current[parts[parts.length - 1]] = tagValue.value;
  }
  return scope;
}

/**
 * Evaluate a transform expression.
 *
 * Available variables inside the expression:
 *   - `value`  — the current tag's raw value (main variable)
 *   - `tags`   — full TagValueMap (shape: `{ tagName: { value, quality, timestamp } }`)
 *   - path-scope variables derived from tag names (e.g. a tag "props.running"
 *     makes `props.running` available directly in the expression)
 *
 * @param scope  Optional nested scope from `buildTagScope(values)`.
 */
export function evalExpr(expr: string, value: any, tags: TagValueMap, scope: Record<string, any> = {}): any {
  try {
    const scopeKeys = Object.keys(scope).sort();
    const cacheKey = scopeKeys.length > 0 ? `[${scopeKeys.join(",")}]:${expr}` : expr;

    let fn = fnCache.get(cacheKey);
    if (!fn) {
      fn = new Function("value", "tags", ...scopeKeys, `return (${expr})`);
      fnCache.set(cacheKey, fn);
    }
    return fn(value, tags, ...scopeKeys.map((k) => scope[k]));
  } catch {
    return value;
  }
}
