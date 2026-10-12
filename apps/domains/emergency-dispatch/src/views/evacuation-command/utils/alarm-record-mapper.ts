import dayjs from "dayjs";

import type { EmergencyEvent, EmergencyEventLevelKey, EmergencyEventStatus, RoutePoint } from "../../evacuation-shared/data/types";
import { DEFAULT_MAP_CENTER } from "../../evacuation-shared/map/constants";

/** 指挥页可选报警状态：待处理 + 处理中 */
export const DEFAULT_ALARM_EVENT_STATUSES = ["ALARM_UN_CONFIRMED", "ALARM_PROGRESS_CONFIRMED"] as const;

export type AlarmEventStatusFilter = (typeof DEFAULT_ALARM_EVENT_STATUSES)[number];

export const ALARM_EVENT_STATUS_FILTER_OPTIONS: { value: AlarmEventStatusFilter; label: string }[] = [
  { value: "ALARM_UN_CONFIRMED", label: "待处理" },
  { value: "ALARM_PROGRESS_CONFIRMED", label: "处理中" },
];

export interface AlarmRecordItem {
  id: string | number;
  alarmTypeName?: string;
  alarmEventName?: string;
  alarmEventTypeName?: string;
  alarmLevelName?: string;
  alarmLevelSort?: number;
  alarmStatus?: string;
  alarmStatusName?: string;
  area?: string | number;
  areaId?: string | number;
  areaName?: string;
  alarmTargetAddress?: string;
  alarmTargetName?: string;
  alarmTime?: string | number;
  alarmTargetLongitude?: string | number;
}

function readText(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return String(value).trim();
}

function formatAlarmTime(value: unknown): string {
  if (value == null || value === "") {
    return "--";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return dayjs(value).format("YYYY-MM-DD HH:mm");
  }
  const text = readText(value);
  if (!text) {
    return "--";
  }
  if (/^\d+$/.test(text)) {
    const timestamp = Number(text);
    if (Number.isFinite(timestamp)) {
      return dayjs(timestamp).format("YYYY-MM-DD HH:mm");
    }
  }
  const parsed = dayjs(text);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm") : "--";
}

function alarmTypeIcon(typeName: string): string {
  if (typeName.includes("火")) {
    return "🔥";
  }
  if (typeName.includes("泄漏") || typeName.includes("溢") || typeName.includes("毒")) {
    return "☣️";
  }
  if (typeName.includes("燃气") || typeName.includes("气")) {
    return "💨";
  }
  if (typeName.includes("电梯") || typeName.includes("困人")) {
    return "🛗";
  }
  if (typeName.includes("水") || typeName.includes("洪")) {
    return "🌊";
  }
  if (typeName.includes("雷达")) {
    return "📡";
  }
  return "⚠️";
}

function levelKeyFromAlarm(levelName: string, levelSort?: number): EmergencyEventLevelKey {
  if (levelSort === 1 || levelName.includes("一")) {
    return "major";
  }
  if (levelSort === 2 || levelName.includes("二")) {
    return "serious";
  }
  if (levelSort === 3 || levelName.includes("三")) {
    return "moderate";
  }
  return "normal";
}

function mapAlarmStatus(status: string, statusName: string): { status: EmergencyEventStatus; statusLabel: string } {
  switch (status) {
    case "ALARM_HANDLER":
      return { status: "resolved", statusLabel: statusName || "已处理" };
    case "ALARM_UN_CONFIRMED":
      return { status: "pending", statusLabel: statusName || "待接收" };
    case "ALARM_SUSPEND":
      return { status: "processing", statusLabel: statusName || "已挂起" };
    case "ALARM_PROGRESS_CONFIRMED":
      return { status: "processing", statusLabel: statusName || "处理中" };
    default:
      return { status: "pending", statusLabel: statusName || "待确认" };
  }
}

function parseAlarmPoint(longitude: unknown, fallback: RoutePoint = DEFAULT_MAP_CENTER): RoutePoint {
  const text = readText(longitude);
  if (!text) {
    return { ...fallback };
  }
  const [lngRaw, latRaw] = text.split(",");
  const lng = Number(lngRaw);
  const lat = Number(latRaw);
  if (Number.isFinite(lng) && Number.isFinite(lat)) {
    return { lng, lat };
  }
  return { ...fallback };
}

function parseAlarmAreaId(record: AlarmRecordItem): string | null {
  const raw = record.areaId ?? record.area;
  const text = readText(raw);
  if (!text) {
    return null;
  }
  const segments = text
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1]! : text;
}

function formatLocation(record: AlarmRecordItem): string {
  const area = readText(record.areaName);
  const address = readText(record.alarmTargetAddress) || readText(record.alarmTargetName);
  if (area && address) {
    return `${area}·${address}`;
  }
  return area || address || "--";
}

export function mapAlarmRecordToEmergencyEvent(record: AlarmRecordItem, fallbackPoint?: RoutePoint): EmergencyEvent {
  const type = readText(record.alarmTypeName) || readText(record.alarmEventName) || readText(record.alarmEventTypeName) || "报警事件";
  const level = readText(record.alarmLevelName) || "一般";
  const status = readText(record.alarmStatus);
  const statusName = readText(record.alarmStatusName);
  const { status: eventStatus, statusLabel } = mapAlarmStatus(status, statusName);
  const areaName = readText(record.areaName) || null;
  return {
    id: String(record.id),
    type,
    icon: alarmTypeIcon(type),
    level,
    levelKey: levelKeyFromAlarm(level, record.alarmLevelSort),
    location: formatLocation(record),
    status: eventStatus,
    statusLabel,
    time: formatAlarmTime(record.alarmTime),
    firePoint: parseAlarmPoint(record.alarmTargetLongitude, fallbackPoint),
    areaId: parseAlarmAreaId(record),
    areaName,
  };
}

function alarmTimeValue(record: AlarmRecordItem): number {
  const value = record.alarmTime;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const text = readText(value);
  if (/^\d+$/.test(text)) {
    return Number(text);
  }
  const parsed = dayjs(text);
  return parsed.isValid() ? parsed.valueOf() : 0;
}

export function mergeAlarmRecords(records: AlarmRecordItem[], limit?: number): AlarmRecordItem[] {
  const merged = new Map<string, AlarmRecordItem>();
  for (const record of records) {
    merged.set(String(record.id), record);
  }
  const sorted = [...merged.values()].sort((a, b) => alarmTimeValue(b) - alarmTimeValue(a));
  return limit == null ? sorted : sorted.slice(0, limit);
}

export interface AlarmRecordsPageResult {
  records: AlarmRecordItem[];
  total: number;
  pages: number;
}

export function parseAlarmRecordsPageResult(res: unknown): AlarmRecordsPageResult {
  if (!res || typeof res !== "object") {
    return { records: [], total: 0, pages: 0 };
  }
  const root = res as Record<string, unknown>;
  const page = Array.isArray(root.records) || root.total !== undefined || root.pages !== undefined ? root : root.data;
  if (!page || typeof page !== "object") {
    return { records: [], total: 0, pages: 0 };
  }
  const payload = page as Record<string, unknown>;
  const records = Array.isArray(payload.records) ? (payload.records as AlarmRecordItem[]) : [];
  const total = typeof payload.total === "number" ? payload.total : Number(payload.total) || 0;
  const pages = typeof payload.pages === "number" ? payload.pages : Number(payload.pages) || 0;
  return { records, total, pages };
}

export function parseAlarmRecordsPage(res: unknown): AlarmRecordItem[] {
  return parseAlarmRecordsPageResult(res).records;
}
