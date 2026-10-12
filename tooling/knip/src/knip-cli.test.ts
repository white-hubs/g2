import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("knip tooling package", () => {
  test("暴露可发现的配置与 check 脚本入口", () => {
    const root = resolve(import.meta.dirname, "..");
    expect(existsSync(resolve(root, "knip.json"))).toBe(true);
    expect(existsSync(resolve(root, "src/cli.ts"))).toBe(true);
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { scripts?: { check?: string } };
    expect(pkg.scripts?.check).toContain("cli.ts");
  });
});
