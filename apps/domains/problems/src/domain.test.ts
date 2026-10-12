import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import domain from "./domain";

test("隐患排查菜单遵循 OUAA 顺序，流程渲染隐藏路由带 activeMenuPath", () => {
  expect(assertDomainModule(domain).ok).toBe(true);
  const menu = domain.menuContribution?.[0]?.children ?? [];
  expect(menu.map((item) => item.label)).toEqual(["隐患单", "排查记录", "流程配置", "隐患配置", "统计分析"]);
  expect(menu[3]?.children?.map((item) => item.label)).toEqual(["隐患程度@", "隐患类型@"]);
  expect(menu[4]?.children?.map((item) => item.label)).toEqual(["隐患工单统计@", "隐患人员统计@"]);
  expect(menu[2]?.path).toBe("/d/problems/flow-config");
  const render = domain.routes.find((item) => item.path === "/d/problems/flow-render");
  expect(render?.meta?.hideInMenu).toBe(true);
  expect(render?.meta?.activeMenuPath).toBe("/d/problems/problems-list");
  const recordRender = domain.routes.find((item) => item.path === "/d/problems/record-flow-render");
  expect(recordRender?.meta?.hideInMenu).toBe(true);
  expect(recordRender?.meta?.activeMenuPath).toBe("/d/problems/problems-record");
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
  expect(calls).toEqual(["runtime:pcUi:index", "platform:pcUi:platform", "client:problemsClient", "client:streamEngineClient"]);
});
