import type { PageResult } from "@g2-contract/safety-management";

export type RecordRow = Record<string, unknown>;

export const alarmLevels = [
  { code: "one_level", label: "一级报警" },
  { code: "two_level", label: "二级报警" },
  { code: "three_level", label: "三级报警" },
  { code: "four_level", label: "四级报警" },
];

export const alarmStatuses = [
  { label: "所有", value: "" },
  { label: "待接收", value: "ALARM_UN_CONFIRMED" },
  { label: "处理中", value: "ALARM_PROGRESS_CONFIRMED" },
  { label: "已处理", value: "ALARM_HANDLER" },
  { label: "已挂起", value: "ALARM_SUSPEND" },
];

export const alarmTimeoutStatuses = [
  { label: "超时", value: "TIMED_OUT" },
  { label: "正常", value: "NORMAL" },
];

export const alarmHandlerResults = [
  { label: "实报", value: "ALARM_ACTUAL" },
  { label: "误报", value: "ALARM_IMPRACTICAL" },
];

export function asRecord(value: unknown): RecordRow {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as RecordRow) : {};
}

export function asRows(value: unknown): RecordRow[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is RecordRow => Boolean(item) && typeof item === "object");
  }
  const record = asRecord(value);
  for (const key of ["records", "list", "items", "content", "children", "subItems"]) {
    if (Array.isArray(record[key])) {
      return asRows(record[key]);
    }
  }
  return [];
}

export function text(value: unknown, fallback = "--"): string {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return String(value);
}

export function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDate(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  if (typeof value === "string" && /\d{4}-\d{2}-\d{2}/u.test(value)) {
    return value.replace("T", " ").slice(0, 19);
  }
  const date = new Date(typeof value === "number" ? value : String(value));
  if (Number.isNaN(date.getTime())) {
    return text(value);
  }
  const pad = (part: number): string => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function pageOrEmpty(value: PageResult | undefined): PageResult {
  return value ?? { records: [], total: 0, pageNumber: 1, pageSize: 10 };
}

export function toPeriod(value: unknown[]): string {
  if (!Array.isArray(value) || value.length !== 2) {
    return "";
  }
  return value
    .map((item) => {
      if (item && typeof item === "object" && "format" in item && typeof (item as { format?: unknown }).format === "function") {
        return (item as { format: (pattern: string) => string }).format("YYYY-MM-DD");
      }
      return String(item ?? "");
    })
    .filter(Boolean)
    .join(",");
}

export function flattenTree(items: RecordRow[], parent = ""): RecordRow[] {
  const result: RecordRow[] = [];
  for (const item of items) {
    const name = text(item.itemName ?? item.name, "");
    const path = [parent, name].filter(Boolean).join(" / ");
    const next = { ...item, displayPath: path };
    result.push(next);
    result.push(...flattenTree(asRows(item.children ?? item.subItems), path));
  }
  return result;
}

export function currentTenantCode(): string {
  try {
    const raw = globalThis.sessionStorage?.getItem("GH-NowEnterprise");
    if (!raw) {
      return "";
    }
    const value = JSON.parse(raw) as Record<string, unknown>;
    return text(value.code ?? value.tenantCode ?? value.id, "");
  } catch {
    return "";
  }
}
