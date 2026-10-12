import dayjs from "dayjs";

/** 后端毫秒时间戳或日期字符串 → `YYYY-MM-DD HH:mm:ss`；空值返回空字符串 */
export function formatApiDateTime(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    const formatted = dayjs(numeric).format("YYYY-MM-DD HH:mm:ss");
    return formatted === "Invalid Date" ? String(value) : formatted;
  }

  const parsed = dayjs(String(value));
  if (parsed.isValid()) {
    return parsed.format("YYYY-MM-DD HH:mm:ss");
  }

  return String(value);
}

/** 表单提交：日期字符串或毫秒时间戳 → 毫秒时间戳字符串 */
export function toApiDateTimeMs(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return String(numeric);
  }

  const parsed = dayjs(String(value));
  if (parsed.isValid()) {
    return String(parsed.valueOf());
  }

  return String(value);
}

/** 表单提交：日期字符串或毫秒时间戳 → 后端 LocalDateTime 字符串 */
export function toApiLocalDateTime(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const numeric = Number(value);
  const parsed = Number.isFinite(numeric) && numeric > 0 ? dayjs(numeric) : dayjs(String(value));

  if (parsed.isValid()) {
    return parsed.format("YYYY-MM-DD HH:mm:ss");
  }

  return String(value);
}

/** 展示用：空值显示 `--` */
export function formatDateTime(value: unknown): string {
  const formatted = formatApiDateTime(value);
  return formatted || "--";
}
