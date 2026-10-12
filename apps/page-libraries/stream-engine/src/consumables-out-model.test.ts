import { expect, test } from "bun:test";
import { reactive } from "vue";

import { consumablesOutRowIssue, setPendingAssetRows } from "./asset-model";

test("consumable rows restored from a saved DTO can submit until explicitly edited", () => {
  const rows = [{ id: "cons-1", num: 2, storeNum: 5, useLimit: 0, flowConvertData: false }];
  expect(consumablesOutRowIssue(rows)).toBeUndefined();
  setPendingAssetRows(rows, ["cons-1"]);
  expect(consumablesOutRowIssue(reactive(rows))).toBe("请先保存第1行耗材");
  expect(JSON.stringify(rows)).toBe('[{"id":"cons-1","num":2,"storeNum":5,"useLimit":0,"flowConvertData":false}]');
  setPendingAssetRows(rows, []);
  expect(consumablesOutRowIssue(reactive(rows))).toBeUndefined();
});

test("consumable quantity validation covers integer, zero stock, inventory and configured limits", () => {
  expect(consumablesOutRowIssue([{ id: "c", num: 0, storeNum: 5 }])).toContain("大于0的整数");
  expect(consumablesOutRowIssue([{ id: "c", num: 1.5, storeNum: 5 }])).toContain("大于0的整数");
  expect(consumablesOutRowIssue([{ id: "c", num: 1, storeNum: 0 }])).toBe("第1行出库数量不能大于库存数量（0）");
  expect(consumablesOutRowIssue([{ id: "c", num: 3, storeNum: 2 }])).toContain("库存数量（2）");
  expect(consumablesOutRowIssue([{ id: "c", num: 3, storeNum: 5, useLimit: 2 }])).toContain("限领数量（2）");
  expect(consumablesOutRowIssue([{ id: "c", num: 3, storeNum: 5, useLimit: 0 }])).toBeUndefined();
});

test("pending state reports the current row number after removal and preserves numeric error priority", () => {
  const rows = [
    { id: "saved", num: 1 },
    { id: "editing", num: 2 },
  ];
  setPendingAssetRows(rows, ["editing"]);
  expect(consumablesOutRowIssue(rows)).toBe("请先保存第2行耗材");
  rows.splice(0, 1);
  expect(consumablesOutRowIssue(rows)).toBe("请先保存第1行耗材");
  rows[0]!.num = 0;
  expect(consumablesOutRowIssue(rows)).toBe("第1行出库数量必须为大于0的整数");
});
