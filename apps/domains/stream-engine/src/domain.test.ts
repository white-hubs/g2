import { assertDomainModule } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import domain from "./domain";

test("流引擎 Domain 挂表单管理菜单，设计页带 activeMenuPath", () => {
  expect(assertDomainModule(domain).ok).toBe(true);
  const menu = domain.menuContribution?.[0]?.children ?? [];
  expect(menu.map((item) => item.label)).toEqual(["表单管理"]);
  expect(menu[0]?.path).toBe("/d/stream-engine/flowform");
  const design = domain.routes.find((item) => item.path === "/d/stream-engine/admin/design");
  expect(design?.meta?.hideInMenu).toBe(true);
  expect(design?.meta?.activeMenuPath).toBe("/d/stream-engine/flowform");
});
