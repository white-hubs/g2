import { describe, expect, test } from "bun:test";

import {
  ASSET_CONTROLS,
  assetEntryTotals,
  assetRowIssue,
  assetTableCell,
  normalizeAssetCategories,
  readonlyConsumablesOutRows,
  setPendingAssetRows,
} from "./asset-model";

describe("资产管理旧表单契约", () => {
  test("目录包含旧设计器的十种资产控件", () => {
    expect(ASSET_CONTROLS.map((item) => item.id)).toEqual([
      "AssetSource",
      "AssetTypeSelect",
      "AreaList",
      "ScrappingReason",
      "AssetIsExpired",
      "AddAssetTable",
      "ChooseAssetTable",
      "WareHouseSelect",
      "ConsumablesEnter",
      "ConsumablesOut",
    ]);
  });

  test("资产表保留财务编码等必填列，并检测重复资产编码", () => {
    const row = {
      serialNumber: "AS-001",
      financeNumber: "FI-001",
      name: "打印机",
      type: { id: "T1", name: "办公设备" },
      purchaseDate: "2026-09-24",
      maintenanceTime: 12,
      usageTime: 36,
      number: 1,
    };
    expect(assetRowIssue("AddAssetTable", [row], true)).toBeUndefined();
    expect(assetRowIssue("AddAssetTable", [{ ...row, financeNumber: "" }], true)).toContain("财务编码");
    expect(assetRowIssue("AddAssetTable", [row, { ...row, financeNumber: "FI-002" }], true)).toContain("资产编码重复");
  });

  test("耗材入库校验正整数数量，并正确合计金额", () => {
    expect(assetRowIssue("ConsumablesEnter", [{ num: 0, price: 5 }], true)).toContain("大于0的整数");
    expect(assetRowIssue("ConsumablesEnter", [{ num: 2, price: 0 }], true)).toContain("单价");
    expect(
      assetEntryTotals([
        { num: 2, storeAmount: 6.2 },
        { num: 1, storeAmount: 3 },
      ]),
    ).toEqual({ count: 3, amount: "9.20" });
  });

  test("表格中的对象和值 0 正确回显", () => {
    expect(assetTableCell({ id: "T1", name: "办公设备" })).toBe("办公设备");
    expect(assetTableCell(0)).toBe("0");
    expect(assetTableCell(null)).toBe("--");
  });

  test("耗材领用只读态按实际单价和数量重算金额且不修改原数据", () => {
    const original = [{ id: "C-1", avgPrice: 7.35, num: 2, storeAmount: 99 }];
    const shown = readonlyConsumablesOutRows(original);
    expect(shown[0]?.storeAmount).toBe(14.7);
    expect(original[0]?.storeAmount).toBe(99);
    expect(assetEntryTotals(shown)).toEqual({ count: 2, amount: "14.70" });
  });

  test("添加资产已填完但未保存时仍阻止整表提交", () => {
    const rows = [
      {
        key: "row-1",
        serialNumber: "A-1",
        financeNumber: "F-1",
        name: "设备",
        type: { id: "T", name: "设备" },
        purchaseDate: "2026-09-24",
        maintenanceTime: 12,
        usageTime: 36,
        number: 1,
      },
    ];
    setPendingAssetRows(rows, ["row-1"]);
    expect(assetRowIssue("AddAssetTable", rows, true)).toBe("请先保存第1行数据");
    setPendingAssetRows(rows, []);
    expect(assetRowIssue("AddAssetTable", rows, true)).toBeUndefined();
  });

  test("保留分类和仓库选项附加字段并规范化树节点 ID", () => {
    expect(
      normalizeAssetCategories([
        { id: 1 as unknown as string, name: "设备", code: "E", children: [{ id: 2 as unknown as string, name: "办公" }] },
      ]),
    ).toEqual([{ id: "1", name: "设备", code: "E", children: [{ id: "2", name: "办公" }] }]);
  });
});
