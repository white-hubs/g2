import { createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domain from "./domain";

describe("fumigation operation domain", () => {
  test("keeps the provided menu order and nested groups", () => {
    const root = domain.menuContribution?.[0];
    expect(root?.label).toBe("熏蒸作业");
    expect(root?.children?.map((item) => item.label)).toEqual(["作业列表", "实时态势", "熏蒸报警", "统计分析", "熏蒸设备"]);
    expect(root?.children?.[2]?.children?.map((item) => item.label)).toEqual(["报警记录", "报警配置"]);
    expect(root?.children?.[3]?.children?.map((item) => item.label)).toEqual(["报警统计", "报警处理统计", "报警分析"]);
  });

  test("keeps workflow routes hidden while preserving the work-list menu", () => {
    const hidden = domain.routes.filter((route) => route.meta?.hideInMenu);
    expect(hidden.length).toBeGreaterThanOrEqual(7);
    expect(hidden.filter((route) => String(route.path).includes("alarm")).every((route) => route.meta?.activeMenuPath)).toBe(true);
    expect(
      hidden
        .filter((route) => !String(route.path).includes("alarm"))
        .every((route) => route.meta?.activeMenuPath === "/d/fumigation-operation/works"),
    ).toBe(true);
  });

  test("loads every Runtime Common provider before its Platform and business Client", async () => {
    const calls: string[] = [];
    const providers = ["pcUi", "pcChart", "pcPlayer", "pcMap", "pcIotSocket", "pcAlarmCharts", "pcScada", "pcGraphEditor", "pcVisualSdk"];
    const context = createFakeDomainContext({
      loadRuntimeCommon: async <T>(name: string, exposed: string): Promise<T> => {
        calls.push(`runtime:${name}:${exposed}`);
        return {} as T;
      },
      loadPlatform: async (name: string, exposed: string) => {
        calls.push(`${name}:${exposed}`);
        return {};
      },
      ensureClient: async <T>(name: string): Promise<T> => {
        calls.push(name);
        return {} as T;
      },
    });

    await domain.install?.(createFakeApp(), context);
    expect(calls.slice(0, providers.length)).toEqual(providers.map((name) => `runtime:${name}:index`));
    expect(calls.slice(providers.length, providers.length * 2)).toEqual(providers.map((name) => `${name}:platform`));
    expect(calls.at(-1)).toBe("fumigationOperationClient");
  });
});
