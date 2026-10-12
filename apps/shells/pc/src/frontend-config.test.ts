import { describe, expect, test } from "bun:test";

import {
  buildFrontendConfigUrl,
  loadAndApplyFrontendConfig,
  mergeFrontendConfigIntoWindowConfig,
  parseFrontendConfigVariable,
  resolveQiankunAppNameFromEntry,
} from "./frontend-config";
import { BIMOPS_PC_TERMINAL } from "./legacy-constants";

describe("buildFrontendConfigUrl", () => {
  test("拼出字典 FRONTEND_CONFIG 查询串，code 默认 bimops-manage-web", () => {
    expect(buildFrontendConfigUrl()).toBe(
      `/api/dictionary/getSysDictionaryByCodeAndItemCode?itemCode=FRONTEND_CONFIG&code=${BIMOPS_PC_TERMINAL}`,
    );
  });
});

describe("parseFrontendConfigVariable", () => {
  test("解析 variable JSON 字符串；非法则 null", () => {
    expect(parseFrontendConfigVariable('{"homeEntry":"/apps/@ghcloud/cube-workbench-app/"}')).toEqual({
      homeEntry: "/apps/@ghcloud/cube-workbench-app/",
    });
    expect(parseFrontendConfigVariable("")).toBeNull();
    expect(parseFrontendConfigVariable("not-json")).toBeNull();
    expect(parseFrontendConfigVariable("[]")).toBeNull();
  });
});

describe("mergeFrontendConfigIntoWindowConfig", () => {
  test("字典字段覆盖；本地 feature 优先", () => {
    expect(
      mergeFrontendConfigIntoWindowConfig(
        { homeEntry: "/old/", feature: { keep: true, a: 1 } },
        {
          homeEntry: "/apps/@ghcloud/cube-workbench-app/",
          microApps: [{ name: "x", entry: "/apps/x" }],
          feature: { a: 2, b: 3 },
        },
      ),
    ).toEqual({
      homeEntry: "/apps/@ghcloud/cube-workbench-app/",
      microApps: [{ name: "x", entry: "/apps/x" }],
      feature: { a: 1, b: 3, keep: true },
    });
  });
});

describe("resolveQiankunAppNameFromEntry", () => {
  test("取 entry 最后一段为 qiankun name", () => {
    expect(resolveQiankunAppNameFromEntry("/apps/@ghcloud/cube-workbench-app/")).toBe("cube-workbench-app");
    expect(resolveQiankunAppNameFromEntry("/apps-legacy/workbench-migrate")).toBe("workbench-migrate");
  });
});

describe("loadAndApplyFrontendConfig", () => {
  test("拉取成功后写入 window.config.homeEntry / microApps", async () => {
    const target = {
      config: { homeEntry: "/fallback/" } as Record<string, unknown>,
      document: { title: "" },
    };
    const result = await loadAndApplyFrontendConfig(target as unknown as Window & { config?: Record<string, unknown> }, async () => ({
      variable: JSON.stringify({
        homeEntry: "/apps/@ghcloud/cube-workbench-app/",
        microApps: [{ name: "message-center", entry: "/apps/@ghcloud/cube-message-center-app" }],
        systemName: "华威集团-ghy",
      }),
    }));
    expect(result?.homeEntry).toBe("/apps/@ghcloud/cube-workbench-app/");
    expect(target.config.homeEntry).toBe("/apps/@ghcloud/cube-workbench-app/");
    expect(target.config.microApps).toEqual([{ name: "message-center", entry: "/apps/@ghcloud/cube-message-center-app" }]);
    expect(target.document.title).toBe("华威集团-ghy");
  });

  test("请求失败时保留原 config", async () => {
    const target = {
      config: { homeEntry: "/fallback/" } as Record<string, unknown>,
      document: { title: "" },
    };
    const result = await loadAndApplyFrontendConfig(target as unknown as Window & { config?: Record<string, unknown> }, async () => {
      throw new Error("network");
    });
    expect(result).toBeNull();
    expect(target.config.homeEntry).toBe("/fallback/");
  });
});
