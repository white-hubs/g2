import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import domain from "./domain";
import { safetyCreditMenu } from "./menu";
test("二级菜单顺序与原菜单数据一致", () => {
  const leaves = safetyCreditMenu.flatMap((node) => node.children?.map((child) => child.label) ?? [node.label]);
  expect(leaves).toEqual([
    "商户管理",
    "数据源配置",
    "评分权重配置",
    "模型版本管理",
    "评分日志",
    "行为记录",
    "行为审核",
    "自查清单",
    "自查处理",
    "自查质检",
    "自查统计",
    "评分排名看板",
    "公示配置",
    "权益规则配置",
    "权益生效记录",
    "信用档案",
  ]);
});
test("菜单严格保留用户提供的顺序", () => {
  expect(assertDomainModule(domain).ok).toBe(true);
  expect(domain.menuContribution?.[0]?.label).toBe("安全信用");
  expect(domain.menuContribution?.[0]?.children?.map((n) => n.label)).toEqual([
    "商户管理",
    "评分模型",
    "行为采集",
    "自查管理",
    "评分公示",
    "权益联动",
    "信用档案",
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

test("信用档案详情路由保持信用档案菜单展开", () => {
  const detail = domain.routes.find((route) => route.path === "/d/safety-credit/archives/:merchantId");
  expect(detail?.meta?.activeMenuPath).toBe("/d/safety-credit/archives");
});

test("在 pcUi 平台前加载 Runtime Common pcUi", async () => {
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
  expect(calls).toEqual(["runtime:pcUi:index", "platform:pcUi:platform", "client:safetyCreditClient"]);
});
