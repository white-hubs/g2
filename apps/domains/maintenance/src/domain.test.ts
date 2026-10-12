import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import domain from "./domain";

const BASE = "/d/maintenance";

test("维保作业菜单保持产品给定顺序", () => {
  expect(assertDomainModule(domain).ok).toBe(true);
  const group = domain.menuContribution?.[0];
  expect(group?.label).toBe("维保作业");
  expect(group?.children?.map((item) => item.label)).toEqual(["维保计划@", "维保任务@", "维保项", "维保统计"]);
  expect(group?.children?.map((item) => item.entry)).toEqual([
    "maintenance-plan",
    "maintenance-task",
    "maintenance-item",
    "maintenance-statistics",
  ]);
  expect(group?.children?.map((item) => item.path)).toEqual([
    `${BASE}/maintenance-plan`,
    `${BASE}/maintenance-task`,
    `${BASE}/maintenance-item`,
    `${BASE}/maintenance-statistics`,
  ]);
});

test("隐藏路由声明 hideInMenu 并高亮所属列表菜单", () => {
  const hidden = domain.routes.filter((route) => route.meta?.hideInMenu === true).map((route) => [route.path, route.meta?.activeMenuPath]);
  expect(hidden).toEqual([
    [`${BASE}/maintenance-plan-operate`, `${BASE}/maintenance-plan`],
    [`${BASE}/maintenance-task-details`, `${BASE}/maintenance-task`],
    [`${BASE}/maintenance-execute`, `${BASE}/maintenance-task`],
    [`${BASE}/message-notice`, `${BASE}/maintenance-item`],
  ]);
});

test("根路径重定向到维保计划", () => {
  expect(domain.routes.find((route) => route.path === BASE)?.redirect).toBe(`${BASE}/maintenance-plan`);
});

test("pcUi Runtime Common 在平台依赖和业务 Client 之前加载", async () => {
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
    ensureClient: async <T>(name: string): Promise<T> => {
      calls.push(name);
      return {} as T;
    },
  });

  await domain.install?.(createFakeApp(), context);
  expect(calls).toEqual(["runtime:pcUi:index", "pcUi:platform", "maintenanceClient"]);
});
