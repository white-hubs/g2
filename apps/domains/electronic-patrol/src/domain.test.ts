import { createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import domain from "./domain";

test("电子巡更菜单严格遵循旧 OUAA 顺序", () => {
  const root = domain.menuContribution?.[0];
  expect(root?.children?.map((item) => item.entry)).toEqual(["01", "02", "03", "4", "6"]);
  expect(root?.children?.[3]?.children?.map((item) => item.entry)).toEqual(["5", "2", "3", "1", "partrol-submit-setting"]);
  expect(root?.children?.[4]?.children?.map((item) => item.entry)).toEqual(["xglxtj", "09", "7"]);
});

test("详情页保持左侧菜单展开", () => {
  const hidden = domain.routes.filter((route) => route.meta?.hideInMenu);
  expect(hidden).toHaveLength(4);
  for (const route of hidden) {
    expect(typeof route.meta?.activeMenuPath).toBe("string");
  }
});

test("先加载 pcUi Runtime Common，再初始化 pcUi 平台", async () => {
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
  expect(calls).toEqual(["runtime:pcUi:index", "platform:pcUi:platform", "client:electronicPatrolClient", "client:messageClient"]);
});
