const GLOBAL_TOKEN_RE = /\$\{global\.([a-zA-Z0-9_]+)\}/g;
const SINGLE_GLOBAL_TOKEN_RE = /^\$\{global\.([a-zA-Z0-9_]+)\}$/;
const ELEMENT_TOKEN_RE = /\$\{element\.([a-zA-Z0-9_]+)\}/g;
const SINGLE_ELEMENT_TOKEN_RE = /^\$\{element\.([a-zA-Z0-9_]+)\}$/;

export interface TemplateScope {
  global: Record<string, unknown>;
  element: Record<string, unknown>;
}

export function templateScope(globals: Record<string, unknown>, element?: Record<string, unknown> | null): TemplateScope {
  return { global: globals, element: element ?? {} };
}

export function extractGlobalKeysFromText(input: string): string[] {
  const keys = new Set<string>();
  let match: RegExpExecArray | null;
  GLOBAL_TOKEN_RE.lastIndex = 0;
  while ((match = GLOBAL_TOKEN_RE.exec(input)) !== null) {
    keys.add(match[1]);
  }
  return [...keys];
}

export function resolveTemplateValue(input: unknown, scope: TemplateScope): unknown {
  if (typeof input === "string") {
    const gSingle = input.match(SINGLE_GLOBAL_TOKEN_RE);
    if (gSingle) {
      return scope.global[gSingle[1]];
    }
    const eSingle = input.match(SINGLE_ELEMENT_TOKEN_RE);
    if (eSingle) {
      return scope.element[eSingle[1]];
    }
    let s = input.replace(GLOBAL_TOKEN_RE, (_, key: string) => {
      const value = scope.global[key];
      return value == null ? "" : String(value);
    });
    s = s.replace(ELEMENT_TOKEN_RE, (_, key: string) => {
      const value = scope.element[key];
      return value == null ? "" : String(value);
    });
    return s;
  }
  if (Array.isArray(input)) {
    return input.map((item) => resolveTemplateValue(item, scope));
  }
  if (input && typeof input === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      result[key] = resolveTemplateValue(value, scope);
    }
    return result;
  }
  return input;
}

export function resolveTagName(input: unknown, globals: Record<string, unknown>): string {
  if (typeof input === "string") {
    const single = input.match(SINGLE_GLOBAL_TOKEN_RE);
    if (single) {
      const key = single[1];
      const value = globals[key];
      // 支持“全局状态键”模式：当值为空时退回到 key 本身作为 tag。
      if (value == null || value === "") return key;
      return String(value);
    }
  }

  const resolved = resolveTemplateValue(input, templateScope(globals));
  if (typeof resolved === "string") return resolved;
  return resolved == null ? "" : String(resolved);
}
