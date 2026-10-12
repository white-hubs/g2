import { createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";
import { APPLICATION_CODE_KEY, DOMAIN_CONTEXT_KEY } from "./domain-context";

describe("@g2-domain/access-control install", () => {
  test("loads pcUi/pcChart and provides DomainContext + applicationCode", async () => {
    const loaded: string[] = [];
    const provided: [unknown, unknown][] = [];
    const ctx = createFakeDomainContext({
      loadPlatform: async (name: string, exposedPath: string) => {
        loaded.push(`${name}:${exposedPath}`);
        return {};
      },
      loadRuntimeCommon: async () => ({}),
    });
    const app = createFakeApp();
    app.provide = ((key: unknown, value: unknown) => {
      provided.push([key, value]);
    }) as typeof app.provide;

    await domainModule.install?.(app, ctx, { applicationCode: "ACCESS_CONTROL" });
    expect(loaded).toEqual([
      "pcUi:platform",
      "pcChart:platform",
      "pcPlayer:platform",
      "pcScada:platform",
      "pcMap:platform",
      "pcIotSocket:platform",
      "pcAlarmCharts:platform",
      "pcGraphEditor:platform",
      "pcVisualSdk:platform",
    ]);
    expect(provided.some(([k, v]) => k === DOMAIN_CONTEXT_KEY && v === ctx)).toBe(true);
    expect(provided.some(([k, v]) => k === APPLICATION_CODE_KEY && v === "ACCESS_CONTROL")).toBe(true);
  });

  test("loads shared pages from the pageLibrary slot instead of bundling their implementation", async () => {
    const loadedPages: string[] = [];
    const ctx = createFakeDomainContext({
      loadPlatform: async () => ({}),
      loadRuntimeCommon: async () => ({}),
      loadPageLibrary: async (name, exposedPath) => {
        loadedPages.push(`${name}:${exposedPath}`);
        if (exposedPath === "contractInfo") {
          return { contractInfo: { name: "generic-equipment-monitor", major: 1 } };
        }
        return { default: { name: exposedPath, render: () => null } };
      },
    });
    await domainModule.install?.(createFakeApp(), ctx, { applicationCode: "DOORMANAGE" });
    expect(loadedPages).toEqual([]);

    const route = domainModule.routes.find((item) => item.path === "/d/access-control/alarmRecord");
    if (!route || typeof route.component !== "function") {
      throw new Error("alarmRecord route component is missing");
    }
    await route.component();
    expect(loadedPages).toEqual(["genericEquipmentMonitorPages:AlarmRecord", "genericEquipmentMonitorPages:contractInfo"]);
  });
});
