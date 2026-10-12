import { assertDomainModule } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("broadcast-center OUAA routes", () => {
  test("hosts device monitor and broadcast device pages instead of legacy GEM URLs", () => {
    const asserted = assertDomainModule(domainModule);
    expect(asserted.ok).toBe(true);
    if (!asserted.ok) return;

    expect(asserted.module.routes.map((route) => route.path)).toEqual(
      expect.arrayContaining([
        "/d/broadcast-center/equipment-monitor",
        "/d/broadcast-center/equipment-monitor-detail",
        "/d/broadcast-center/application-equipment",
      ]),
    );
    expect(asserted.module.menuContribution?.[0]?.children?.map((item) => item.label)).toEqual([
      "设备监测",
      "广播记录",
      "广播模板",
      "广播规则",
      "广播设备",
    ]);
  });
});
