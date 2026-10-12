import { assertDomainModule } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("@g2-domain/factory-management", () => {
  test("keeps the supplied park menu hierarchy and order", () => {
    const result = assertDomainModule(domainModule);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const root = result.module.menuContribution?.[0];
    expect(root?.children?.map((item) => item.label)).toEqual(["园区总览", "客户管理", "房间管理", "走访诉求", "租赁管理", "运营监管"]);
    expect(root?.children?.[1]?.children?.map((item) => item.label)).toEqual(["企业信息", "企业名录", "行业类型"]);
    expect(root?.children?.[5]?.children?.map((item) => item.label)).toEqual(["招商计划", "项目管理", "物业管理", "企业投诉", "租控记录"]);
  });

  test("keeps all record forms hidden while preserving their owning menu", () => {
    const hidden = domainModule.routes.filter((route) => route.meta?.hideInMenu);
    expect(hidden).toHaveLength(5);
    expect(hidden.every((route) => typeof route.meta?.activeMenuPath === "string" && route.meta.activeMenuPath.length > 0)).toBe(true);
  });
});
