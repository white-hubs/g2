import { dayjs } from "@g2-platform/pc-ui";

function parseBackendTime(value: string | number | null | undefined): dayjs.Dayjs | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const raw = String(value).trim();
  if (/^\d+$/.test(raw)) {
    const num = Number(raw);
    const ms = raw.length <= 10 ? num * 1000 : num;
    const parsed = dayjs(ms);
    return parsed.isValid() ? parsed : null;
  }
  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed : null;
}

/** 格式化后端时间戳或日期字符串为 YYYY-MM-DD */
export function formatDate(value: string | number | null | undefined): string {
  const parsed = parseBackendTime(value);
  if (!parsed) {
    return value === undefined || value === null || value === "" ? "--" : String(value);
  }
  return parsed.format("YYYY-MM-DD");
}

/** 格式化后端时间戳或日期字符串为 YYYY-MM-DD HH:mm:ss */
export function formatDateTime(value: string | number | null | undefined): string {
  const parsed = parseBackendTime(value);
  if (!parsed) {
    return value === undefined || value === null || value === "" ? "--" : String(value);
  }
  return parsed.format("YYYY-MM-DD HH:mm:ss");
}
