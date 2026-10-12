import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import domain from "./domain";

test("委外维修菜单保持 OUAA 顺序且隐藏路由高亮所属入口", () => {
  expect(assertDomainModule(domain).ok).toBe(true);
  const menu = domain.menuContribution?.[0]?.children ?? [];
  expect(domain.menuContribution?.[0]?.iconKey).toBe("outsource");
  expect(menu.map((item) => item.label)).toEqual(["委外维修单", "委外配置", "流程配置"]);
  expect(menu[1]?.children?.map((item) => item.label)).toEqual(["委外模式@", "委外公司@", "委外设备@", "委外业务配置@", "委外消息配置@"]);
  const flowRender = domain.routes.find((item) => item.path === "/d/outsource-repair/flow-render");
  expect(flowRender?.meta?.hideInMenu).toBe(true);
  expect(flowRender?.meta?.activeMenuPath).toBe("/d/outsource-repair/repair-list");
  expect(domain.routes.find((item) => item.path === "/d/outsource-repair")?.redirect).toBe("/d/outsource-repair/repair-list");
});

test("委外配置与流程配置路由齐备", () => {
  const paths = domain.routes.map((item) => item.path);
  expect(paths).toEqual([
    "/d/outsource-repair",
    "/d/outsource-repair/repair-list",
    "/d/outsource-repair/repair-mode",
    "/d/outsource-repair/repair-company",
    "/d/outsource-repair/repair-device",
    "/d/outsource-repair/repair-traffic",
    "/d/outsource-repair/message-notice",
    "/d/outsource-repair/flow-config",
    "/d/outsource-repair/flow-render",
  ]);
  // 工单与旧详情已迁移为模块，但按要求不注册路由。
  expect(paths.some((path) => path.includes("repair-order") || path.includes("repair-list-details"))).toBe(false);
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
  expect(calls).toEqual([
    "runtime:pcUi:index",
    "platform:pcUi:platform",
    "client:outsourceRepairClient",
    "client:streamEngineClient",
    "client:messageClient",
  ]);
});
