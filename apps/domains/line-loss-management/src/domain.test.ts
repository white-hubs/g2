import { createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("line-loss-management domain", () => {
  test("严格保持线上菜单的一级顺序与分组", () => {
    expect(domainModule.menuContribution?.map((item) => item.label)).toEqual(["线损管理", "线损预警", "业务配置", "数据统计"]);
    expect(domainModule.menuContribution?.[1]?.children?.map((item) => item.label)).toEqual(["预警列表", "预警规则"]);
    expect(domainModule.menuContribution?.[2]?.children?.map((item) => item.label)).toEqual(["采集周期"]);
    expect(domainModule.menuContribution?.[3]?.children?.map((item) => item.label)).toEqual(["采集记录", "损耗统计"]);
    expect(domainModule.routes.map((route) => route.path)).toEqual([
      "/d/line-loss-management",
      "/d/line-loss-management/line-loss",
      "/d/line-loss-management/alarmRecord",
      "/d/line-loss-management/alarmDetail",
      "/d/line-loss-management/alarmConfigList",
      "/d/line-loss-management/alarmConfigureAdd",
      "/d/line-loss-management/power-relation",
      "/d/line-loss-management/drawing-management",
      "/d/line-loss-management/drawing-management-edit",
      "/d/line-loss-management/collection-cycle",
      "/d/line-loss-management/collection-record",
      "/d/line-loss-management/loss-statistics",
    ]);
    const hiddenPaths = domainModule.routes.filter((route) => route.meta?.hideInMenu).map((route) => route.path);
    expect(hiddenPaths).toContain("/d/line-loss-management/power-relation");
    expect(hiddenPaths).toContain("/d/line-loss-management/drawing-management");
    expect(hiddenPaths).toContain("/d/line-loss-management/drawing-management-edit");
  });

  test("pcUi 与 pcGraphEditor Runtime Common 在平台加载前就绪", async () => {
    const calls: string[] = [];
    const context = createFakeDomainContext({
      loadRuntimeCommon: async <T>(name: string, exposed: string): Promise<T> => {
        calls.push(`runtime:${name}:${exposed}`);
        return {} as T;
      },
      loadPlatform: async (name: string, exposed: string) => {
        calls.push(`${name}:${exposed}`);
        return {};
      },
    });

    await domainModule.install?.(createFakeApp(), context);
    expect(calls).toEqual(["runtime:pcUi:index", "runtime:pcGraphEditor:LineLoss", "pcUi:platform", "pcGraphEditor:platform"]);
  });
});
