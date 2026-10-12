import { assetRowIssue, consumablesOutRowIssue, type AssetRow } from "./asset-model";
import { validateAttendanceHrControl } from "./components/attendance-hr-catalog";
import { PERSONNEL_CONTROLS } from "./components/control-catalog";
import { getFieldPermission } from "./form-perms";
import type { FormPermEntry } from "./form-perms";
import { fieldKey, findFormItemById } from "./form-schema";
import type { FormSchemaItem } from "./form-schema";

export interface FormValidationInput {
  items: FormSchemaItem[];
  values: Record<string, unknown>;
  formPerms: FormPermEntry[];
  processType: "add" | "detail";
  nodeId: string;
}

export interface FormValidationIssue {
  fieldId: string;
  path: Array<string | number>;
  message: string;
}

const relationSources = new Set(["SelectInput", "MultipleSelect", "VacationType"]);
const archiveControls = new Set<string>(PERSONNEL_CONTROLS.map((control) => control.id));
const idRegions = new Set([
  11, 12, 13, 14, 15, 21, 22, 23, 31, 32, 33, 34, 35, 36, 37, 41, 42, 43, 44, 45, 46, 50, 51, 52, 53, 54, 61, 62, 63, 64, 65, 71, 81, 82,
  83, 91,
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function hasValue(value: unknown): boolean {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function relatedValue(key: string, rows: Record<string, unknown>[], root: Record<string, unknown>): unknown {
  for (let index = rows.length - 1; index >= 0; index--) {
    if (Object.hasOwn(rows[index]!, key)) return rows[index]![key];
  }
  return root[key];
}

/** 联动只作用于旧版支持的选项控件，组合行优先使用最近一层的值。 */
export function matchesLegacyFormRelation(
  item: FormSchemaItem,
  items: FormSchemaItem[],
  root: Record<string, unknown>,
  rows: Record<string, unknown>[] = [],
): boolean {
  const relation = asRecord(item.props?.relateParams);
  const [key, expected] = Object.entries(relation)[0] ?? [];
  if (!key) return true;
  const source = findFormItemById(items, key);
  if (!source || !relationSources.has(String(source.name))) return true;
  const value = relatedValue(key, rows, root);
  if (!value) return false;
  if (typeof value === "string") return value === expected;
  if (Array.isArray(value)) return value.includes(expected);
  if (typeof value === "object") return asRecord(value).id === expected;
  return false;
}

function validIdNumber(value: string): boolean {
  if (!/^\d{17}[\dX]$/i.test(value) || !idRegions.has(Number(value.slice(0, 2)))) return false;
  const year = Number(value.slice(6, 10));
  const month = Number(value.slice(10, 12));
  const day = Number(value.slice(12, 14));
  const birthday = new Date(year, month - 1, day);
  if (birthday.getFullYear() !== year || birthday.getMonth() + 1 !== month || birthday.getDate() !== day) return false;
  const digits = value.toLowerCase().replace(/x$/, "a");
  let sum = 0;
  for (let index = 17; index >= 0; index--) {
    sum += (2 ** index % 11) * Number.parseInt(digits.charAt(17 - index), 11);
  }
  return sum % 11 === 1;
}

function fieldError(item: FormSchemaItem, value: unknown, formValues: Record<string, unknown>): string | undefined {
  const name = String(item.name ?? "");
  const title = String(item.title ?? "必填字段");
  if (item.props?.required && archiveControls.has(name) && !asRecord(value).name) return `${title}不存在`;
  if (item.props?.required && name !== "Description" && !hasValue(value)) return `请填写${title}`;
  if (!hasValue(value)) return undefined;
  if (name === "ConsumablesOut" && Array.isArray(value)) {
    const issue = consumablesOutRowIssue(value as AssetRow[]);
    if (issue) return issue;
  }
  if (["AddAssetTable", "ChooseAssetTable", "ConsumablesEnter"].includes(name) && Array.isArray(value)) {
    const issue = assetRowIssue(
      name as "AddAssetTable" | "ChooseAssetTable" | "ConsumablesEnter",
      value as Record<string, unknown>[],
      Boolean(item.props?.required),
    );
    if (issue) return issue;
  }
  const attendanceHrIssue = validateAttendanceHrControl(item, value, formValues);
  if (attendanceHrIssue) return attendanceHrIssue;
  if (name === "TelPhone" && !/^1\d{10}$/.test(String(value))) return "请输入正确的电话号码";
  if (name === "ViolatorPhone" && !/^1[3-9]\d{9}$/.test(String(value))) return "请输入正确的手机号码";
  if (name === "IDNumber" && !validIdNumber(String(value))) return "请输入正确的身份证号";
  if (name === "TimePickerRange" && Array.isArray(value) && Boolean(value[0]) !== Boolean(value[1])) return "请选择时间";
  return undefined;
}

/** 提交与审批共用的同步校验；只检查当前可见且可编辑的表单项。 */
export function validateStreamForm(input: FormValidationInput): FormValidationIssue | undefined {
  const visit = (
    items: FormSchemaItem[],
    values: Record<string, unknown>,
    rows: Record<string, unknown>[],
    path: Array<string | number>,
  ): FormValidationIssue | undefined => {
    for (const item of items) {
      const key = fieldKey(item);
      const permission = getFieldPermission(item, input.formPerms, input.processType, input.nodeId);
      if (
        item.show === false ||
        !permission.show ||
        permission.readonly ||
        !matchesLegacyFormRelation(item, input.items, input.values, rows)
      )
        continue;
      const value = values[key];
      if (item.name === "GroupList") {
        const children = Array.isArray(item.props?.items) ? (item.props.items as FormSchemaItem[]) : [];
        const groupRows = Array.isArray(value) ? value : value == null ? [{}] : [];
        for (const [index, groupRow] of groupRows.entries()) {
          const row = asRecord(groupRow);
          const issue = visit(children, row, [...rows, row], [...path, key, index]);
          if (issue) return issue;
        }
        continue;
      }
      const message = fieldError(item, value, { ...input.values, ...values });
      if (message) return { fieldId: key, path: [...path, key], message };
    }
    return undefined;
  };
  return visit(input.items, input.values, [], []);
}
