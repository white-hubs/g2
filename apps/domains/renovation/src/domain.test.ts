import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import domain from "./domain";

test("更新改造菜单对齐 OUAA 两项，隐藏路由高亮所属入口", () => {
  expect(assertDomainModule(domain).ok).toBe(true);
  const menu = domain.menuContribution?.[0]?.children ?? [];
  expect(domain.menuContribution?.[0]?.iconKey).toBe("renovation");
  expect(menu.map((item) => item.label)).toEqual(["更新改造单", "流程配置"]);
  const flowRender = domain.routes.find((item) => item.path === "/d/renovation/flow-render");
  expect(flowRender?.meta?.hideInMenu).toBe(true);
  expect(flowRender?.meta?.activeMenuPath).toBe("/d/renovation/renovation-list");
  expect(domain.routes.find((item) => item.path === "/d/renovation")?.redirect).toBe("/d/renovation/renovation-list");
});

test("仅注册菜单内路由；工单与配置页只保留代码模块", () => {
  const paths = domain.routes.map((item) => item.path);
  expect(paths).toEqual(["/d/renovation", "/d/renovation/renovation-list", "/d/renovation/flow-config", "/d/renovation/flow-render"]);
  expect(paths.some((path) => path.includes("renovation-order") || path.includes("traffic") || path.includes("message-notice"))).toBe(
    false,
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
  expect(calls).toEqual(["runtime:pcUi:index", "platform:pcUi:platform", "client:renovationClient", "client:streamEngineClient"]);
});
