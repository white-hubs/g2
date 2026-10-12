export type TargetObjectKind =
  | "AREA"
  | "DEVICE"
  | "PROPERTY"
  | "STALL"
  | "SITE_POINT"
  | "PATROL_POINT"
  | "RISK_SOURCE"
  | "SMALL_ENGINEERING";
export type TargetObjectRow = Record<string, unknown>;
export type TargetObjectOption = { label: string; value: string; children?: TargetObjectOption[] };

export const TARGET_OBJECT_KINDS: Array<{ value: TargetObjectKind; label: string }> = [
  { value: "AREA", label: "区域" },
  { value: "DEVICE", label: "设备" },
  { value: "PROPERTY", label: "资产" },
  { value: "STALL", label: "档位" },
  { value: "SITE_POINT", label: "现场点" },
  { value: "PATROL_POINT", label: "巡更点" },
  { value: "RISK_SOURCE", label: "风险源" },
  { value: "SMALL_ENGINEERING", label: "小散工程" },
];

function recordOf(value: unknown): TargetObjectRow {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as TargetObjectRow) : {};
}

export function targetObjectRows(value: unknown): TargetObjectRow[] {
  if (Array.isArray(value))
    return value.filter((row): row is TargetObjectRow => Boolean(row) && typeof row === "object" && !Array.isArray(row));
  const object = recordOf(value);
  const rows = object.data ?? object.records ?? object.list;
  return rows == null ? [] : targetObjectRows(rows);
}

export function targetObjectOptions(
  value: unknown,
  fields: { label?: string; value?: string; children?: string } = {},
): TargetObjectOption[] {
  const { label = "name", value: valueField = "id", children = "children" } = fields;
  return targetObjectRows(value).flatMap((row) => {
    if (row[valueField] == null) return [];
    const nested = Array.isArray(row[children]) ? targetObjectOptions(row[children], fields) : [];
    return [
      { label: String(row[label] ?? row[valueField]), value: String(row[valueField]), ...(nested.length ? { children: nested } : {}) },
    ];
  });
}

export function targetObjectName(row: TargetObjectRow): string {
  return String(
    row.name ??
      row.deviceName ??
      row.targetName ??
      row.projectName ??
      row.pointName ??
      row.patrolLocationName ??
      row.areaName ??
      row.title ??
      "",
  );
}

export function targetObjectDisplay(value: unknown): string {
  if (value == null || value === "") return "--";
  if (Array.isArray(value))
    return (
      value
        .map(targetObjectDisplay)
        .filter((name) => name !== "--")
        .join("/") || "--"
    );
  if (typeof value === "object") return String(recordOf(value).pathName ?? recordOf(value).name ?? "--");
  return String(value);
}

export function targetObjectQuery(
  kind: TargetObjectKind,
  values: Record<string, unknown>,
  pageNumber: number,
  pageSize: number,
  options: { legacyDevice?: boolean; outSource?: boolean; rectify?: boolean } = {},
): Record<string, unknown> {
  const page = { pageNumber, pageSize };
  const text = (field: string): string => (values[field] == null ? "" : String(values[field]));
  const keyword = text("keyword");
  if (kind === "AREA") return {};
  if (kind === "DEVICE") {
    if (options.outSource) return { ...page, keyword: keyword || undefined, enabled: true };
    if (options.legacyDevice) return { ...page, keyword: keyword || undefined };
    return {
      ...page,
      keyword,
      tagCodes: Array.isArray(values.tagCodes) ? values.tagCodes : [],
      anyMatchedDepartmentId: text("anyMatchedDepartmentId"),
      anyMatchedAreaId: text("anyMatchedAreaId"),
      productId: text("productId"),
      categoryCode: Array.isArray(values.categoryCode) ? values.categoryCode.join("-") : text("categoryCode"),
    };
  }
  if (kind === "PROPERTY")
    return {
      ...page,
      keyword,
      typeId: text("typeId"),
      receiveDepId: text("receiveDepId"),
      status: "",
      areaId: "",
      sourceId: "",
      purchaseStartDate: "",
      purchaseEndDate: "",
      usageDate: "",
    };
  if (kind === "STALL") return { ...page, enabled: true, keyword, type: text("type"), areaId: text("areaId") };
  if (kind === "SITE_POINT") return { ...page, pointName: text("pointName"), typeId: text("typeId"), receiveDepId: text("receiveDepId") };
  if (kind === "PATROL_POINT") return { ...page, keyword, areaId: text("areaId") };
  if (kind === "RISK_SOURCE") return { ...page, keyword, typeCode: text("typeCode"), areaId: "" };
  return { ...page, keyword, depId: text("depId"), status: text("status"), ...(options.rectify ? { enabled: true } : {}) };
}

export function targetObjectValue(
  rows: TargetObjectRow[],
  kind: TargetObjectKind,
  options: { compact?: boolean; array?: boolean } = {},
): TargetObjectRow | TargetObjectRow[] | null {
  const result = rows.map((row) =>
    options.compact
      ? { id: String(row.id ?? row.deviceId ?? row.targetId ?? ""), name: targetObjectName(row) }
      : {
          ...row,
          id: String(row.id ?? row.deviceId ?? row.targetId ?? ""),
          name: targetObjectName(row),
          type: TARGET_OBJECT_KINDS.some((entry) => entry.value === row.type) ? String(row.type) : kind,
          flowConvertData: false,
        },
  );
  return options.array ? result : (result[0] ?? null);
}
