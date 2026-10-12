import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pkgRoot = join(import.meta.dirname, "..");

describe("@g2-platform/pc-ui/button package + MF entry", () => {
  test("package.json exports ./button to src/button.ts", () => {
    const pkg = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8")) as {
      exports?: Record<string, string>;
    };
    expect(pkg.exports?.["./button"]).toBe("./src/button.ts");
  });

  test("vite federation exposes ./button", () => {
    const vite = readFileSync(join(pkgRoot, "vite.config.ts"), "utf8");
    expect(vite).toMatch(/["']\.\/button["']\s*:\s*["']\.\/src\/button\.ts["']/);
  });
});
