import { assertDomainModule } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import domainModule from "./domain";

test("用气安全与危化品管控菜单严格保持 OUAA 顺序", () => {
  const asserted = assertDomainModule(domainModule);
  expect(asserted.ok).toBe(true);
  if (asserted.ok)
    expect(asserted.module.menuContribution).toEqual([
      { label: "风险源分类", iconKey: "risk-management", entry: "risk-type", path: "/d/risk-management/risk-type" },
      { label: "风险源管理", iconKey: "risk-management", entry: "risk-ledger", path: "/d/risk-management/risk-ledger" },
      { label: "消息配置", iconKey: "risk-management", entry: "risk-message", path: "/d/risk-management/risk-message" },
    ]);
});
