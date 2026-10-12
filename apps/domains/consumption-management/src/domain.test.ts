import { assertDomainModule } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("@g2-domain/consumption-management", () => {
  test("菜单保留旧系统顺序、编码及目标路由", () => {
    const result = assertDomainModule(domainModule);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const items = result.module.menuContribution?.[0]?.children ?? [];
    expect(items.map((item) => item.label)).toEqual(["账户管理", "份变更明细", "金额变更明细", "我的消费记录"]);
    expect(items.map((item) => item.entry)).toEqual(["01", "03", "02", "PersonRecord"]);
    expect(items.map((item) => item.path)).toEqual([
      "/d/consumption-management/accountmanagement",
      "/d/consumption-management/partchange",
      "/d/consumption-management/moneychange",
      "/d/consumption-management/person-record",
    ]);
  });

  test("账户详情仍高亮账户管理菜单", () => {
    const route = domainModule.routes.find((item) => item.name === "consumption-management-account-details");
    expect(route?.meta?.hideInMenu).toBe(true);
    expect(route?.meta?.activeMenuPath).toBe("/d/consumption-management/accountmanagement");
  });
});
