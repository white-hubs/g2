import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("@g2-domain/technical-bulletin", () => {
  test("菜单严格保留用户提供顺序，详情路由保持公告管理菜单激活", () => {
    const result = assertDomainModule(domainModule);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const items = result.module.menuContribution?.[0]?.children ?? [];
    expect(items.map((item) => item.label)).toEqual(["公告信息", "公告管理", "公告类型", "公告标签", "发布机构"]);
    expect(items.map((item) => item.entry)).toEqual([
      "bimops-manage-web-noticeInfo",
      "bimops-manage-web-noticeManage",
      "bimops-manage-web-noticeType",
      "ggbq",
      "fbjg",
    ]);
    const formRoute = result.module.routes.find((item) => item.name === "technical-bulletin-announcement-form");
    expect(formRoute?.meta?.hideInMenu).toBe(true);
    expect(formRoute?.meta?.activeMenuPath).toBe("/d/technical-bulletin/notice-manage");
  });

  test("先加载 pcUi Runtime Common，再初始化平台与业务客户端", async () => {
    const calls: string[] = [];
    const context = createFakeDomainContext({
      loadRuntimeCommon: async <T>(name: string, entry: string): Promise<T> => {
        calls.push(`runtime:${name}:${entry}`);
        return {} as T;
      },
      loadPlatform: async (name, entry) => {
        calls.push(`platform:${name}:${entry}`);
        return {};
      },
      ensureClient: async <T>(name: string): Promise<T> => {
        calls.push(`client:${name}`);
        return {} as T;
      },
    });

    await domainModule.install?.(createFakeApp(), context);
    expect(calls).toEqual(["runtime:pcUi:index", "platform:pcUi:platform", "client:technicalBulletinClient"]);
  });
});
