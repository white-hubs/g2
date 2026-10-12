import { assertDomainModule } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("@g2-domain/access-control domain module", () => {
  test("routes and menuContribution pass contract assert", () => {
    const asserted = assertDomainModule(domainModule);
    expect(asserted.ok).toBe(true);
    if (!asserted.ok) return;
    const paths = asserted.module.routes.map((r) => r.path).filter(Boolean);
    expect(paths).toContain("/d/access-control");
    expect(paths).toContain("/d/access-control/devices");
    expect(paths).toContain("/d/access-control/equipmentMonitorList");
    expect(paths).toContain("/d/access-control/alarmRecord");
    expect(paths).toContain("/d/access-control/configuration");
    expect(asserted.module.menuContribution?.[0]?.children?.some((c) => c.entry === "equipmentMonitorList")).toBe(true);
  });
});
