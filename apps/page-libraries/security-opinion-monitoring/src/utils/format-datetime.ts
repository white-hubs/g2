import dayjs from "dayjs";

/** 后端时间戳（毫秒）或日期字符串 → `YYYY-MM-DD HH:mm:ss` */
export function formatDateTime(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return dayjs(numeric).format("YYYY-MM-DD HH:mm:ss");
  }

  const parsed = dayjs(String(value));
  if (parsed.isValid()) {
    return parsed.format("YYYY-MM-DD HH:mm:ss");
  }

  return String(value);
}
