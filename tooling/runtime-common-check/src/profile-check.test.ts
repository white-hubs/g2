import { describe, expect, test } from "bun:test";

import { findLoadedRuntimeNames, findStaticRuntimeCommonImports, validateRuntimeCommonMatrix } from "./profile-check";

describe("runtime common consumer inventory", () => {
  test("rejects runtime imports and re-exports of provider packages but allows type-only imports", () => {
    const source = `
      import { Button, type PcTableColumn } from "@g2-platform/pc-ui";
      import type { FormInstance } from "@g2-platform/pc-ui/forms";
      export { message } from "@g2-platform/pc-ui";
      const load = () => import("@g2-platform/pc-map");
    `;
    expect(findStaticRuntimeCommonImports(source, new Set(["@g2-platform/pc-ui", "@g2-platform/pc-map"]))).toEqual([
      "@g2-platform/pc-map",
      "@g2-platform/pc-ui",
    ]);
  });

  test("finds literal, typed, async-component, aliased and ordered platform dependencies", () => {
    const source = `
      await ctx.loadPlatform("pcUi", "platform");
      loadRuntimeCommon<typeof import("@g2-platform/pc-map")>("pcMap", "index");
      defineAsyncRuntimeCommonComponent(loadRuntimeCommon, "pcPlayer", "index", "CubePlayer");
      loadCharts("pcAlarmCharts", "index");
      for (const platform of ["pcScada", "pcVisualSdk"] as const) await ctx.loadPlatform(platform, "platform");
    `;
    expect([...findLoadedRuntimeNames(source)].toSorted()).toEqual([
      "pcAlarmCharts",
      "pcMap",
      "pcPlayer",
      "pcScada",
      "pcUi",
      "pcVisualSdk",
    ]);
  });

  test("rejects a production dependency that is not registered in the composition", () => {
    const errors = validateRuntimeCommonMatrix(
      {
        coreRuntime: [{ logicalName: "pcUi" }],
        platform: [{ logicalName: "pcUi" }],
        remotes: [{ logicalName: "pocRemotePc" }],
        pageLibrary: [],
      },
      [
        { logicalName: "pcUi", package: "@g2-platform/pc-ui" },
        { logicalName: "pocRemotePc", package: "@g2-domain/poc-remote-pc" },
      ],
      { consumers: { pocRemotePc: ["pcMap"] }, providers: { pcUi: [] }, platformProviders: {} },
    );
    expect(errors).toContain("pocRemotePc depends on unregistered provider pcMap");
  });
});
