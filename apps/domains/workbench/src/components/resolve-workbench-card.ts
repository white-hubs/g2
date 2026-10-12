import type { Component } from "vue";

import * as WorkbenchCards from "./workbench-cards";

/** Resolve API card codes (for example, `tasksTodo`) against PascalCase component exports. */
export function resolveWorkbenchCard(code: string): Component | undefined {
  const match = Object.entries(WorkbenchCards).find(([name]) => name.toLowerCase() === code.toLowerCase());
  return match?.[1] as Component | undefined;
}
