#!/usr/bin/env bun
/**
 * For generated clients: ensure param names match body usage.
 * - If body references `name`, param must be `name` (not `_name`)
 * - If body does not reference `name`, param must be `_name`
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../../apps/clients");

function fixFile(path: string) {
  let src = readFileSync(path, "utf8");
  const orig = src;

  // Match each method entry: name: async (params) => body,
  // body ends at next top-level `name:` or closing `};` of return — use line-oriented for single-line first.
  src = src.replace(/(\w+):\s*async\s*\(([^)]*)\)\s*=>\s*([\s\S]*?)(?=,\n\s*\w+:\s*async|\n\s*\};\n)/g, (_m, name, params, body) => {
    const fixedParams = params
      .split(",")
      .map((p: string) => {
        const t = p.trim();
        if (!t) return t;
        const m = t.match(/^(_?)([\w$]+)(\??:\s*unknown)$/);
        if (!m) return t;
        const id = m[2]!;
        const used = new RegExp(`\\b${id}\\b`).test(body);
        return `${used ? "" : "_"}${id}${m[3]}`;
      })
      .join(", ");
    return `${name}: async (${fixedParams}) => ${body}`;
  });

  // Sync type block from impls
  const impls = new Map<string, string>();
  for (const m of src.matchAll(/(\w+):\s*async\s*\(([^)]*)\)/g)) {
    impls.set(m[1]!, m[2]!);
  }
  src = src.replace(/(\w+):\s*\(([^)]*)\)\s*=>\s*Promise<unknown>/g, (full, name: string) => {
    const impl = impls.get(name);
    return impl != null ? `${name}: (${impl}) => Promise<unknown>` : full;
  });

  // Drop unused withQuery helper
  const withQueryUses = (src.match(/withQuery\(/g) ?? []).length;
  if (withQueryUses <= 1 && src.includes("function withQuery")) {
    src = src.replace(/\nfunction withQuery\(url: string, payload\?: Record<string, unknown>\): string \{\n(?:.*\n)*?\}\n\n/, "\n");
  }

  if (src !== orig) {
    writeFileSync(path, src);
    console.log("fixed", path);
  }
}

if (import.meta.main) {
  for (const s of readdirSync(root)) {
    const p = join(root, s, "src/client.ts");
    if (existsSync(p)) fixFile(p);
  }
}
