import { GEM_PAGE_KEYS } from "@g2-pages/generic-equipment-monitor/contract";
import { describe, expect, test } from "bun:test";

import { resolveAccessControlGemHostPath } from "./page-key-routes";

describe("resolveAccessControlGemHostPath", () => {
  test("pageKey 译成门禁宿主 path（正拼写 entry）", () => {
    expect(resolveAccessControlGemHostPath({ page: GEM_PAGE_KEYS.equipmentMonitorList })).toBe("/d/access-control/equipmentMonitorList");
    expect(resolveAccessControlGemHostPath({ page: GEM_PAGE_KEYS.alarmRecord })).toBe("/d/access-control/alarmRecord");
  });

  test("详情携带 id 查询参数", () => {
    expect(resolveAccessControlGemHostPath({ page: GEM_PAGE_KEYS.alarmDetail, params: { id: "42" } })).toBe(
      "/d/access-control/alarmDetail?id=42",
    );
  });

  test("报警规则编辑器携带 type/id/copy 查询参数", () => {
    expect(resolveAccessControlGemHostPath({ page: GEM_PAGE_KEYS.alarmConfigureAdd, params: { type: "add" } })).toBe(
      "/d/access-control/alarmConfigureAdd?type=add",
    );
    expect(
      resolveAccessControlGemHostPath({
        page: GEM_PAGE_KEYS.alarmConfigureAdd,
        params: { type: "edit", id: "9", copy: "1" },
      }),
    ).toBe("/d/access-control/alarmConfigureAdd?type=edit&id=9&copy=1");
  });
});
