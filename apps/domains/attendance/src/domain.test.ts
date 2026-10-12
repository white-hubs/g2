import type { MenuContributionNode } from "@g2-composition/contract";
import { assertDomainModule } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domain from "./domain";
import inventory from "./migration-inventory.json";

function leaves(nodes: MenuContributionNode[]): MenuContributionNode[] {
  return nodes.flatMap((node) => (node.children?.length ? leaves(node.children) : [node]));
}
describe("考勤管理完整迁移路由", () => {
  test("菜单顺序、分组及跨应用入口完整保留", () => {
    expect(domain.menuContribution?.[0]?.children).toEqual(inventory.menus);
    expect(leaves(domain.menuContribution ?? [])).toHaveLength(29);
    expect(domain.routes.some((route) => route.path === "/d/attendance/flow-config")).toBe(true);
    expect(domain.routes.some((route) => route.path === "/d/attendance/approval-record")).toBe(true);
  });
  test("旧路由及菜单外页面都有独立路由，隐藏路由保持列表高亮", () => {
    expect(() => assertDomainModule(domain)).not.toThrow();
    const paths = new Set(domain.routes.map((route) => route.path));
    for (const route of inventory.routes) {
      expect(paths.has(`/d/attendance/${route.entry}`)).toBe(true);
    }
    const menuPaths = new Set(leaves(domain.menuContribution ?? []).map((item) => item.path));
    for (const route of domain.routes) {
      if (route.meta?.hideInMenu) {
        expect(menuPaths.has(String(route.meta.activeMenuPath))).toBe(true);
      }
    }
    expect(paths.has("/d/attendance/change-ledger")).toBe(true);
    expect(paths.has("/d/attendance/attendance-ledger-state")).toBe(true);
    expect(paths.size).toBe(domain.routes.length);
  });
});
