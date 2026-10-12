import type { GemActionKey, GemPageKey } from "./page-keys";

/** 宿主应用域注入的能力码表（页面库不持有 code 值）。 */
export interface GemCapabilityCodes {
  page: Partial<Record<GemPageKey, string>>;
  action?: Partial<Record<GemActionKey, string>>;
}

export function hasCapability(
  codes: GemCapabilityCodes,
  functionCodes: ReadonlySet<string> | readonly string[],
  kind: "page" | "action",
  key: GemPageKey | GemActionKey,
): boolean {
  const table = kind === "page" ? codes.page : (codes.action ?? {});
  const code = table[key as keyof typeof table];
  if (!code) {
    return false;
  }
  if (functionCodes instanceof Set) {
    return functionCodes.has(code);
  }
  return (functionCodes as readonly string[]).includes(code);
}
