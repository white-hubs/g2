import { reactive } from "vue";

import type { DataDriver, ElementInstance, ElementPropertyBinding, TagAlias, TagValueMap, Unsubscribe } from "../../core";
import { registry } from "../../core";
import { resolveTagName } from "../shared/template";
import { evalExpr, buildTagScope } from "./eval-expr";

/**
 * Coerce a raw tag value to the declared prop schema type so that downstream
 * animation conditions (e.g. `value === true`) and mappings receive the
 * correct JS type regardless of how the tag was originally written.
 */
function coercePropValue(value: any, schemaType: string | undefined): any {
  if (schemaType === "boolean") {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const s = value.trim().toLowerCase();
      if (s === "true" || s === "1" || s === "on") return true;
      if (s === "false" || s === "0" || s === "off") return false;
    }
    return Boolean(value);
  }
  if (schemaType === "number") {
    if (typeof value === "number") return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  return value;
}

/** Placeholder when no product fields are bound（与图元 SVG 默认文案一致） */
const INLINE_PANEL_EMPTY_BINDINGS = "\uFF08\u672A\u7ED1\u5B9A\u4EA7\u54C1\u5B57\u6BB5\uFF09";

function buildInlinePropertyPanelDisplayBody(
  bindings: ElementPropertyBinding[] | undefined,
  values: TagValueMap,
  aliasMap: Map<string, string>,
  globals: Record<string, unknown>,
): string {
  const list = bindings ?? [];
  if (list.length === 0) {
    return INLINE_PANEL_EMPTY_BINDINGS;
  }
  const lines: string[] = [];
  for (const pb of list) {
    const code = (pb.propCode ?? "").trim();
    if (!code) {
      continue;
    }
    const resolvedCode = resolveTagName(code, globals);
    if (!resolvedCode) {
      continue;
    }
    const realTag = aliasMap.get(resolvedCode) ?? resolvedCode;
    const tv = values[realTag];
    const raw = tv != null ? tv.value : undefined;
    const text = raw === undefined || raw === null ? "--" : String(raw);
    const withUnit = pb.unitName ? `${text} ${pb.unitName}` : text;
    const label = (pb.propName ?? "").trim() || code;
    lines.push(`${label}: ${withUnit}`);
  }
  return lines.length > 0 ? lines.join("\n") : INLINE_PANEL_EMPTY_BINDINGS;
}

export class BindingEngine {
  private driver: DataDriver | null = null;
  private store = reactive<Record<string, Record<string, any>>>({});
  private unsubscribes: Unsubscribe[] = [];
  private globals: Record<string, unknown> = {};

  setDriver(driver: DataDriver) {
    this.driver = driver;
  }

  getDriver(): DataDriver | null {
    return this.driver;
  }

  setGlobals(globals: Record<string, unknown>) {
    this.globals = { ...globals };
  }

  bind(instances: ElementInstance[], aliases: TagAlias[] = []): Unsubscribe {
    const aliasMap = new Map(aliases.map((a) => [a.alias, a.tagName]));

    // Build a lookup: instanceId + propName → schema type, so we can coerce
    // raw tag values to the declared JS type (e.g. number 1 → boolean true).
    const propTypeMap = new Map<string, string>();
    for (const inst of instances) {
      const def = registry.get(inst.type);
      for (const schema of def?.propsSchema ?? []) {
        propTypeMap.set(`${inst.id}:${schema.name}`, schema.type);
      }
    }

    const tagSet = new Set<string>();
    for (const inst of instances) {
      for (const b of inst.bindings) {
        const tag = resolveTagName(b.tagName, this.globals);
        if (!tag) continue;
        tagSet.add(aliasMap.get(tag) ?? tag);
      }
      const def = registry.get(inst.type);
      if (def?.inlinePropertyPanel && inst.propertyBindings?.length) {
        for (const pb of inst.propertyBindings) {
          const tag = resolveTagName(pb.propCode, this.globals);
          if (!tag) continue;
          tagSet.add(aliasMap.get(tag) ?? tag);
        }
      }
    }

    if (!this.driver) {
      return () => {};
    }

    if (tagSet.size === 0) {
      return () => {};
    }

    const unsub = this.driver.subscribe([...tagSet], (values: TagValueMap) => {
      // Build path-scope once per callback so all bindings in this tick share it.
      // e.g. tags "props.running" and "props.num" → scope { props: { running: ..., num: ... } }
      // This allows transform expressions like `props.running === true ? 'red' : 'green'`.
      const tagScope = buildTagScope(values);

      for (const inst of instances) {
        const resolved = { ...inst.props };
        for (const b of inst.bindings) {
          const tag = resolveTagName(b.tagName, this.globals);
          const realTag = aliasMap.get(tag) ?? tag;
          const tv = values[realTag];
          if (tv != null) {
            const propType = propTypeMap.get(`${inst.id}:${b.propName}`);
            // Coerce the raw tag value to the prop's declared type BEFORE evaluation.
            // This ensures transform expressions like `value === true` work correctly
            // even when the data driver sends numeric 0/1 for boolean signals.
            const coercedValue = coercePropValue(tv.value, propType);
            const raw = b.transform ? evalExpr(b.transform, coercedValue, values, tagScope) : coercedValue;
            resolved[b.propName] = raw;
          }
        }
        const def = registry.get(inst.type);
        if (def?.inlinePropertyPanel) {
          resolved.displayBody = buildInlinePropertyPanelDisplayBody(inst.propertyBindings, values, aliasMap, this.globals);
        }
        this.store[inst.id] = resolved;
      }
    });

    this.unsubscribes.push(unsub);
    return unsub;
  }

  getProps(instanceId: string): Record<string, any> | undefined {
    return this.store[instanceId];
  }

  getStore() {
    return this.store;
  }

  /** Remove all cached bound props from the reactive store. */
  clearStore(): void {
    for (const key of Object.keys(this.store)) {
      delete this.store[key];
    }
  }

  dispose() {
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
  }
}
