import { type MenuContributionNode, assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domain from "./domain";

const leafPaths = (nodes: MenuContributionNode[]): string[] =>
  nodes.flatMap((node) => (node.children ? leafPaths(node.children) : [node.path ?? ""]));

const expectedMenu = [
  ["安全警示标志管理", "/d/risk-graded-control/config/warning-signs"],
  ["风险单元类型管理", "/d/risk-graded-control/config/unit-types"],
  ["评估方法配置", "/d/risk-graded-control/config/assessment-methods"],
  ["风险区域划分", "/d/risk-graded-control/zones"],
  ["风险单元管理", "/d/risk-graded-control/units"],
  ["风险单元清单", "/d/risk-graded-control/unit-inventory"],
  ["风险辨识管理", "/d/risk-graded-control/identifications"],
  ["辨识审核", "/d/risk-graded-control/reviews/pending"],
  ["风险评估管理", "/d/risk-graded-control/assessments"],
  ["管控措施配置", "/d/risk-graded-control/measures/config"],
  ["措施执行", "/d/risk-graded-control/measures/execution"],
  ["评估计划", "/d/risk-graded-control/evaluation-plans"],
  ["预警消息配置", "/d/risk-graded-control/warnings/config"],
  ["预警看板", "/d/risk-graded-control/warnings/dashboard"],
  ["风险四色图", "/d/risk-graded-control/four-color-map"],
  ["风险告知卡", "/d/risk-graded-control/notification-cards"],
  ["评审报告", "/d/risk-graded-control/review-reports"],
] as const;

describe("risk graded control domain", () => {
  test("keeps the supplied local menu name, order and paths", () => {
    expect(assertDomainModule(domain).ok).toBe(true);
    const root = domain.menuContribution?.[0];
    expect(root?.label).toBe("风险管控");
    expect(root?.children?.map(({ label, path }) => [label, path])).toEqual(expectedMenu.map(([label, path]) => [label, path]));

    const paths = leafPaths(domain.menuContribution ?? []);
    expect(paths).toEqual(expectedMenu.map(([, path]) => path));
    expect(paths.every((path) => domain.routes.some((route) => route.path === path && typeof route.component === "function"))).toBe(true);
    expect(domain.routes.find((route) => route.path === "/d/risk-graded-control")?.redirect).toBe(expectedMenu[0][1]);
  });

  test("keeps internal pages attached to their visible menu", () => {
    const visiblePaths = new Set(leafPaths(domain.menuContribution ?? []));
    const hiddenRoutes = domain.routes.filter((route) => route.meta?.hideInMenu === true);

    expect(hiddenRoutes.map((route) => route.name)).toEqual([
      "zone-form",
      "unit-form",
      "identification-entry",
      "identification-history",
      "review-execute",
      "assessment-detail",
      "innate-assessment",
      "control-assessment",
      "measure-list",
      "evaluation-plan-form",
    ]);
    for (const route of hiddenRoutes) {
      expect(visiblePaths.has(String(route.meta?.activeMenuPath))).toBe(true);
    }
  });

  test("loads UI, map and the typed client before rendering pages", async () => {
    const calls: string[] = [];
    const ctx = createFakeDomainContext({
      loadRuntimeCommon: async <T>(name: string, entry: string): Promise<T> => {
        calls.push(`runtime:${name}:${entry}`);
        return {} as T;
      },
      loadPlatform: async (name, entry) => {
        calls.push(`${name}:${entry}`);
        return {};
      },
      ensureClient: async <T>(name: string): Promise<T> => {
        calls.push(name);
        return {} as T;
      },
    });

    await domain.install?.(createFakeApp(), ctx, { applicationCode: "RISK_GRADED_CONTROL" });
    expect(calls).toEqual(["runtime:pcUi:index", "pcUi:platform", "pcMap:platform", "riskGradedControlClient"]);
  });
});
