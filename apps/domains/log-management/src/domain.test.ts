import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domain from "./domain";

test("日志管理仅挂载操作日志记录菜单", () => {
  expect(assertDomainModule(domain).ok).toBe(true);
  expect(domain.menuContribution?.[0]?.children?.map((item) => item.label)).toEqual(["操作日志记录"]);
  expect(domain.routes.filter((route) => route.component).map((route) => route.path)).toEqual(["/d/log-management/handle-record"]);
});

describe("日志管理 Runtime Common 初始化", () => {
  test("先加载 pcUi 公共实现，再初始化 pcUi 平台与客户端", async () => {
    const calls: string[] = [];
    const ctx = createFakeDomainContext({
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

    await domain.install?.(createFakeApp(), ctx);
    expect(calls).toEqual(["runtime:pcUi:index", "platform:pcUi:platform", "client:mdataClient"]);
  });
});
