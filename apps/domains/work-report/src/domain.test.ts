import { assertDomainModule } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domain from "./domain";
import { fieldMappings, recordFilters, statisticTypes } from "./model";
import { streamReturnPath } from "./stream-page-host";
describe("work-report migration", () => {
  test("all supplied menus retain order and codes, hidden routes keep sidebar context", () => {
    expect(assertDomainModule(domain).ok).toBe(true);
    const menus = domain.menuContribution?.[0]?.children ?? [];
    expect(menus.map((item) => item.entry)).toEqual(["report-list", "report-type", "flow-config", "GZAP", "APLX", "HBZX", "gzhbtj"]);
    expect(menus.map((item) => item.label)).toEqual([
      "工作汇报",
      "汇报类型",
      "流程配置",
      "工作安排",
      "安排类型",
      "汇报中心",
      "工作汇报统计",
    ]);
    expect(menus.every((item) => domain.routes.some((route) => route.path === item.path))).toBe(true);
    const visible = new Set(menus.map((item) => item.path));
    expect(domain.routes.filter((route) => route.meta?.hideInMenu).every((route) => visible.has(String(route.meta?.activeMenuPath)))).toBe(
      true,
    );
  });
  test("form groups keep prefixed titles and valid business field mappings", () => {
    expect(
      fieldMappings(
        {
          id: "1",
          formDefinitionId: "f1",
          formJson: JSON.stringify([
            { id: "a", title: "汇报类型" },
            { name: "GroupList", title: "明细", props: { items: [{ id: "b", title: "内容" }] } },
          ]),
          formBizFieldMapList: [
            { controlId: "a", businessField: "type" },
            { controlId: "b", businessField: "deleted" },
          ],
        },
        [{ id: "type", name: "类型" }],
      ),
    ).toEqual([
      { controlId: "a", title: "汇报类型", businessField: "type" },
      { controlId: "b", title: "明细-内容", businessField: null },
    ]);
  });
  test("dynamic columns keep zero counts and union different user report types", () => {
    expect(
      statisticTypes([
        { userId: "u1", reportTypeNumList: [{ typeId: "t1", typeName: "日报", typeNum: 0 }] },
        {
          userId: "u2",
          reportTypeNumList: [
            { typeId: "t2", typeName: "周报", typeNum: 3 },
            { typeId: "t1", typeName: "日报", typeNum: 2 },
          ],
        },
      ]).map((item) => item.typeId),
    ).toEqual(["t1", "t2"]);
  });
  test("statistics drilldown only restores legacy API filters", () => {
    expect(
      recordFilters(JSON.stringify({ startUserId: "u1", reportTypeId: "t1", submitTime: "2026-10-01,2026-10-08", extra: "bad" })),
    ).toEqual({ startUserId: "u1", reportTypeId: "t1", submitTime: "2026-10-01,2026-10-08" });
    expect(() => recordFilters("bad json")).toThrow();
  });
  test("statistics detail returns to filtered records without allowing foreign redirects", () => {
    const owner = "/d/work-report/report-statistics";
    const records = "/d/work-report/record-index?searchValue=%7B%7D";
    expect(streamReturnPath(records, owner)).toBe(records);
    expect(streamReturnPath("/d/work-report/report-list?pageNumber=2", "/d/work-report/report-list")).toBe(
      "/d/work-report/report-list?pageNumber=2",
    );
    expect(streamReturnPath("https://example.com", owner)).toBe(owner);
    expect(streamReturnPath("/d/work-report/record-index-other", owner)).toBe(owner);
    expect(streamReturnPath(records, "/d/work-report/report-list")).toBe("/d/work-report/report-list");
  });
});
