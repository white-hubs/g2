import type { AlarmModalItem } from "./alarm-queue";
import { isStorageArchiveAlarm } from "./alarm-queue";

export type StorageArchiveSnapshot = {
  warehouseId?: string | number;
  currentVolume?: string | number;
  volumeThreshold?: string | number;
  volumeOp?: string;
  volumeAlarm?: boolean;
  currentWeight?: string | number;
  weightThreshold?: string | number;
  weightOp?: string;
  weightAlarm?: boolean;
  acquisitionDate?: string;
};

export function formatStorageValue(value?: string | number): string {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }
  return String(Number(numericValue.toFixed(3)));
}

export function getOpText(op?: string): string {
  const opMap: Record<string, string> = {
    GT: ">",
    GE: "≥",
    LT: "<",
    LE: "≤",
    EQ: "=",
    NE: "≠",
  };
  return opMap[(op || "GE").toUpperCase()] ?? "≥";
}

export function parseStorageArchiveSnapshot(alarm: Partial<AlarmModalItem> | null | undefined): StorageArchiveSnapshot | null {
  if (!isStorageArchiveAlarm(alarm) || !alarm?.alarmSnapshot) {
    return null;
  }
  try {
    const snapshot =
      typeof alarm.alarmSnapshot === "string" ? (JSON.parse(alarm.alarmSnapshot) as StorageArchiveSnapshot) : alarm.alarmSnapshot;
    if (snapshot && ("currentVolume" in snapshot || "currentWeight" in snapshot)) {
      return snapshot as StorageArchiveSnapshot;
    }
  } catch {
    return null;
  }
  return null;
}

export function buildStorageArchiveMessage(alarm: Partial<AlarmModalItem> | null, snapshot: StorageArchiveSnapshot | null): string {
  if (!snapshot) {
    return "";
  }
  const targetName = alarm?.alarmTargetName || "当前仓库";
  const alarms = [
    snapshot.volumeAlarm && {
      type: "容积",
      current: snapshot.currentVolume,
      threshold: snapshot.volumeThreshold,
      op: snapshot.volumeOp,
    },
    snapshot.weightAlarm && {
      type: "重量",
      current: snapshot.currentWeight,
      threshold: snapshot.weightThreshold,
      op: snapshot.weightOp,
    },
  ].filter(Boolean) as { type: string; current?: string | number; threshold?: string | number; op?: string }[];
  if (!alarms.length) {
    return "";
  }
  return `【雷达监测】当前${targetName}的储量为${alarms
    .map((item) => `${item.type}${formatStorageValue(item.current)}`)
    .join("、")}达到${alarms
    .map((item) => `${item.type}${getOpText(item.op)}${formatStorageValue(item.threshold)}`)
    .join("、")}阈值，请尽快处理`;
}

export function buildStorageArchiveDescription(alarm: Partial<AlarmModalItem> | null): string {
  if (alarm?.msgContent) {
    return alarm.msgContent;
  }
  return buildStorageArchiveMessage(alarm, parseStorageArchiveSnapshot(alarm));
}
