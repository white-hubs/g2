import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

import type { RegistryEntries } from "./point-registry";

function isEmptyTemplateValue(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/**
 * Load address template (empty-value map). Rejects any non-empty literal values.
 */
export function loadAddressTemplateKeys(templatePath: string): string[] {
  const doc = parseYaml(readFileSync(templatePath, "utf8"));
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    throw new Error(`address template must be a YAML map: ${templatePath}`);
  }

  const keys: string[] = [];
  for (const [key, value] of Object.entries(doc as Record<string, unknown>)) {
    if (!isEmptyTemplateValue(value)) {
      throw new Error(`address template must not contain non-empty values (key "${key}" in ${templatePath}); bind via same-named env`);
    }
    keys.push(key);
  }

  if (keys.length === 0) {
    throw new Error(`address template has no keys: ${templatePath}`);
  }

  return keys;
}

/**
 * Bind template keys from env. Missing key → error; present empty string → "".
 */
export function bindAddressEnv(keys: string[], env: NodeJS.ProcessEnv = process.env): RegistryEntries {
  const bound: RegistryEntries = {};
  const missing: string[] = [];

  for (const key of keys) {
    const value = env[key];
    if (value === undefined) {
      missing.push(key);
      continue;
    }
    bound[key] = value;
  }

  if (missing.length > 0) {
    throw new Error(`address env missing for logical name(s): ${missing.join(", ")} (set via environment, --env KEY=VALUE, or --env-file)`);
  }

  return bound;
}
