export type RecordMap = Record<string, unknown>;

export interface PageResult<T> {
  records: T[];
  total: number;
}

export interface AuthScope {
  scopeType: "DEVICE_AREA" | "DEVICE_GROUP" | "DEVICE";
  scopeName: string;
  scopeId: string;
}

export interface AuthGrantTarget {
  targetType: "DEPARTMENT" | "ROLE" | "USER";
  targetIds: string[];
}

export interface DeviceAuth {
  id: string;
  authScopes: AuthScope[];
  deviceCount: number;
  grantTargets: AuthGrantTarget[];
}

export interface CameraOption {
  id: string;
  name: string;
  code?: string;
  areaName?: string;
  onlineStatus?: string;
}

export interface InspectionAlgorithm {
  id: string;
  name: string;
  code?: string;
  enabled?: boolean;
}

export interface InspectionPlan {
  id: string;
  name: string;
  principalUserId?: string;
  principalUserName?: string;
  executionMode?: "ONCE" | "CYCLE";
  cycleType?: "EVERY_DAY" | "EVERY_WEEK" | "EVERY_MONTH";
  cycleValues?: string;
  executeTime?: string;
  startTime?: string | number;
  endTime?: string | number;
  nextExecuteTime?: string | number;
  lastExecuteTime?: string | number;
  enabled?: boolean;
  immediateExecute?: boolean;
  taskLimitMinutes?: number;
  cameraNum?: number;
  remark?: string;
  createTime?: string | number;
  version?: string;
}

export interface InspectionPlanCamera {
  id?: string;
  deviceId: string;
  algorithmId: string;
  sort?: number;
}

export interface InspectionActionRule {
  id?: string;
  deviceId: string;
  enabled?: boolean;
  actionType?: "ALARM" | "WORK_ORDER";
  confidenceThreshold?: number;
  emergencyRuleId?: string;
  workOrderTemplateId?: string;
}

export interface InspectionTask {
  id: string;
  planId?: string;
  planName?: string;
  executionType?: string;
  scheduledTime?: string | number;
  startTime?: string | number;
  endTime?: string | number;
  status?: string;
  timeout?: boolean;
  totalNum?: number;
  normalNum?: number;
  abnormalNum?: number;
  failNum?: number;
  errorMessage?: string;
  cameras?: InspectionTaskCamera[];
}

export interface InspectionTaskCamera {
  id: string;
  deviceId?: string;
  deviceNameSnapshot?: string;
  deviceCodeSnapshot?: string;
  areaNameSnapshot?: string;
  algorithmNameSnapshot?: string;
  previewUrl?: string;
  aiAbnormal?: boolean;
  confidence?: number;
  aiSummary?: string;
  status?: string;
  errorMessage?: string;
}

export interface InspectionEvent {
  id: string;
  taskId?: string;
  planId?: string;
  deviceId?: string;
  deviceNameSnapshot?: string;
  areaNameSnapshot?: string;
  algorithmNameSnapshot?: string;
  previewUrl?: string;
  confidence?: number;
  aiSummary?: string;
  actionType?: string;
  actionStatus?: string;
  actionTargetName?: string;
  ignored?: boolean;
  ignoreReason?: string;
  createTime?: string | number;
}

export function asRecord(value: unknown): RecordMap {
  return value && typeof value === "object" ? (value as RecordMap) : {};
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asPage<T>(value: unknown): PageResult<T> {
  const source = asRecord(value);
  const records = asArray<T>(source.records ?? source.content ?? source.data);
  return { records, total: Number(source.total ?? source.totalElements ?? records.length) || 0 };
}

export function displayDateTime(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  const parsed = typeof value === "number" ? new Date(value) : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  const pad = (part: number): string => String(part).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
}

export function safeText(value: unknown, fallback = "--"): string {
  return value === undefined || value === null || value === "" ? fallback : String(value);
}
