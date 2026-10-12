/** GEM 报警记录列表：查询合同（applicationCode 来自宿主 props）。 */

export const ALARM_STATUS_OPTIONS = [
  { label: "所有", value: "" },
  { label: "待接收", value: "ALARM_UN_CONFIRMED" },
  { label: "处理中", value: "ALARM_PROGRESS_CONFIRMED" },
  { label: "已挂起", value: "ALARM_SUSPEND" },
  { label: "已处理", value: "ALARM_HANDLER" },
] as const;

export const ALARM_RESULT_OPTIONS = [
  { label: "实报", value: "ALARM_ACTUAL" },
  { label: "误报", value: "ALARM_IMPRACTICAL" },
] as const;

export const ALARM_OVERTIME_OPTIONS = [
  { label: "超时", value: "TIMED_OUT" },
  { label: "正常", value: "NORMAL" },
] as const;

export const ALARM_RESULT_LABEL: Record<string, string> = {
  ALARM_ACTUAL: "实报",
  ALARM_IMPRACTICAL: "误报",
};

export const HANDLABLE_STATUSES = new Set(["ALARM_UN_CONFIRMED", "ALARM_PROGRESS_CONFIRMED", "ALARM_SUSPEND"]);

/**
 * 报警中心的不同列表接口并不完全一致：有的返回枚举值 alarmStatus，
 * 有的仅返回中文展示值 alarmStatusName。操作可用性必须兼容两种返回。
 */
export function normalizeAlarmStatus(status: unknown): string {
  const value = String(status || "");
  const aliases: Record<string, string> = {
    待接收: "ALARM_UN_CONFIRMED",
    待确认: "ALARM_UN_CONFIRMED",
    处理中: "ALARM_PROGRESS_CONFIRMED",
    已挂起: "ALARM_SUSPEND",
    已处理: "ALARM_HANDLER",
    已关闭: "ALARM_HANDLER",
  };
  return aliases[value] || value;
}

export interface AlarmRecordListSearch {
  pageNumber: number;
  pageSize: number;
  applicationCode: string;
  keyword?: string;
  alarmLevelId?: string;
  alarmStatus?: string;
  alarmHandlerResult?: string;
  alarmHandlerTimeoutStatus?: string;
  startTime?: string;
  endTime?: string;
}

export function buildAlarmRecordListQuery(search: AlarmRecordListSearch): Record<string, unknown> {
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
    alarmStatus: search.alarmStatus?.trim() || undefined,
    alarmHandlerResult: search.alarmHandlerResult?.trim() || undefined,
    alarmHandlerTimeoutStatus: search.alarmHandlerTimeoutStatus?.trim() || undefined,
    startTime: search.startTime?.trim() || undefined,
    endTime: search.endTime?.trim() || undefined,
  };
}

export function canAssignOrHandle(status: unknown): boolean {
  return HANDLABLE_STATUSES.has(normalizeAlarmStatus(status));
}

export function canSuspend(status: unknown): boolean {
  return normalizeAlarmStatus(status) === "ALARM_PROGRESS_CONFIRMED";
}

export function formatHandlerResult(code: unknown): string {
  if (code == null || code === "") {
    return "--";
  }
  return ALARM_RESULT_LABEL[String(code)] || String(code);
}
