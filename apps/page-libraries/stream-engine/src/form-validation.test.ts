import { expect, test } from "bun:test";

import { setPendingAssetRows } from "./asset-model";
import type { FormPermEntry } from "./form-perms";
import type { FormSchemaItem } from "./form-schema";
import { matchesLegacyFormRelation, validateStreamForm } from "./form-validation";

function validate(
  items: FormSchemaItem[],
  values: Record<string, unknown>,
  options: { formPerms?: FormPermEntry[]; processType?: "add" | "detail"; nodeId?: string } = {},
) {
  return validateStreamForm({
    items,
    values,
    formPerms: options.formPerms ?? [],
    processType: options.processType ?? "add",
    nodeId: options.nodeId ?? "root",
  });
}

test("required validation follows visibility and edit permissions", () => {
  const items: FormSchemaItem[] = [
    { id: "hidden", name: "TextInput", title: "隐藏项", props: { required: true } },
    { id: "readonly", name: "TextInput", title: "只读项", props: { required: true } },
    { id: "notShown", name: "TextInput", title: "未展示项", show: false, props: { required: true } },
    { id: "name", name: "TextInput", title: "姓名", props: { required: true } },
  ];
  const formPerms: FormPermEntry[] = [
    { id: "hidden", perm: "H" },
    { id: "readonly", perm: "R" },
    { id: "name", perm: "E" },
  ];
  expect(validate(items, {}, { formPerms })).toEqual({ fieldId: "name", path: ["name"], message: "请填写姓名" });
  expect(validate(items, { name: "已填写" }, { formPerms })).toBeUndefined();
  expect(validate(items, {}, { processType: "detail", nodeId: "task-1" })).toBeUndefined();
});

test("linked required fields follow the legacy option source and selected value", () => {
  const items: FormSchemaItem[] = [
    { id: "choice", name: "SelectInput", title: "选择" },
    { id: "reason", name: "TextInput", title: "原因", props: { required: true, relateParams: { choice: "yes" } } },
  ];
  expect(validate(items, { choice: "no" })).toBeUndefined();
  expect(validate(items, { choice: "yes" })).toEqual({ fieldId: "reason", path: ["reason"], message: "请填写原因" });
  expect(matchesLegacyFormRelation(items[1]!, items, { choice: ["no", "yes"] })).toBe(true);
  expect(matchesLegacyFormRelation(items[1]!, items, { choice: { id: "yes", name: "是" } })).toBe(true);

  const nonOption = [{ ...items[0]!, name: "TextInput" }, items[1]!];
  expect(validate(nonOption, {})).toEqual({ fieldId: "reason", path: ["reason"], message: "请填写原因" });
});

test("GroupList validates every editable row and resolves nested conditions from the nearest row", () => {
  const items: FormSchemaItem[] = [
    {
      id: "groups",
      name: "GroupList",
      title: "记录",
      props: {
        items: [
          { id: "choice", name: "SelectInput", title: "选择" },
          { id: "detail", name: "TextInput", title: "明细", props: { required: true, relateParams: { choice: "yes" } } },
          {
            id: "subGroups",
            name: "GroupList",
            title: "子记录",
            props: {
              items: [{ id: "note", name: "TextInput", title: "备注", props: { required: true, relateParams: { choice: "yes" } } }],
            },
          },
        ],
      },
    },
  ];
  const values = {
    choice: "no",
    groups: [
      { choice: "no", subGroups: [{ note: "" }] },
      { choice: "yes", detail: "", subGroups: [{ note: "" }] },
    ],
  };
  expect(validate(items, values)).toEqual({ fieldId: "detail", path: ["groups", 1, "detail"], message: "请填写明细" });
  values.groups[1]!.detail = "已填";
  expect(validate(items, values)).toEqual({ fieldId: "note", path: ["groups", 1, "subGroups", 0, "note"], message: "请填写备注" });
  values.groups[1]!.subGroups[0]!.note = "已填";
  expect(validate(items, values)).toBeUndefined();
});

test("GroupList starts one blank row for a null value and skips hidden or readonly children", () => {
  const items: FormSchemaItem[] = [
    {
      id: "groups",
      name: "GroupList",
      title: "记录",
      props: { items: [{ id: "child", name: "TextInput", title: "子项", props: { required: true } }] },
    },
  ];
  expect(validate(items, { groups: null })).toEqual({ fieldId: "child", path: ["groups", 0, "child"], message: "请填写子项" });
  expect(validate(items, { groups: [] })).toBeUndefined();
  expect(validate(items, { groups: [{}] }, { formPerms: [{ id: "child", perm: "H" }] })).toBeUndefined();
  expect(validate(items, { groups: [{}] }, { formPerms: [{ id: "child", perm: "R" }] })).toBeUndefined();
});

