import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("@g2-domain/hazard-governance domain module", () => {
  test("routes and menuContribution match the OUAA hazard-governance route tree", () => {
    const asserted = assertDomainModule(domainModule);
    expect(asserted.ok).toBe(true);
    if (!asserted.ok) return;

    const paths = asserted.module.routes.map((route) => route.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        "/d/hazard-governance/hazard-workbench",
        "/d/hazard-governance/hazard-dashboard",
        "/d/hazard-governance/hazard-ledger",
        "/d/hazard-governance/rectification-tasks",
        "/d/hazard-governance/approval-list",
        "/d/hazard-governance/acceptance-list",
        "/d/hazard-governance/rule-config",
        "/d/hazard-governance/approval-template-config",
        "/d/hazard-governance/root-cause-list",
      ]),
    );

    const menu = asserted.module.menuContribution?.[0]?.children;
    expect(menu?.map((item) => item.label)).toEqual([
      "我的待办",
      "隐患看板",
      "隐患台账",
      "隐患任务",
      "隐患审批",
      "隐患验收",
      "隐患配置",
      "根因分析",
    ]);
    expect(menu?.[6]?.children).toEqual([
      { label: "类型配置", entry: "rule-config", path: "/d/hazard-governance/rule-config" },
      { label: "审批链模板", entry: "approval-template-config", path: "/d/hazard-governance/approval-template-config" },
    ]);
  });

  test("loads Runtime Common providers before platforms and client", async () => {
    const calls: string[] = [];
    const context = createFakeDomainContext({
      loadRuntimeCommon: async <T>(name: string, entry: string): Promise<T> => {
        calls.push(`runtime:${name}:${entry}`);
        return {} as T;
      },
      loadPlatform: async (name: string, entry: string) => {
        calls.push(`${name}:${entry}`);
        return {};
      },
      ensureClient: async <T>(name: string): Promise<T> => {
        calls.push(name);
        return {} as T;
      },
    });

    await domainModule.install?.(createFakeApp(), context);
    expect(calls).toEqual(["runtime:pcUi:index", "runtime:pcMap:index", "pcUi:platform", "pcMap:platform", "hazardGovernanceClient"]);
  });
});
