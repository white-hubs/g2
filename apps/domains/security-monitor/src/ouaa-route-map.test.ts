import { describe, expect, test } from "bun:test";

import domainModule from "./domain";
import { SECURITY_MONITOR_DEFERRED_OUAA_ROUTES, SECURITY_MONITOR_OUAA_ROUTE_MAP } from "./ouaa-route-map";

function collectMenuPaths(nodes: NonNullable<typeof domainModule.menuContribution>): string[] {
  return nodes.flatMap((node) => [node.path, ...collectMenuPaths(node.children ?? [])]).filter((path): path is string => Boolean(path));
}

describe("security-monitor OUAA route map", () => {
  test("maps every migrated attachment route to a registered G2 route", () => {
    const registered = new Set(domainModule.routes.map((route) => route.path));
    for (const target of Object.values(SECURITY_MONITOR_OUAA_ROUTE_MAP)) {
      expect(registered.has(target)).toBe(true);
    }
  });

  test("does not expose deferred legacy applications in the G2 menu", () => {
    const menuPaths = collectMenuPaths(domainModule.menuContribution ?? []);
    for (const path of SECURITY_MONITOR_DEFERRED_OUAA_ROUTES) {
      expect(menuPaths).not.toContain(path);
    }
    expect(menuPaths).not.toContain("/d/security-monitor/applicationEquipment");
  });
});
