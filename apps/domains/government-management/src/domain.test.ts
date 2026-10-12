import { assertDomainModule } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";
import { APPROVAL_PAGES } from "./menu-data";

describe("government-management domain", () => {
  test("matches supplied menu hierarchy and each visible entry has a route", () => {
    const result = assertDomainModule(domainModule);
    expect(result.ok).toBe(true);
    const root = domainModule.menuContribution?.[0];
    expect(root?.children?.map((item) => item.label)).toEqual([
      "制度审批",
      "招标管理",
      "用印管理",
      "议题预报",
      "文件传阅",
      "来文处理",
      "档位测试",
      "督办管理",
      "事项催办",
      "流程配置",
      "行政审批记录",
    ]);
    expect(root?.children?.[7]?.children?.map((item) => item.label)).toEqual([
      "事项分类",
      "事项审批",
      "审批统计",
      "事项处理",
      "事项处理审批",
      "事项处理(上海)",
      "事项变更",
      "变更统计",
    ]);
    expect([...APPROVAL_PAGES.filter((item) => item.applicantFilters).map((item) => item.slug), "approval-record"]).toEqual([
      "tender-review",
      "tender-approval",
      "tender-confirmation",
      "seal-borrowing",
      "approval-record",
    ]);
    const visible: string[] = [];
    const walk = (items: typeof domainModule.menuContribution) => {
      for (const item of items ?? []) {
        if (item.path) {
          visible.push(item.path);
        }
        if (item.children) {
          walk(item.children);
        }
      }
    };
    walk(domainModule.menuContribution);
    expect(visible).toHaveLength(27);
    expect(visible.every((path) => domainModule.routes.some((route) => route.path === path))).toBe(true);
    const set = new Set(visible);
    expect(
      domainModule.routes.filter((route) => route.meta?.hideInMenu).every((route) => set.has(String(route.meta?.activeMenuPath))),
    ).toBe(true);
  });
});
