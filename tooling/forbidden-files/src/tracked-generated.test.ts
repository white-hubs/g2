import { describe, expect, test } from "bun:test";

import { findTrackedGeneratedPaths } from "./tracked-generated";

describe("findTrackedGeneratedPaths", () => {
  test("标出被版本跟踪的生成目录与临时文件", () => {
    const tracked = [
      "apps/shells/pc/src/main.ts",
      "apps/shells/pc/dist/index.html",
      "packages/config/foo/lib/index.js",
      "tooling/x/build/out.txt",
      "apps/foo/out/a.js",
      "packages/a/tsconfig.tsbuildinfo",
      "apps/shells/pc/vite.config.ts.timestamp-123.mjs",
      "apps/platforms/http/.vite/deps/vue.js",
      "deploy/compositions/.resolved/dev.pc.resolved.json",
      ".deploy-out/prod/registry.yaml",
      "docs/adr/0056.md",
    ];
    expect(findTrackedGeneratedPaths(tracked)).toEqual(
      [
        ".deploy-out/prod/registry.yaml",
        "apps/foo/out/a.js",
        "apps/platforms/http/.vite/deps/vue.js",
        "apps/shells/pc/dist/index.html",
        "apps/shells/pc/vite.config.ts.timestamp-123.mjs",
        "deploy/compositions/.resolved/dev.pc.resolved.json",
        "packages/a/tsconfig.tsbuildinfo",
        "packages/config/foo/lib/index.js",
        "tooling/x/build/out.txt",
      ].toSorted(),
    );
  });
});
