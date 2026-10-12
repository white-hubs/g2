import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domain from "./domain";

describe("business-config Domain", () => {
  test("为基础管理流媒体配置提供路由和菜单", () => {
    const result = assertDomainModule(domain);
    expect(result.ok).toBe(true);
    expect(domain.menuContribution?.[0]?.children?.map((item) => item.label)).toEqual([
      "流媒体配置",
      "三方服务配置",
      "区域管理",
      "分析盒子配置",
      "业务配置",
      "文件清理策略配置",
      "业务标签管理",
    ]);
    expect(domain.menuContribution?.[0]?.children?.[0]?.path).toBe("/d/business-config/stream-media");
    expect(domain.menuContribution?.[0]?.children?.[2]?.path).toBe("/d/business-config/area-management");
    expect(domain.menuContribution?.[0]?.children?.[4]?.path).toBe("/d/business-config/service-configuration");
    expect(domain.menuContribution?.[0]?.children?.[5]?.path).toBe("/d/business-config/file-cleanup-config");
    expect(domain.menuContribution?.[0]?.children?.[3]?.path).toBe("/d/business-config/video-analysis-box");
    expect(domain.routes?.map((route) => route.path)).toContain("/d/business-config/file-cleanup-config");
    expect(domain.routes?.map((route) => route.path)).toContain("/d/business-config/video-analysis-box");
    expect(domain.menuContribution?.[0]?.children?.[1]?.path).toBe("/d/business-config/third-party-services");
    expect(domain.routes?.map((route) => route.path)).toContain("/d/business-config/third-party-services");
    expect(domain.routes?.map((route) => route.path)).toContain("/d/business-config/area-management");
    expect(domain.routes?.map((route) => route.path)).toContain("/d/business-config/service-configuration");
    const menuPaths = new Set(domain.menuContribution?.[0]?.children?.map((item) => item.path));
    for (const route of domain.routes?.filter((item) => item.meta?.hideInMenu) ?? []) expect(menuPaths.has(route.meta?.activeMenuPath)).toBe(true);
  });

  test("安装前 fail-closed 加载 Runtime Common pcUi，再安装平台和业务 Client", async () => {
    const calls: string[] = [];
    const context = createFakeDomainContext({
      loadRuntimeCommon: async (name, exposed) => {
        calls.push(`runtime:${name}:${exposed}`);
        return {};
      },
      loadPlatform: async (name) => {
        calls.push(`platform:${name}`);
        return {};
      },
      ensureClient: async (name) => {
        calls.push(`client:${name}`);
        return {};
      },
    });
    await domain.install?.(createFakeApp(), context);
    expect(calls).toEqual(["runtime:pcUi:index", "platform:pcUi", "client:businessConfigClient"]);
  });
});
