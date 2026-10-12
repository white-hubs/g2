import { createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domain from "./domain";

describe("warehouse-safety domain", () => {
  test("keeps the supplied menu order and every menu path has a route", () => {
    const root = domain.menuContribution?.[0];
    expect(root?.label).toBe("仓储安全");
    expect(root?.children?.map((item) => item.label)).toEqual(["仓储中心", "基础支持", "核心监测", "仓储报警", "统计分析", "仓储设备"]);
    expect(root?.children?.[1]?.children?.map((item) => item.label)).toEqual(["仓库管理", "货架管理", "叉车管理"]);
    expect(root?.children?.[2]?.children?.map((item) => item.label)).toEqual(["设备监测", "叉车监测"]);
    expect(root?.children?.[3]?.children?.map((item) => item.label)).toEqual(["报警记录", "报警配置", "事件档案"]);
    expect(root?.children?.[4]?.children?.map((item) => item.label)).toEqual(["报警统计", "报警处理统计", "报警分析"]);
    const paths = new Set(domain.routes.map((route) => route.path));
    const visit = (items = root?.children ?? []): void => {
      for (const item of items) {
        if (item.path) expect(paths.has(item.path)).toBe(true);
        visit(item.children ?? []);
      }
    };
    visit();
  });

  test("detail and form routes keep their source menu active", () => {
    const detailRoutes = domain.routes.filter((route) => route.meta?.hideInMenu);
    expect(detailRoutes.length).toBeGreaterThan(0);
    expect(detailRoutes.every((route) => typeof route.meta?.activeMenuPath === "string")).toBe(true);
  });

  test("pcIotSocket Runtime Common 在 Platform 及业务 Client 之前加载", async () => {
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
    expect(calls.slice(0, 3)).toEqual(["runtime:pcUi:index", "runtime:pcIotSocket:index", "pcUi:platform"]);
    expect(calls.at(-1)).toBe("warehouseSafetyClient");
  });
});
