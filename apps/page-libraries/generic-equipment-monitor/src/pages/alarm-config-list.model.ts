/** GEM 报警配置列表：纯查询/展示合同（applicationCode 来自宿主 props，禁止读 URL query）。 */

export const TIME_UNITS = [
  { label: "月", value: "MONTH" },
  { label: "天", value: "DAY" },
  { label: "小时", value: "HOUR" },
  { label: "分钟", value: "MINUTE" },
  { label: "秒", value: "SECOND" },
] as const;

export interface AlarmConfigListSearch {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  alarmLevelId?: string;
  applicationCode: string;
}

export function buildAlarmConfigListQuery(search: AlarmConfigListSearch): Record<string, unknown> {
  const applicationCode = search.applicationCode.trim();
  if (!applicationCode) {
    throw new Error("applicationCode is required from host Domain config");
  }
  return {
    pageNumber: search.pageNumber,
    pageSize: search.pageSize,
    applicationCode,
    keyword: search.keyword?.trim() || undefined,
    alarmLevelId: search.alarmLevelId?.trim() || undefined,
  };
}

export function formatDuration(value: unknown, unit: unknown): string {
  if (value == null || value === "") {
    return "0";
  }
  const label = TIME_UNITS.find((item) => item.value === String(unit))?.label ?? "";
  return `${value}${label}`;
}

export function formatDisableDuration(hours: unknown): string {
  if (hours == null || hours === "" || hours === 0 || hours === "0") {
    return "";
  }
  return `${hours} 小时`;
}

export type AlarmConfigEditorMode = "add" | "edit" | "detail" | "copy";

export function buildAlarmConfigEditorNavigateParams(mode: AlarmConfigEditorMode, id?: string): Record<string, string> {
  if (mode === "add") {
    return { type: "add" };
  }
  if (!id) {
    throw new Error("rule id is required");
  }
  if (mode === "copy") {
    return { type: "edit", id, copy: "1" };
  }
  return { type: mode, id };
}
