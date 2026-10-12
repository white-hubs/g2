import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("@g2-domain/form-audit", () => {
  test("matches the supplied OUAA menu hierarchy and preserves menu order", () => {
    const result = assertDomainModule(domainModule);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const root = result.module.menuContribution?.[0];
    expect(root?.children?.map((item) => item.label)).toEqual(["表单管理", "考核规则", "考核统计"]);
    expect(root?.children?.[0]?.children?.map((item) => item.label)).toEqual([
      "表单模板",
      "业务表单",
      "表单记录",
      "表单统计",
      "个人工单统计",
      "表单配置",
      "表单配置-新",
    ]);
  });

  test("keeps detail, edit, design and scoring routes hidden with an active menu", () => {
    const hiddenRoutes = domainModule.routes.filter((route) => route.meta?.hideInMenu);
    expect(hiddenRoutes.length).toBe(11);
    expect(hiddenRoutes.every((route) => typeof route.meta?.activeMenuPath === "string")).toBe(true);
  });

  test("loads date Runtime Common before pcUi platform and clients", async () => {
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

    await domainModule.install?.(createFakeApp(), context);

    expect(calls).toEqual(["runtime:datePlatform:api", "platform:pcUi:platform", "client:formAuditClient", "client:streamEngineClient"]);
  });
});
