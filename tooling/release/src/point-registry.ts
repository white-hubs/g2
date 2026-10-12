import { readFileSync, writeFileSync } from "node:fs";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export type RegistryEntries = Record<string, string>;

export function writeRegistryFile(registryPath: string, doc: RegistryEntries, options?: { dryRun?: boolean }): void {
  if (options?.dryRun) {
    return;
  }
  writeFileSync(registryPath, `${stringifyYaml(doc, { lineWidth: 0 })}\n`, "utf8");
}

/** @deprecated Prefer generate → `.deploy-out/.../registry.yaml` (ADR-0055). */
export function pointRegistry(registryPath: string, entries: RegistryEntries, options?: { dryRun?: boolean }): RegistryEntries {
  const raw = readFileSync(registryPath, "utf8");
  const doc = parseYaml(raw) as RegistryEntries;

  const applied: RegistryEntries = {};
  for (const [logicalName, relativeKey] of Object.entries(entries)) {
    if (doc[logicalName] !== relativeKey) {
      applied[logicalName] = relativeKey;
    }
    doc[logicalName] = relativeKey;
  }

  writeRegistryFile(registryPath, doc, options);
  return applied;
}

export function loadRegistryValue(registryPath: string, key: string): string | undefined {
  const raw = readFileSync(registryPath, "utf8");
  const doc = parseYaml(raw) as RegistryEntries;
  const value = doc[key];
  return value === "" ? undefined : value;
}
