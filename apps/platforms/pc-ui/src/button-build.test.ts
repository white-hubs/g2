import { describe, expect, test } from "bun:test";
import { readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";

const pkgRoot = join(import.meta.dirname, "..");
const distRoot = join(pkgRoot, "dist");

type MfManifest = {
  exposes: Array<{
    path: string;
    assets: { js: { sync: string[] } };
  }>;
};

/** 从 expose sync 入口跟随相对 import，累计可达 chunk 字节（不含 vue shared）。 */
function reachableJsBytes(entryRelPaths: string[]): number {
  const seen = new Set<string>();
  const queue = [...entryRelPaths];
  let total = 0;
  while (queue.length > 0) {
    const rel = queue.pop()!;
    if (seen.has(rel)) continue;
    seen.add(rel);
    const abs = join(distRoot, rel);
    total += statSync(abs).size;
    const src = readFileSync(abs, "utf8");
    for (const m of src.matchAll(/from\s*["'](\.\/[^"']+\.js)["']/g)) {
      const next = join(dirname(rel), m[1]!).replaceAll("\\", "/");
      if (!next.includes("loadShare__vue")) {
        queue.push(next);
      }
    }
  }
  return total;
}

describe("@g2-platform/pc-ui/button network on-demand (build)", () => {
  test("mf-manifest button expose payload is much smaller than ./index barrel", () => {
    const manifest = JSON.parse(readFileSync(join(distRoot, "mf-manifest.json"), "utf8")) as MfManifest;
    const buttonEntry = manifest.exposes.find((e) => e.path === "./button")?.assets.js.sync ?? [];
    const indexEntry = manifest.exposes.find((e) => e.path === "./index")?.assets.js.sync ?? [];
    expect(buttonEntry.length).toBeGreaterThan(0);
    expect(indexEntry.length).toBeGreaterThan(0);

    const buttonBytes = reachableJsBytes(buttonEntry);
    const indexBytes = reachableJsBytes(indexEntry);
    expect(buttonBytes).toBeGreaterThan(50_000); // 含 Button + css-in-js 公共
    expect(indexBytes).toBeGreaterThan(buttonBytes * 5);
    expect(buttonBytes).toBeLessThan(400_000);
  });
});
