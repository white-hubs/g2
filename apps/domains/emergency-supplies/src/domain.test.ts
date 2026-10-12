import { assertDomainModule } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import domainModule from "./domain";

test("应急物资菜单严格保留旧菜单顺序和层级", () => {
  expect(assertDomainModule(domainModule).ok).toBe(true);
  const root = domainModule.menuContribution?.[0];
  expect(root?.label).toBe("应急物资");
  expect(root?.children?.map((item) => item.label)).toEqual(["物资台帐", "物资调用", "物资分布图", "基础配置"]);
  expect(root?.children?.[3]?.children?.map((item) => item.label)).toEqual(["仓库管理", "物资类别", "预警规则"]);
});

test("每个菜单路径都有对应路由", () => {
  const routePaths = new Set(domainModule.routes.map((route) => route.path));
  const visit = (nodes = domainModule.menuContribution ?? []): void => {
    for (const node of nodes) {
      if (node.path) {
        expect(routePaths.has(node.path)).toBe(true);
      }
      visit(node.children ?? []);
    }
  };
  visit();
});
