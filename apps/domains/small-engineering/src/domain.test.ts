import { assertDomainModule } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import domain from "./domain";

test("小散工程菜单包含旧应用及 DAILY 菜单入口，详情路由保持菜单高亮", () => {
  expect(assertDomainModule(domain).ok).toBe(true);
  const children = domain.menuContribution?.[0]?.children ?? [];
  expect(children.map((item) => item.label)).toEqual([
    "工程管理",
    "工程请示",
    "工程审批",
    "工程监管",
    "工程整改",
    "工程巡查",
    "业务设置",
    "工程巡查DAILY",
    "业务配置DAILY",
  ]);
  expect(domain.routes.find((item) => item.path === "/d/small-engineering")?.redirect).toBe("/d/small-engineering/manage");
  expect(domain.routes.find((item) => item.path === "/d/small-engineering/manage-detail")?.meta?.activeMenuPath).toBe(
    "/d/small-engineering/manage",
  );
  expect(domain.routes.find((item) => item.path === "/d/small-engineering/engineering-patrol-plan-edit")?.meta?.hideInMenu).toBe(true);
});
