import { describe, expect, test } from "bun:test";

import { findRuntimeCommonFallbacks } from "./check";

describe("runtime common artifact check", () => {
  test("reports an emitted local fallback", () => {
    expect(findRuntimeCommonFallbacks("assets/domain.js", "canonical:`default:@g2-platform/pc-ui`", ["@g2-platform/pc-ui"])).toEqual([
      { file: "assets/domain.js", packageName: "@g2-platform/pc-ui" },
    ]);
  });

  test("does not reject a remote-only share reference", () => {
    expect(
      findRuntimeCommonFallbacks("assets/import-map.js", '"@g2-platform/pc-ui": async () => loadRemote()', ["@g2-platform/pc-ui"]),
    ).toEqual([]);
  });
});
