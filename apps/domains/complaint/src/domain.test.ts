import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import domain from "./domain";

test("投诉建议菜单对齐 OUAA 且隐藏路由高亮所属入口", () => {
  expect(assertDomainModule(domain).ok).toBe(true);
  const menu = domain.menuContribution?.[0]?.children ?? [];
  expect(menu.map((item) => item.label)).toEqual(["投诉建议", "投诉建议记录", "业务配置", "流程配置", "统计分析"]);
  expect(menu[2]?.children?.map((item) => item.label)).toEqual(["类型配置@"]);
  expect(menu[4]?.children?.map((item) => item.label)).toEqual(["投诉建议工单统计@", "投诉建议人员统计@"]);
  expect(domain.routes.find((item) => item.path === "/d/complaint/flow-render")?.meta?.activeMenuPath).toBe("/d/complaint/fault-list");
  expect(domain.routes.find((item) => item.path === "/d/complaint/record-flow-render")?.meta?.activeMenuPath).toBe(
    "/d/complaint/fault-record",
  );
});

test("先加载 pcUi Runtime Common，再初始化平台与客户端", async () => {
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
