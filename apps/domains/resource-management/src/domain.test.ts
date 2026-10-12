import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import domain from "./domain";

test("资源管理仅为给定菜单注册路由，旧工程其他页面保留为可发布模块", () => {
  expect(assertDomainModule(domain).ok).toBe(true);
  expect(domain.menuContribution?.[0]?.children?.map((item) => item.label)).toEqual(["物品查询"]);
  expect(domain.routes.filter((route) => route.component).map((route) => route.path)).toEqual(["/d/resource-management/stuff-search"]);
});

test("先加载 pcUi Runtime Common，再初始化 pcUi 平台", async () => {
  const calls: string[] = [];
  const ctx = createFakeDomainContext({
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
  await domain.install?.(createFakeApp(), ctx);
  expect(calls).toEqual(["runtime:pcUi:index", "platform:pcUi:platform", "client:resourceManagementClient"]);
});
