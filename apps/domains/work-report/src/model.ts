import type { FieldMapping, FormControl, FormFlow, OptionItem, StatisticRow, TypeCount } from "@g2-contract/work-report";
export function fieldMappings(flow: FormFlow, fields: OptionItem[]): FieldMapping[] {
  const controls: unknown = typeof flow.formJson === "string" ? JSON.parse(flow.formJson || "[]") : (flow.formJson ?? []);
  if (!Array.isArray(controls)) {
    throw new TypeError("表单字段格式错误");
  }
  const rows: FieldMapping[] = [];
  const append = (control: FormControl, group = "") => {
    if (!control.id) {
      return;
    }
    const mapped = flow.formBizFieldMapList?.find((item) => item.controlId === control.id)?.businessField;
    rows.push({
      controlId: control.id,
      title: `${group ? `${group}-` : ""}${control.title ?? ""}`,
      businessField: fields.some((item) => item.id === mapped) ? (mapped ?? null) : null,
    });
  };
  for (const control of controls as FormControl[]) {
    if (control.name === "GroupList" && control.props?.items?.length) {
      control.props.items.forEach((item) => append(item, control.title));
    } else {
      append(control);
    }
  }
  return rows;
}
export function statisticTypes(rows: StatisticRow[]): TypeCount[] {
  const columns = new Map<string, TypeCount>();
  for (const row of rows) {
    for (const type of row.reportTypeNumList ?? []) {
      if (type.typeName && !columns.has(type.typeId)) {
        columns.set(type.typeId, type);
      }
    }
  }
  return [...columns.values()];
}
export function recordFilters(value: unknown): Record<string, string> {
  if (typeof value !== "string" || !value) {
    return {};
  }
  const decoded: unknown = JSON.parse(value);
  if (!decoded || typeof decoded !== "object") {
    throw new Error("统计筛选条件格式错误");
  }
  const source = decoded as Record<string, unknown>;
  return Object.fromEntries(
    ["startUserId", "organizationId", "reportTypeId", "submitTime"].flatMap((key) =>
      typeof source[key] === "string" ? [[key, source[key]]] : [],
    ),
  );
}
