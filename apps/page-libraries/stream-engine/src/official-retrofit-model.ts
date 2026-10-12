export type BusinessChoice = { id: string; name: string };

export type DeviceProperty = { name: string; unitName?: string; value: string | number | boolean | null };

export type NorthDeviceDetail = {
  productPropVoList?: Array<{
    propCode: string;
    propName?: string;
    name?: string;
    unitName?: string;
    dataType?: string;
    dataConstraint?: Array<{ value: string | number | boolean; label: string }>;
  }>;
  snapshots?: Array<{ key?: string; value?: string | number | boolean | null }>;
};

export interface OfficialRetrofitClient {
  listOfficialSeals(): Promise<BusinessChoice[]>;
  listFocusWorkTypes(): Promise<BusinessChoice[]>;
  getFocusWork(id: string): Promise<BusinessChoice>;
  listFocusWork(): Promise<BusinessChoice[]>;
  listFocusWorkStatuses(): Promise<BusinessChoice[]>;
  getFocusWorkRequirement(id: string): Promise<BusinessChoice>;
  getFocusWorkCompleteTime(id: string): Promise<BusinessChoice>;
  getNorthDeviceDetail(deviceId: string): Promise<NorthDeviceDetail>;
}

export const OFFICIAL_CONTROLS = [
  { id: "OfficialSealList", title: "印章类别", name: "OfficialSealList", valueType: "String" },
  { id: "FocusWorkTypeList", title: "督办事项类型", name: "FocusWorkTypeList", valueType: "String" },
  { id: "FocusWork", title: "督办事项详情", name: "FocusWork", valueType: "String" },
  { id: "FocusWorkList", title: "督办事项选择", name: "FocusWorkList", valueType: "String" },
  { id: "FocusWorkStatusList", title: "督办事项状态", name: "FocusWorkStatusList", valueType: "String" },
  { id: "FocusWorkRequirement", title: "工作要求", name: "FocusWorkRequirement", valueType: "String" },
  { id: "FocusWorkCompleteTime", title: "督办完成时间", name: "FocusWorkCompleteTime", valueType: "String" },
  { id: "WorkList", title: "事项状态", name: "WorkList", valueType: "String" },
] as const;

export const RETROFIT_CONTROLS = [
  { id: "DeviceSelect", title: "改造对象", name: "DeviceSelect", valueType: "Object" },
  { id: "DeviceStatus", title: "设备前状态", name: "DeviceStatus", valueType: "Object" },
  { id: "DeviceChangeStatus", title: "设备后状态", name: "DeviceChangeStatus", valueType: "Object" },
  { id: "RetrofitConfirmSelect", title: "确认结果", name: "RetrofitConfirmSelect", valueType: "String" },
  { id: "SolutionResult", title: "处理结果", name: "SolutionResult", valueType: "String" },
] as const;

export const WORK_STATUS_OPTIONS: BusinessChoice[] = [
  { id: "ACTIVE", name: "处理中" },
  { id: "FINISHED", name: "已完成" },
];

export const RETROFIT_CONFIRM_OPTIONS: BusinessChoice[] = [
  { id: "CONFIRMED", name: "确认维修" },
  { id: "NO_PROCESS", name: "暂不处理" },
];

export function asBusinessChoice(value: unknown): BusinessChoice | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.id == null) return null;
  return { ...record, id: String(record.id), name: String(record.name ?? record.id) };
}

export function normalizeBusinessChoices(rows: BusinessChoice[]): BusinessChoice[] {
  return rows.map((row) => ({ ...row, id: String(row.id), name: String(row.name ?? row.id) }));
}

export function selectedDeviceId(value: unknown): string {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first || typeof first !== "object") return "";
  const record = first as Record<string, unknown>;
  return String(record.id ?? record.deviceId ?? "");
}

export function resolveDeviceProperties(detail: NorthDeviceDetail): DeviceProperty[] {
  const snapshots = new Map((detail.snapshots ?? []).map((item) => [String(item.key ?? ""), item.value]));
  return (detail.productPropVoList ?? []).map((item) => {
    const original = snapshots.get(item.propCode);
    const option = ["enum", "boolean"].includes(String(item.dataType))
      ? item.dataConstraint?.find((entry) => String(entry.value) === String(original))
      : undefined;
    return {
      name: String(item.propName ?? item.name ?? item.propCode),
      unitName: item.unitName,
      value: option?.label ?? original ?? "",
    };
  });
}

export function workStatusFromProgress(value: unknown): BusinessChoice | null {
  if (value == null || value === "") return null;
  return WORK_STATUS_OPTIONS[Number(value) >= 100 ? 1 : 0]!;
}
