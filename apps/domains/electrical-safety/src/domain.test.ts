import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import domain from "./domain";
import { electricalSafetyMenu } from "./menu";
test("二级菜单顺序与原菜单数据一致", () => {
  const leaves = electricalSafetyMenu.flatMap((node) => node.children?.map((child) => child.label) ?? [node.label]);
  expect(leaves).toEqual([
    "电气中心",
    "设备检测",
    "深度分析",
    "设施管理",
    "设备关联",
    "报警记录",
    "告警规则",
    "消息配置",
    "拓扑图配置",
    "远检配置",
    "远检查看",
    "线损管理",
    "预警规则",
    "预警列表",
    "采集周期",
    "采集记录",
    "损耗统计",
  ]);
});
test("菜单严格保留用户提供的顺序", () => {
  expect(assertDomainModule(domain).ok).toBe(true);
  expect(domain.menuContribution?.[0]?.label).toBe("电气安全");
  expect(domain.menuContribution?.[0]?.children?.map((n) => n.label)).toEqual([
    "实时检测",
    "资产管理",
    "报警管理",
    "基础配置",
    "远检查看",
    "线损管理",
    "线损预警",
    "业务配置",
    "数据统计",
  ]);
});
test("全部菜单有真实路由，隐藏详情不进入菜单", () => {
  const paths = new Set(domain.routes.map((r) => r.path));
  const visit = (nodes = domain.menuContribution ?? []) => {
    for (const n of nodes) {
      if (n.path) {
        expect(paths.has(n.path)).toBe(true);
      }
      visit(n.children ?? []);
    }
  };
  visit();
});

test("隐藏详情和编辑路由保持所属左侧菜单展开", () => {
  const activeParents = new Map(domain.routes.map((route) => [route.path, route.meta?.activeMenuPath]));
  expect(activeParents.get("/d/electrical-safety/alarmDetail")).toBe("/d/electrical-safety/alarm-record");
  expect(activeParents.get("/d/electrical-safety/alarmConfigureAdd")).toBe("/d/electrical-safety/alarm-config");
  expect(activeParents.get("/d/electrical-safety/line-loss-warning-config/editor")).toBe("/d/electrical-safety/line-loss-warning-config");
  expect(activeParents.get("/d/electrical-safety/configuration")).toBe("/d/electrical-safety/application-equipment");
});

test("Runtime Common providers 在平台与业务 Client 之前完成加载", async () => {
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
  expect(calls.slice(0, 5)).toEqual([
    "runtime:pcUi:index",
    "runtime:pcPlayer:index",
    "runtime:pcGraphEditor:index",
    "runtime:pcScada:index",
    "runtime:pcScada:core",
  ]);
  expect(calls.slice(5)).toEqual(["pcUi:platform", "electricalSafetyClient"]);
});
