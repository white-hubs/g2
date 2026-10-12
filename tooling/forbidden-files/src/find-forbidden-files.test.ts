import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { findForbiddenFiles } from "./find-forbidden-files";

const tmpRoot = join(import.meta.dirname, ".tmp-forbidden-fixture");

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("findForbiddenFiles", () => {
  test("找出黑名单源码与工具链配置，跳过 node_modules 与 dist", () => {
    mkdirSync(join(tmpRoot, "src"), { recursive: true });
    mkdirSync(join(tmpRoot, "node_modules", "pkg"), { recursive: true });
    mkdirSync(join(tmpRoot, "dist"), { recursive: true });
    writeFileSync(join(tmpRoot, "src", "A.vue"), "<template></template>");
    writeFileSync(join(tmpRoot, "src", "legacy.js"), "export {}");
    writeFileSync(join(tmpRoot, "src", "Ok.tsx"), "export {}");
    writeFileSync(join(tmpRoot, ".eslintrc.json"), "{}");
    writeFileSync(join(tmpRoot, "eslint.config.mjs"), "export default []");
    writeFileSync(join(tmpRoot, "biome.json"), "{}");
    writeFileSync(join(tmpRoot, "node_modules", "pkg", "x.js"), "export {}");
    writeFileSync(join(tmpRoot, "dist", "out.js"), "export {}");

    const found = findForbiddenFiles([tmpRoot]);
    expect(found).toEqual(
      [
        join(tmpRoot, ".eslintrc.json"),
        join(tmpRoot, "biome.json"),
        join(tmpRoot, "eslint.config.mjs"),
        join(tmpRoot, "src", "A.vue"),
        join(tmpRoot, "src", "legacy.js"),
      ].toSorted(),
    );
  });
});
