import { type MenuContributionNode, assertDomainModule } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import domain from "./domain";
const leaves = (nodes: MenuContributionNode[]): string[] =>
  nodes.flatMap((node) => (node.children ? leaves(node.children) : [node.path ?? ""]));
test("普通安全教育菜单按附件的稳定顺序注册 11 页，每个编辑明细均有活动菜单", () => {
  expect(assertDomainModule(domain).ok).toBe(true);
  expect(leaves(domain.menuContribution ?? [])).toEqual(
    [
      "over-view",
      "training-task",
      "training-count",
      "exam-task",
      "test-paper-manage",
      "exam-count",
      "paper-question-rule",
      "courseware",
      "question",
      "theme",
      "message",
    ].map((slug) => `/d/secure-edu/${slug}`),
  );
  const menu = new Set(leaves(domain.menuContribution ?? []));
  for (const route of domain.routes.filter((candidate) => candidate.meta?.hideInMenu)) {
    expect(menu.has(String(route.meta?.activeMenuPath))).toBe(true);
  }
});
