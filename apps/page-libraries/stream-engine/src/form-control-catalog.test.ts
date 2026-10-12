import { expect, test } from "bun:test";

import { CONTROL_GROUPS, availableFormControlGroups, createFormItem } from "./form-control-catalog";

test("all legacy application catalogues remain available to both root and GroupList fields", () => {
  expect(CONTROL_GROUPS).toHaveLength(15);
  expect(CONTROL_GROUPS.reduce((total, group) => total + group.items.length, 0)).toBe(130);
  expect(availableFormControlGroups().map((group) => group.title)).toEqual(["基础组件", "人员档案"]);
  for (const group of CONTROL_GROUPS) {
    if (!("application" in group)) continue;
    expect(availableFormControlGroups(group.application).map((entry) => entry.title)).toEqual(["基础组件", "人员档案", group.title]);
  }
});

test("business GroupList children keep their application's required and association defaults", () => {
  const permit = availableFormControlGroups("WORK_PERMIT").find((group) => group.title === "作业管理")!;
  const type = createFormItem(permit.items[0]!, permit.title);
  const level = createFormItem(permit.items[1]!, permit.title);
  expect(type.props?.required).toBe(true);
  expect(level.props).toMatchObject({ required: true, params: null });

  const outsource = availableFormControlGroups("OUTSOURCE_REPAIR").find((group) => group.title === "委外维修")!;
  expect(createFormItem(outsource.items[0]!, outsource.title).props).toMatchObject({ required: true, outSource: true });
  const fault = availableFormControlGroups("FAULT").find((group) => group.title === "故障报修")!;
  const supplies = fault.items.find((control) => control.id === "ConsumablesOut")!;
  expect(createFormItem(supplies, fault.title).props?.required).toBe(false);
  expect(createFormItem(supplies, "资产管理").props).toMatchObject({ required: true, paramsLabel: "关联仓库" });
});
