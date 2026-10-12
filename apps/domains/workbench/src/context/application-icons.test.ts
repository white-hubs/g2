import { describe, expect, test } from "bun:test";

import { buildApplicationIconMap, resolveFrequentMenuIcon } from "./application-icons";

describe("application icons", () => {
  test("从应用分组构建 code 到 icon 的映射", () => {
    expect(
      buildApplicationIconMap([
        {
          apps: [
            { code: "HAZARD", icon: "/resource/hazard.png" },
            { code: "EMPTY", icon: "" },
          ],
        },
        { apps: [{ code: "DAILY", icon: "/resource/daily.png" }] },
      ]),
    ).toEqual({ HAZARD: "/resource/hazard.png", DAILY: "/resource/daily.png" });
  });

  test("快捷菜单优先自身图标，缺失时回退所属应用图标", () => {
    const icons = { HAZARD: "/resource/hazard.png" };
    expect(resolveFrequentMenuIcon({ applicationCode: "HAZARD", icon: "/resource/menu.png" }, icons)).toBe("/resource/menu.png");
    expect(resolveFrequentMenuIcon({ applicationCode: "HAZARD" }, icons)).toBe("/resource/hazard.png");
    expect(resolveFrequentMenuIcon({ applicationCode: "UNKNOWN" }, icons)).toBe("");
  });
});
