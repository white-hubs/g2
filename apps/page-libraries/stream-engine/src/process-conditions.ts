import { flattenFormItems, type FormSchemaItem } from "./form-schema";

export type ProcessCondition = { id: string; title: string; name?: string; valueType?: string; compare: string; value: unknown[] };
export type ProcessConditionGroup = { groupType: string; cids: string[]; conditions: ProcessCondition[] };

export const NUMERIC_CONDITION_OPTIONS = [
  { label: "等于", value: "=" },
  { label: "大于", value: ">" },
  { label: "大于等于", value: ">=" },
  { label: "小于", value: "<" },
  { label: "小于等于", value: "<=" },
  { label: "属于", value: "IN" },
  { label: "下限 < 值 < 上限", value: "B" },
  { label: "下限 ≤ 值 < 上限", value: "AB" },
  { label: "下限 < 值 ≤ 上限", value: "BA" },
  { label: "下限 ≤ 值 ≤ 上限", value: "ABA" },
];

export const ORGANIZATION_CONDITION_OPTIONS = [
  { label: "人员", value: "User" },
  { label: "部门", value: "Dept" },
  { label: "角色", value: "Role" },
  { label: "职位", value: "Post" },
  { label: "外部人员", value: "OutSider" },
];

export function processConditionFields(fields: FormSchemaItem[]): FormSchemaItem[] {
  return [
    { id: "root", title: "发起人", name: "Root", valueType: "User" },
    ...flattenFormItems(fields).filter((item) => item.name !== "GroupList"),
  ].filter(
    (item) =>
      item.id &&
      !["TextareaInput", "TextInput"].includes(item.name ?? "") &&
      ["String", "Array", "Number", "User", "Dept", "Role", "Post", "OutSider", "FormDept", "getStaffList", "deptList"].includes(
        item.valueType ?? "",
      ),
  );
}

export function isNumericCondition(condition: ProcessCondition): boolean {
  return condition.valueType === "Number" || ["VacationLength", "OvertimeLength", "DepartureTimeLength"].includes(condition.name ?? "");
}

export function isRangeCondition(compare: string): boolean {
  return ["B", "AB", "BA", "ABA"].includes(compare);
}

export function validConditionValue(condition: ProcessCondition): boolean {
  if (!Array.isArray(condition.value) || !condition.value.length || condition.value.some((value) => value == null || value === ""))
    return false;
  if (!isNumericCondition(condition)) return true;
  if (condition.value.some((value) => !Number.isFinite(Number(value)))) return false;
  return !isRangeCondition(condition.compare) || (condition.value.length === 2 && Number(condition.value[0]) <= Number(condition.value[1]));
}
