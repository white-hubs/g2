/**
 * One-shot: replace brand-blue hex in domains CSS/TSX with cube theme CSS vars.
 * Skips risk-level taxonomy blues (四色图 LOW).
 *
 * Usage: bun tooling/fix-skin-hardcoded-blues.ts
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const EXT = new Set([".css", ".less", ".scss", ".tsx", ".ts", ".vue"]);

const SKIP_ENDINGS = ["four-color-map.tsx", "risk-gis-map-editor.tsx"];

const HEX_MAP: Array<[RegExp, string]> = [
  [/#f8fbff\b/gi, "var(--cube-theme-var--primary-1, #f8fbff)"],
  [/#f7faff\b/gi, "var(--cube-theme-var--primary-1, #f7faff)"],
  [/#f2f7ff\b/gi, "var(--cube-theme-var--primary-1, #f2f7ff)"],
  [/#eaf3ff\b/gi, "var(--cube-theme-var--primary-1, #eaf3ff)"],
  [/#e6f4ff\b/gi, "var(--cube-theme-var--primary-1, #e6f4ff)"],
  [/#e6f7ff\b/gi, "var(--cube-theme-var--primary-1, #e6f7ff)"],
  [/#ddebff\b/gi, "var(--cube-theme-var--primary-2, #ddebff)"],
  [/#bae7ff\b/gi, "var(--cube-theme-var--primary-2, #bae7ff)"],
  [/#b9d6ff\b/gi, "var(--cube-theme-var--primary-3, #b9d6ff)"],
  [/#91caff\b/gi, "var(--cube-theme-var--primary-3, #91caff)"],
  [/#91d5ff\b/gi, "var(--cube-theme-var--primary-3, #91d5ff)"],
  [/#8bc0ff\b/gi, "var(--cube-theme-var--primary-4, #8bc0ff)"],
  [/#69c0ff\b/gi, "var(--cube-theme-var--primary-4, #69c0ff)"],
  [/#40a9ff\b/gi, "var(--cube-theme-var--primary-color-hover, #40a9ff)"],
  [/#0f61e8\b/gi, "var(--cube-theme-var--primary-color-active, #0f61e8)"],
  [/#096dd9\b/gi, "var(--cube-theme-var--primary-color-active, #096dd9)"],
  [/#3b82f6\b/gi, "var(--cube-theme-var--primary-color, #3b82f6)"],
  [/#2478ff\b/gi, "var(--cube-theme-var--primary-color, #2478ff)"],
  [/#1677ff\b/gi, "var(--cube-theme-var--primary-color, #1677ff)"],
  [/#1890ff\b/gi, "var(--cube-theme-var--primary-color, #1890ff)"],
  [/#1578ff\b/gi, "var(--cube-theme-var--primary-color, #1578ff)"],
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".turbo") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXT.has(extname(name))) out.push(p);
  }
  return out;
}

function shouldSkip(file: string): boolean {
  return SKIP_ENDINGS.some((s) => file.endsWith(s));
}

/** Replace hex only outside existing `var(...)` so fallbacks stay raw. */
function replaceOutsideVar(text: string, re: RegExp, replacement: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const varIdx = text.indexOf("var(", i);
    if (varIdx === -1) {
      out.push(text.slice(i).replace(re, replacement));
      break;
    }
    out.push(text.slice(i, varIdx).replace(re, replacement));
    let depth = 0;
    let j = varIdx;
    for (; j < text.length; j++) {
      const ch = text[j];
      if (ch === "(") depth++;
      else if (ch === ")") {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    out.push(text.slice(varIdx, j));
    i = j;
  }
  return out.join("");
}

function replaceRgbaBrandBlue(text: string): string {
  const toMix = (_: string, a: string): string => {
    const pct = Math.round(Number.parseFloat(a) * 100);
    return `color-mix(in srgb, var(--cube-theme-var--primary-color) ${pct}%, transparent)`;
  };
  return text
    .replace(/rgba\(\s*22\s*,\s*119\s*,\s*255\s*,\s*([0-9.]+)\s*\)/gi, toMix)
    .replace(/rgba\(\s*36\s*,\s*120\s*,\s*255\s*,\s*([0-9.]+)\s*\)/gi, toMix)
    .replace(/rgba\(\s*24\s*,\s*144\s*,\s*255\s*,\s*([0-9.]+)\s*\)/gi, toMix);
}

const root = "apps/domains";
let changedFiles = 0;

for (const file of walk(root)) {
  if (shouldSkip(file)) continue;
  const original = readFileSync(file, "utf8");
  let next = original;
  for (const [re, rep] of HEX_MAP) {
    // reset lastIndex for global regex reuse
    re.lastIndex = 0;
    next = replaceOutsideVar(next, new RegExp(re.source, re.flags), rep);
  }
  next = replaceRgbaBrandBlue(next);
  next = next.replace(
    /(--(?:inspection|fire)-primary):\s*#(?:1677ff|1890ff|2478ff)\b/gi,
    "$1: var(--cube-theme-var--primary-color, #1677ff)",
  );
  next = next.replace(
    /(--(?:inspection|fire)-primary-soft):\s*#(?:eaf3ff|e6f4ff|e6f7ff)\b/gi,
    "$1: var(--cube-theme-var--primary-1, #eaf3ff)",
  );
  if (next !== original) {
    writeFileSync(file, next);
    changedFiles++;
    console.log(file);
  }
}

console.log(`\nchanged ${changedFiles} files`);