test("optional phone and ID number fields still reject invalid nonempty values", () => {
  const items: FormSchemaItem[] = [
    { id: "phone", name: "TelPhone", title: "电话" },
    { id: "id", name: "IDNumber", title: "身份证号" },
  ];
  expect(validate(items, { phone: "123", id: "" })?.message).toBe("请输入正确的电话号码");
  expect(validate(items, { phone: "13800138000", id: "110105194912310021" })?.message).toBe("请输入正确的身份证号");
  expect(validate(items, { phone: "13800138000", id: "11010519491331002X" })?.message).toBe("请输入正确的身份证号");
  expect(validate(items, { phone: "13800138000", id: "11010519491231002X" })).toBeUndefined();
});

test("time range rejects one endpoint and required empty ranges", () => {
  const optional: FormSchemaItem = { id: "period", name: "TimePickerRange", title: "时间段" };
  expect(validate([optional], { period: ["08:00", null] })?.message).toBe("请选择时间");
  expect(validate([optional], { period: [null, "18:00"] })?.message).toBe("请选择时间");
  expect(validate([optional], { period: [null, null] })).toBeUndefined();
  expect(validate([{ ...optional, props: { required: true } }], { period: [null, null] })?.message).toBe("请填写时间段");
  expect(validate([optional], { period: ["08:00", "18:00"] })).toBeUndefined();
});

test("required values keep zero and false while empty selections remain invalid", () => {
  const items: FormSchemaItem[] = [
    { id: "count", name: "NumberInput", title: "数量", props: { required: true } },
    { id: "flag", name: "SwitchSelect", title: "开关", props: { required: true } },
    { id: "users", name: "UserPicker", title: "人员", props: { required: true } },
  ];
  expect(validate(items, { count: 0, flag: false, users: [] })).toEqual({ fieldId: "users", path: ["users"], message: "请填写人员" });
  expect(validate(items, { count: 0, flag: false, users: [{ id: "1", name: "张三" }] })).toBeUndefined();
});

test("required personnel archives reject missing names at root and inside a GroupList", () => {
  const archive: FormSchemaItem = { id: "staff", name: "SponsorInput", title: "发起人", props: { required: true } };
  for (const value of [null, {}, { id: "u1" }, { id: "u1", name: "" }, [{ id: "u1", name: "张三" }]]) {
    expect(validate([archive], { staff: value })).toEqual({ fieldId: "staff", path: ["staff"], message: "发起人不存在" });
  }
  expect(validate([archive], { staff: { id: "u1", name: "张三" } })).toBeUndefined();
  expect(validate([{ ...archive, name: "jobNumberInput" }], { staff: { id: "", name: "NO-100" } })).toBeUndefined();
  expect(validate([{ ...archive, props: { required: false } }], { staff: { id: "u1", name: "" } })).toBeUndefined();
  const group: FormSchemaItem = {
    id: "group",
    name: "GroupList",
    props: { items: [{ ...archive, id: "department", name: "OrganizationInput", title: "部门" }] },
  };
  expect(validate([group], { group: [{ department: { id: "d1" } }] })).toEqual({
    fieldId: "department",
    path: ["group", 0, "department"],
    message: "部门不存在",
  });
  expect(validate([group], { group: [{ department: { id: "d1", name: "总办" } }] })).toBeUndefined();
  expect(validate([group], { group: [{ department: { id: "d1" } }] }, { formPerms: [{ id: "department", perm: "R" }] })).toBeUndefined();
});

test("耗材领用沿用旧版出库数量、库存和限领校验", () => {
  const item: FormSchemaItem = { id: "supplies", name: "ConsumablesOut", title: "耗材领用", props: { required: false } };
  expect(validate([item], { supplies: [{ num: 0, storeNum: 5 }] })?.message).toBe("第1行出库数量必须为大于0的整数");
  expect(validate([item], { supplies: [{ num: 6, storeNum: 5 }] })?.message).toBe("第1行出库数量不能大于库存数量（5）");
  expect(validate([item], { supplies: [{ num: 4, storeNum: 5, useLimit: 3 }] })?.message).toBe("第1行出库数量不能大于限领数量（3）");
  expect(validate([item], { supplies: [{ num: 3, storeNum: 5, useLimit: 3 }] })).toBeUndefined();
});

test("consumables cannot submit an unsaved row at root or inside a GroupList", () => {
  const item: FormSchemaItem = { id: "supplies", name: "ConsumablesOut", title: "耗材领用" };
  const rows = [{ id: "cons-1", num: 2, storeNum: 5 }];
  setPendingAssetRows(rows, ["cons-1"]);
  expect(validate([item], { supplies: rows })?.message).toBe("请先保存第1行耗材");
  const group: FormSchemaItem = { id: "group", name: "GroupList", props: { items: [item] } };
  expect(validate([group], { group: [{ supplies: rows }] })).toEqual({
    fieldId: "supplies",
    path: ["group", 0, "supplies"],
    message: "请先保存第1行耗材",
  });
  setPendingAssetRows(rows, []);
  expect(validate([group], { group: [{ supplies: rows }] })).toBeUndefined();
});
