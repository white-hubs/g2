import { formatCurrentDateTime } from "./form-date";

export function alarmRecordPeriod(value: unknown, now = new Date()): string | undefined {
  if (!Array.isArray(value) || value.length < 2 || !value[0] || !value[1]) {
    return undefined;
  }
  const [start, end] = value.map(String);
  if (start!.includes("-")) {
    return `${start},${end}`;
  }
  const date = formatCurrentDateTime("yyyy-MM-dd", now);
  return `${date} ${start},${date} ${end}`;
}

export function alarmRecordTime(value: unknown): string {
  if (!value) {
    return "--";
  }
  if (typeof value === "number") {
    return formatCurrentDateTime("yyyy-MM-dd HH:mm", new Date(value));
  }
  return String(value).slice(0, 16);
}

export function alarmRecordDetailPath(record: Record<string, unknown>, registeredPaths: readonly string[] = []): string | undefined {
  const id = String(record.id || record.businessKey || "");
  if (!id) {
    return undefined;
  }
  const query = new URLSearchParams({
    id,
    businessKey: String(record.businessKey || id),
    alarmStatus: String(record.alarmStatus ?? ""),
    type: "detail",
  });
  const path = registeredPaths.includes("/d/security-monitor/alarmDetail")
    ? "/d/security-monitor/alarmDetail"
    : "/portal/genericEquipmentMonitor/alarmDetail";
  return `${path}?${query.toString()}`;
}
