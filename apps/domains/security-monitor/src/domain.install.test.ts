import { createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";
import { APPLICATION_CODE_KEY, DOMAIN_CONTEXT_KEY } from "./domain-context";

describe("@g2-domain/security-monitor install", () => {
  test("loads shared platforms and security monitor client", async () => {
    const loaded: string[] = [];
    const loadedCommon: string[] = [];
    const callOrder: string[] = [];
    const ensured: string[] = [];
    const provided: [unknown, unknown][] = [];
    const ctx = createFakeDomainContext({
      loadPlatform: async (name: string, exposedPath: string) => {
        loaded.push(`${name}:${exposedPath}`);
        callOrder.push(`platform:${name}:${exposedPath}`);
        return {};
      },
      loadRuntimeCommon: async (name: string, exposedPath: string) => {
        loadedCommon.push(`${name}:${exposedPath}`);
        callOrder.push(`runtime:${name}:${exposedPath}`);
        return {};
      },
      ensureClient: async (name: string) => {
        ensured.push(name);
        return {};
      },
    });
    const app = createFakeApp();
    app.provide = ((key: unknown, value: unknown) => provided.push([key, value])) as typeof app.provide;

    await domainModule.install?.(app, ctx, { applicationCode: "SECURITY_MONITORING" });

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
    expect(loadedCommon).toEqual(["pcUi:index", "pcChart:index"]);
    expect(callOrder.slice(0, 3)).toEqual(["runtime:pcUi:index", "platform:pcUi:platform", "runtime:pcChart:index"]);
    expect(ensured).toEqual(["securityMonitorClient", "videoMonitorClient"]);
    expect(provided.some(([key, value]) => key === DOMAIN_CONTEXT_KEY && value === ctx)).toBe(true);
    expect(provided.some(([key, value]) => key === APPLICATION_CODE_KEY && value === "SECURITY_MONITORING")).toBe(true);
  });

  test("loads shared pages from the pageLibrary slot only when their routes are opened", async () => {
    const loadedPages: string[] = [];
    const ctx = createFakeDomainContext({
      loadPlatform: async () => ({}),
      loadRuntimeCommon: async () => ({}),
      ensureClient: async () => ({}),
      loadPageLibrary: async (name, exposedPath) => {
        loadedPages.push(`${name}:${exposedPath}`);
        if (exposedPath === "contractInfo") {
          return { contractInfo: { name: "generic-equipment-monitor", major: 1 } };
        }
        return { default: { name: exposedPath, render: () => null } };
      },
      getFunctionCodes: () => new Set(["security-monitor:alarm-record:view"]),
    });
    await domainModule.install?.(createFakeApp(), ctx, { applicationCode: "SECURITY_MONITORING" });
    expect(loadedPages).toEqual([]);

    const route = domainModule.routes.find((item) => item.path === "/d/security-monitor/alarmPage");
    if (!route || typeof route.component !== "function") {
      throw new Error("alarmPage route component is missing");
    }
    await route.component();
    expect(loadedPages).toEqual(["genericEquipmentMonitorPages:AlarmRecord", "genericEquipmentMonitorPages:contractInfo"]);

    const equipmentAssociationRoute = domainModule.routes.find((item) => item.path === "/d/security-monitor/equipment-association");
    if (!equipmentAssociationRoute || typeof equipmentAssociationRoute.component !== "function") {
      throw new Error("equipment association route component is missing");
    }
    await equipmentAssociationRoute.component();
    expect(loadedPages).toEqual([
      "genericEquipmentMonitorPages:AlarmRecord",
      "genericEquipmentMonitorPages:contractInfo",
      "genericEquipmentMonitorPages:EquipmentAssociation",
      "genericEquipmentMonitorPages:contractInfo",
    ]);
  });

  test("returns a diagnosable page when the page-library contract major is incompatible", async () => {
    const ctx = createFakeDomainContext({
      loadPlatform: async () => ({}),
      loadRuntimeCommon: async () => ({}),
      ensureClient: async () => ({}),
      loadPageLibrary: async (_name, exposedPath) =>
        exposedPath === "contractInfo"
          ? { contractInfo: { name: "generic-equipment-monitor", major: 2 } }
          : { default: { render: () => null } },
    });
    await domainModule.install?.(createFakeApp(), ctx);
    const route = domainModule.routes.find((item) => item.path === "/d/security-monitor/alarmPage");
    if (!route || typeof route.component !== "function") {
      throw new Error("alarmPage route component is missing");
    }
    const loaded = (await route.component()) as { name?: string };
    expect(loaded.name).toBe("SecurityMonitorPageLibraryLoadError");
  });
});
