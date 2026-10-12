import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("energy-consumption OUAA routes", () => {
  test("hosts the supplied GEM alarm pages in the energy domain", () => {
    const asserted = assertDomainModule(domainModule);
    expect(asserted.ok).toBe(true);
    if (!asserted.ok) return;

    expect(asserted.module.routes.map((route) => route.path)).toEqual(
      expect.arrayContaining([
        "/d/energy-consumption/alarm-record",
        "/d/energy-consumption/alarm-config-list",
        "/d/energy-consumption/alarm-detail",
        "/d/energy-consumption/alarm-configure",
      ]),
    );
    expect(asserted.module.menuContribution?.map((item) => item.label)).toEqual([
      "能耗总览",
      "计量设备",
      "设备报警",
      "能耗分析",
      "能耗报表",
      "能耗设置",
      "能耗费用",
    ]);
  });

  test("loads pcUi Runtime Common before the shared platform and clients", async () => {
    const calls: string[] = [];
    const ctx = createFakeDomainContext({
      loadRuntimeCommon: async <T>(name: string, entry: string): Promise<T> => {
        calls.push(`runtime:${name}:${entry}`);
        return {} as T;
      },
      loadPlatform: async (name: string, entry: string) => {
        calls.push(`${name}:${entry}`);
        return {};
      },
      ensureClient: async <T>(name: string): Promise<T> => {
        calls.push(name);
        return {} as T;
      },
    });

    await domainModule.install?.(createFakeApp(), ctx);
    expect(calls).toEqual(["runtime:pcUi:index", "pcUi:platform", "pcChart:platform", "pcPlayer:platform", "energyConsumptionClient"]);
  });
});
