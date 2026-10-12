import type { PlatformModule } from "./types";

export type AssertPlatformModuleResult = { ok: true; module: PlatformModule } | { ok: false; errors: string[] };

export function assertPlatformModule(input: unknown): AssertPlatformModuleResult {
  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["platform module must be an object"] };
  }
  const mod = input as Partial<PlatformModule>;
  const errors: string[] = [];
  if (mod.slots !== undefined && (typeof mod.slots !== "object" || mod.slots === null || Array.isArray(mod.slots))) {
    errors.push("platform module 'slots' must be an object map when present");
  }
  if (mod.install !== undefined && typeof mod.install !== "function") {
    errors.push("platform module 'install' must be a function when present");
  }
  if (mod.label !== undefined && typeof mod.label !== "string") {
    errors.push("platform module 'label' must be a string when present");
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, module: mod as PlatformModule };
}
