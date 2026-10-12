import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import domain from "./domain";

test("故障报修菜单保持 OUAA 顺序且隐藏路由高亮所属入口", () => {
  expect(assertDomainModule(domain).ok).toBe(true);
  const menu = domain.menuContribution?.[0]?.children ?? [];
  expect(menu.map((item) => item.label)).toEqual(["故障单", "故障案例", "故障报告", "报修记录", "故障配置", "统计分析", "流程配置"]);
  expect(menu[4]?.children?.map((item) => item.label)).toEqual(["故障类型@"]);
  expect(menu[5]?.children?.map((item) => item.label)).toEqual(["故障报修工单统计@", "故障报修人员统计@"]);
  expect(domain.routes.find((item) => item.path === "/d/fault-repair/flow-render")?.meta?.activeMenuPath).toBe(
    "/d/fault-repair/fault-list",
  );
  expect(domain.routes.find((item) => item.path === "/d/fault-repair/record-flow-render")?.meta?.activeMenuPath).toBe(
    "/d/fault-repair/fault-record",
  );
  expect(domain.routes.find((item) => item.path === "/d/fault-repair/fault-case-operate")?.meta?.activeMenuPath).toBe(
    "/d/fault-repair/fault-case",
  );
});

test("先加载 pcUi Runtime Common，再初始化平台和客户端", async () => {
  const calls: string[] = [];
  const context = createFakeDomainContext({
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
  await domain.install?.(createFakeApp(), context);
  expect(calls).toEqual(["runtime:pcUi:index", "platform:pcUi:platform", "client:faultRepairClient", "client:streamEngineClient"]);
});
