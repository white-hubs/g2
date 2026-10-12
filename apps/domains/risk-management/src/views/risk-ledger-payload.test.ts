import { expect, test } from "bun:test";

import { buildRiskLedgerPayload } from "./risk-ledger-payload";

test("风险源编辑请求移除界面字段并转换旧接口字段", () => {
  const payload = buildRiskLedgerPayload(
    {
      id: "from-detail",
      name: "灭火器",
      typeCode: ["fire", "extinguisher"],
      areaId: ["a", "b"],
      files: [{ id: "file-1" }, { id: "file-2" }],
    },
    [{ code: "part-1", name: "配件", expireDate: "2026-10-01", remarks: "", modifyFlag: true }],
    "route-id",
  );

  expect(payload.id).toBe("route-id");
  expect(payload.typeCode).toBe("extinguisher");
  expect(payload.areaId).toBe("a,b");
  expect(payload.files).toBe("file-1,file-2");
  expect(payload.partsDetails).toEqual([{ code: "part-1", name: "配件", expireDate: "2026-10-01", remarks: "" }]);
  expect("modifyFlag" in (payload.partsDetails as Record<string, unknown>[])[0]).toBe(false);
});
