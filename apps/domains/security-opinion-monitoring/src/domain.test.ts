import { describe, expect, test } from "bun:test";

import domain from "./domain";

describe("security opinion domain", () => {
  test("keeps all legacy routes", () => {
    expect(domain.routes[0]?.children?.map((route) => route.path)).toEqual([
      "",
      "opinions",
      "alerts",
      "statistics",
      "review-reports",
      "sources",
      "keywords",
      "recycle-bin",
    ]);
  });

  test("matches the production nested menu", () => {
    const children = domain.menuContribution?.[0]?.children ?? [];
    expect(children.map((item) => item.label)).toEqual(["舆情列表", "预警管理", "分析报告", "配置管理", "回收站"]);
    expect(children[2]?.children?.map((item) => item.label)).toEqual(["统计分析", "复盘报告"]);
    expect(children[3]?.children?.map((item) => item.label)).toEqual(["信源管理", "关键词配置"]);
  });
});
