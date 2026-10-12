import * as CompositionContract from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("@g2-domain/work-order-center", () => {
  test("preserves the supplied work-order-center menu order and routes", () => {
    const result = CompositionContract.assertDomainModule(domainModule);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const menuItems = result.module.menuContribution?.[0]?.children ?? [];
    expect(menuItems.map((item) => item.label)).toEqual(["工单删除", "工单统计"]);
    expect(menuItems.map((item) => item.path)).toEqual([
      "/d/work-order-center/work-order-list",
      "/d/work-order-center/work-order-statistics",
    ]);
    expect(result.module.routes.filter((route) => route.meta?.hideInMenu)).toHaveLength(0);
  });

  test("loads date Runtime Common before pcUi platform and client", async () => {
    const calls: string[] = [];
    const context = CompositionContract.createFakeDomainContext({
      loadRuntimeCommon: async <T>(name: string, entry: string): Promise<T> => {
        calls.push(`runtime:${name}:${entry}`);
        return {} as T;
      },
      loadPlatform: async (name: string, entry: string) => {
        calls.push(`platform:${name}:${entry}`);
        return {};
      },
      ensureClient: async <T>(name: string): Promise<T> => {
        calls.push(`client:${name}`);
        return {} as T;
      },
    });

    await domainModule.install?.(CompositionContract.createFakeApp(), context);

    expect(calls).toEqual(["runtime:datePlatform:api", "platform:pcUi:platform", "client:workOrderCenterClient"]);
  });
});
