import { assertDomainModule } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("@g2-domain/person-management", () => {
  test("retains the supplied personnel menu hierarchy and order", () => {
    const result = assertDomainModule(domainModule);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const root = result.module.menuContribution?.[0];
    expect(root?.children?.map((item) => item.label)).toEqual([
      "员工管理",
      "招聘审批",
      "入职审批",
      "试用考核",
      "转正审批",
      "培训审批",
      "离职审批",
      "标准流程配置",
      "离职手续",
      "轮岗审批",
      "人事审批记录",
      "字段配置",
    ]);
    expect(root?.children?.[0]?.children?.map((item) => item.label)).toEqual(["员工花名册", "人员异动统计", "人员类别"]);
    expect(root?.children?.[9]?.children?.map((item) => item.label)).toEqual(["轮岗申请", "轮岗统计"]);
    const entries: string[] = [];
    const collect = (items: NonNullable<typeof root>["children"]): void => {
      for (const item of items ?? []) {
        if (item.path) {
          entries.push(item.path);
        }
        collect(item.children);
      }
    };
    collect(root?.children);
    expect(entries).toHaveLength(20);
    expect(entries.every((path) => domainModule.routes.some((route) => route.path === path))).toBe(true);
  });

  test("all hidden forms and detail pages keep their owning menu selected", () => {
    const hidden = domainModule.routes.filter((route) => route.meta?.hideInMenu);
    expect(hidden.length).toBeGreaterThan(2);
    const menuPaths = new Set<string>();
    const visit = (items: typeof domainModule.menuContribution): void => {
      for (const item of items ?? []) {
        if (item.path) {
          menuPaths.add(item.path);
        }
        if (item.children) {
          visit(item.children);
        }
      }
    };
    visit(domainModule.menuContribution);
    expect(hidden.every((route) => menuPaths.has(String(route.meta?.activeMenuPath)))).toBe(true);
  });
});
