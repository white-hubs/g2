import { createAssetClient } from "@g2-client/asset-management/client";
import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domain from "./domain";
import { LIST_CONFIG } from "./list-config";
import { BASE, LEAVES, MENUS } from "./menu-data";
import { allowDelete, assetPayload, cellText, cleanQuery, fieldMappings, protectedClass, treeRows } from "./model";
import { loadPcChart, loadPcMap, loadPcUi } from "./runtime-modules";
import { streamReturnPath } from "./stream-page-host";
describe("asset-management migration", () => {
  test("public modules load through the version-checked runtime contract", async () => {
    const calls: string[] = [];
    const http = { get: async () => null, post: async () => null, put: async () => null, delete: async () => null };
    const client = createAssetClient(http);
    const context = createFakeDomainContext({
      loadRuntimeCommon: async <T>(name: string, exposed: string) => {
        calls.push(`${name}/${exposed}`);
        return {} as T;
      },
      ensureClient: async <T>(name: string) => {
        expect(name).toBe("assetManagementClient");
        return client as T;
      },
    });
    await domain.install?.(createFakeApp(), context);
    await loadPcUi();
    await loadPcChart();
    await loadPcMap();
    expect(calls).toEqual(["pcUi/index", "pcUi/index", "pcChart/chart", "pcMap/index"]);
  });
  test("asset categories omit the serial column without changing inventory columns", async () => {
    const { columnsFor } = await import("./table-columns");
    expect(columnsFor("assetClass").map((column) => column.title)).toEqual(["分类名称", "备注说明"]);
    expect(columnsFor("assetInventory")[0].title).toBe("序号");
  });
  test("all 26 supplied leaves retain stable array ordering and each has an owned route", () => {
    expect(assertDomainModule(domain).ok).toBe(true);
    expect(MENUS.map((item) => item.label)).toEqual(["数据总览", "资产管理", "耗材管理", "数据报表", "系统配置", "流程配置"]);
    expect(LEAVES.map((item) => item.slug)).toEqual([
      "overView",
      "assetWarehousing",
      "assetInventory",
      "assetDistribution",
      "assetAllocation",
      "cleaning",
      "asset-check",
      "justInTime",
      "entering",
      "consuming",
      "consumable-check",
      "assetHistory",
      "maturityAssets",
      "overageAssetStatistics",
      "deptAsset",
      "inoutstatistics",
      "deptUseStatistics",
      "assetClass",
      "warehouseManage",
      "consumablesFile",
      "assetSource",
      "scrapReason",
      "assetAdministrators",
      "abnormalType",
      "messageConfig",
      "flow-config",
    ]);
    const paths = new Set(LEAVES.map((item) => `${BASE}/${item.slug}`));
    expect(LEAVES.every((item) => domain.routes.some((route) => route.path === `${BASE}/${item.slug}`))).toBe(true);
    expect(domain.routes.filter((route) => route.meta?.hideInMenu).every((route) => paths.has(String(route.meta?.activeMenuPath)))).toBe(
      true,
    );
  });
  test("source-specific filters and business types are not conflated", () => {
    expect(
      LIST_CONFIG.assetInventory.filters.filter((item) => ["purchaseDate", "startTime"].includes(item.field)).map((item) => item.kind),
    ).toEqual(["day", "day"]);
    expect(LIST_CONFIG.assetHistory.filters.at(-1)?.field).toBe("keywords");
    expect(LIST_CONFIG.maturityAssets.filters[0].field).toBe("maintenanceData");
    expect(LIST_CONFIG.assetDistribution.flow).toBe("PROPERTY_ALLOT_PERSONAL");
    expect(LIST_CONFIG.assetAllocation.flow).toBe("PROPERTY_ALLOT_UNIT");
    expect(LIST_CONFIG.entering.flow).toBe("CONSUMABLE_ADD");
    expect(LIST_CONFIG.consuming.flow).toBe("CONSUMABLE_REDUCE");
  });
  test("only scrapped assets can be deleted and finished checks remain protected", () => {
    expect(allowDelete("inventory", { id: "1", status: "MAKE_USE_OF" })).toBe(false);
    expect(allowDelete("inventory", { id: "1", status: "WEED_OUT" })).toBe(true);
    expect(allowDelete("distribution", { id: "1", status: "PASS" })).toBe(false);
    expect(allowDelete("assetCheck", { id: "1", status: "FINISH" })).toBe(false);
    expect(allowDelete("consumableCheck", { id: "1", status: "WEB_FINISH" })).toBe(false);
  });
  test("tree preserves children and protects system categories and their ancestors", () => {
    const rows = treeRows([
      {
        id: "a",
        name: "设备",
        children: [
          { id: "b", name: "易燃设备" },
          { id: "c", name: "普通设备", children: [] },
        ],
      },
    ]);
    expect(rows[0].level).toBe(1);
    expect(rows[0].children?.[0].level).toBe(2);
    expect(rows[0].children?.[1].children).toBeUndefined();
    expect(protectedClass(rows[0])).toBe(true);
    expect(protectedClass(rows[0].children![1])).toBe(false);
  });
  test("asset updates convert files to IDs and normalize only model-code whitespace", () => {
    expect(
      assetPayload({ id: "1", deviceNumber: " a b\tc ", name: "资产 A", imgs: [{ id: "f1", path: "/minio/a.jpg" }], file: ["f2"] }),
    ).toEqual({ id: "1", deviceNumber: "abc", name: "资产 A", imgs: ["f1"], file: ["f2"] });
    expect(cellText(0)).toBe("0");
    expect(cellText([{ name: "仓库" }, { name: "楼层" }])).toBe("仓库、楼层");
    expect(cleanQuery({ id: "1", period: ["2026-10-01", "2026-10-08"], flag: false, bad: { field: "unsupported" } })).toEqual({
      id: "1",
      period: ["2026-10-01", "2026-10-08"],
      flag: false,
    });
  });
  test("nested form groups retain valid field mappings and reject malformed JSON", () => {
    expect(
      fieldMappings(
        {
          id: "f",
          formJson: JSON.stringify([
            {
              name: "GroupList",
              title: "明细",
              props: {
                items: [
                  { id: "a", title: "资产" },
                  { id: "b", title: "数量" },
                ],
              },
            },
          ]),
          formBizFieldMapList: [
            { controlId: "a", businessField: "asset" },
            { controlId: "b", businessField: "removed" },
          ],
        },
        [{ id: "asset", name: "资产" }],
      ),
    ).toEqual([
      { controlId: "a", title: "明细-资产", businessField: "asset" },
      { controlId: "b", title: "明细-数量", businessField: null },
    ]);
    expect(() => fieldMappings({ id: "1", formJson: "bad" }, [])).toThrow();
  });
  test("approval details return only to their owned filtered list", () => {
    const owner = `${BASE}/assetWarehousing`;
    expect(streamReturnPath(`${owner}?pageNumber=2`, owner)).toBe(`${owner}?pageNumber=2`);
    expect(streamReturnPath(`${owner}-other`, owner)).toBe(owner);
    expect(streamReturnPath("https://example.com", owner)).toBe(owner);
  });
});
