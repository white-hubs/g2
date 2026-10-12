import { expect, test } from "bun:test";

import { NUMERIC_CONDITION_OPTIONS, processConditionFields, validConditionValue, type ProcessCondition } from "./process-conditions";

test("条件字段包含旧组织类型和组合内可比较字段", () => {
  const fields = processConditionFields([
    { id: "dept", name: "DeptPicker", valueType: "FormDept" },
    { id: "role", name: "RoleList", valueType: "Role" },
    {
      id: "group",
      name: "GroupList",
      props: {
        items: [
          { id: "days", name: "OvertimeLength", valueType: "String" },
          { id: "text", name: "TextInput", valueType: "String" },
        ],
      },
    },
  ]);
  expect(fields.map((field) => field.id)).toEqual(["root", "dept", "role", "days"]);
});

test("数值比较支持十种旧判断符和完整区间", () => {
  expect(NUMERIC_CONDITION_OPTIONS.map((option) => option.value)).toEqual(["=", ">", ">=", "<", "<=", "IN", "B", "AB", "BA", "ABA"]);
  const condition: ProcessCondition = { id: "number", title: "数值", valueType: "Number", compare: "ABA", value: [0, 2] };
  expect(validConditionValue(condition)).toBe(true);
  expect(validConditionValue({ ...condition, value: [2] })).toBe(false);
  expect(validConditionValue({ ...condition, value: [3, 2] })).toBe(false);
  expect(validConditionValue({ ...condition, value: [0, null] })).toBe(false);
  expect(validConditionValue({ ...condition, compare: "=", value: [0] })).toBe(true);
  expect(validConditionValue({ ...condition, compare: "IN", value: ["2", "abc"] })).toBe(false);
});
