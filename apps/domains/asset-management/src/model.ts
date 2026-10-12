import type { AssetQuery, AssetRow, FieldMapping, FormFlow, OptionItem } from "@g2-contract/asset-management";
export const BUSINESS_STATUS = [
  { label: "审批中", value: "UNDER" },
  { label: "通过", value: "PASS" },
  { label: "拒绝", value: "REJECT" },
  { label: "撤销", value: "UNDO" },
];
export const ASSET_STATUS = [
  { label: "闲置", value: "LEAVE_UNUSED" },
  { label: "在用", value: "MAKE_USE_OF" },
  { label: "报废", value: "WEED_OUT" },
  { label: "报修", value: "REPAIR_REPORT" },
];
export const CHECK_STATUS = [
  { label: "未盘", value: "INCOMPLETE" },
  { label: "已盘", value: "COMPLETED" },
  { label: "盘盈", value: "WIN" },
  { label: "盘亏", value: "LOSS" },
  { label: "异常", value: "ABNORMAL" },
];
export const CHECK_TYPES = [
  { label: "管理员盘点", value: "ADMIN" },
  { label: "部门盘点", value: "ORG" },
  { label: "负责人盘点", value: "PERSON" },
];
export const ORDER_TYPES = [
  { label: "耗材领用", value: "CONSUMABLE_REDUCE" },
  { label: "故障报修", value: "FAULT" },
];
export function cellText(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  if (Array.isArray(value)) {
    return value.map((item) => cellText(item)).join("、");
  }
  if (typeof value === "object") {
    const row = value as Record<string, unknown>;
    return cellText(row.name ?? row.label ?? row.value);
  }
  return String(value);
}
export function text(row: AssetRow, field: string): string {
  return row[field] === undefined || row[field] === null ? "" : String(row[field]);
}
export function money(value: unknown): string {
  return Number(value ?? 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "操作失败，请稍后重试";
}
export function positiveInt(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}
export function flattenOptions(rows: OptionItem[]): OptionItem[] {
  return rows.flatMap((item) => [item, ...flattenOptions(item.children ?? [])]);
}
export function options(rows: OptionItem[]): { label: string; value: string }[] {
  return flattenOptions(rows).map((item) => ({ label: item.name, value: String(item.id) }));
}
export function fileIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === "object" && item !== null ? String((item as Record<string, unknown>).id ?? "") : String(item)))
        .filter(Boolean)
    : [];
}
export function assetPayload(row: AssetRow): AssetRow {
  return { ...row, imgs: fileIds(row.imgs), file: fileIds(row.file), deviceNumber: text(row, "deviceNumber").replace(/\s/gu, "") };
}
export function allowDelete(resource: string, row: AssetRow): boolean {
  if (resource === "inventory") {
    return row.status === "WEED_OUT";
  }
  if (resource === "assetCheck") {
    return row.status !== "FINISH";
  }
  if (resource === "consumableCheck") {
    return !["FINISH", "WEB_FINISH"].includes(String(row.status));
  }
  return !["UNDER", "PASS"].includes(String(row.status));
}
export function protectedClass(row: AssetRow): boolean {
  return ["易燃设备", "消防设备", "电动车"].includes(text(row, "name")) || Boolean(row.children?.some(protectedClass));
}
export function treeRows(rows: AssetRow[], level = 1): AssetRow[] {
  return rows.map((row) => ({
    ...row,
    id: String(row.id),
    level,
    children: row.children?.length ? treeRows(row.children, level + 1) : undefined,
  }));
}
export function fieldMappings(flow: FormFlow, fields: OptionItem[]): FieldMapping[] {
  const data: unknown = JSON.parse(flow.formJson || "[]");
  if (!Array.isArray(data)) {
    throw new TypeError("表单定义格式错误");
  }
  const mappings: FieldMapping[] = [];
  const visit = (items: unknown[], prefix = "") => {
    for (const entry of items) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const item = entry as { id?: string; title?: string; name?: string; props?: { items?: unknown[] } };
      if (item.name === "GroupList" && item.props?.items) {
        visit(item.props.items, `${prefix}${item.title ?? ""}-`);
      } else if (item.id) {
        const assigned = flow.formBizFieldMapList?.find((row) => row.controlId === item.id)?.businessField;
        mappings.push({
          controlId: item.id,
          title: `${prefix}${item.title ?? ""}`,
          businessField: fields.some((field) => field.id === assigned) ? (assigned ?? null) : null,
        });
      }
    }
  };
  visit(data);
  return mappings;
}
export function cleanQuery(values: Record<string, unknown>): AssetQuery {
  const query: AssetQuery = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      query[key] = value;
    } else if (Array.isArray(value)) {
      query[key] = value.map(String);
    }
  }
  return query;
}
export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
