import { expect, test } from "bun:test";

import { buildCreateRiskTypePayload, buildUpdateRiskTypePayload, emptyRiskTypeForm } from "./risk-type-payload";

test("新增分类必须带 risk-source-type itemCode", () => {
  const form = emptyRiskTypeForm();
  form.name = " 燃气柜 ";
  form.remarks = "备注";
  expect(buildCreateRiskTypePayload(form)).toEqual({
    name: "燃气柜",
    remarks: "备注",
    itemCode: "risk-source-type",
    superiorsId: "",
    level: 1,
  });
});

test("编辑分类保留行 id，并用表单覆盖名称备注", () => {
  const form = emptyRiskTypeForm();
  form.name = "更新名";
  form.remarks = "新备注";
  form.superiorsId = "parent-1";
  form.level = 2;
  const payload = buildUpdateRiskTypePayload(
    {
      id: "type-1",
      name: "旧名",
      itemCode: "risk-source-type",
      superiorsId: "parent-1",
      level: 2,
      permissionState: "ALLOW",
    },
    form,
  );
  expect(payload).toMatchObject({
    id: "type-1",
    name: "更新名",
    remarks: "新备注",
    itemCode: "risk-source-type",
    superiorsId: "parent-1",
    level: 2,
  });
});
