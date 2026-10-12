import { assertDomainModule } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("emergency-dispatch OUAA routes", () => {
  test("keeps the supplied hierarchy and hosts equipment association locally", () => {
    const asserted = assertDomainModule(domainModule);
    expect(asserted.ok).toBe(true);
    if (!asserted.ok) return;

    expect(asserted.module.routes.map((route) => route.path)).toEqual(
      expect.arrayContaining([
        "/d/emergency-dispatch/evacuation-command",
        "/d/emergency-dispatch/evacuation-route-config",
        "/d/emergency-dispatch/resource-list",
        "/d/emergency-dispatch/equipment-association",
      ]),
    );
    expect(asserted.module.menuContribution?.[0]?.children).toEqual([
      {
        label: "疏散引导",
        children: [
          { label: "疏散指挥", entry: "evacuation-command", path: "/d/emergency-dispatch/evacuation-command" },
          { label: "路线配置", entry: "evacuation-route-config", path: "/d/emergency-dispatch/evacuation-route-config" },
        ],
      },
      { label: "资源管理", entry: "resource-list", path: "/d/emergency-dispatch/resource-list" },
      { label: "设备关联", entry: "equipment-association", path: "/d/emergency-dispatch/equipment-association" },
    ]);
  });
});
