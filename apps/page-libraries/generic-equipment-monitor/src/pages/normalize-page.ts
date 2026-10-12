import type { PageResultVo } from "@g2-platform/pc-ui/use-pc-table";

/** 归一化后端分页为 pc-ui table 期望形状。 */
export function normalizeAlarmPage(result: unknown): PageResultVo {
  if (!result || typeof result !== "object") {
    return { records: [], total: 0, pages: 0 };
  }
  const root = result as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const list = (data.list || data.records || data.content || data.rows || []) as unknown[];
  const records = Array.isArray(list) ? list : [];
  const total = Number(data.total ?? data.totalElements ?? records.length ?? 0);
  const pageSize = Number(data.pageSize ?? data.size ?? 10) || 10;
  const pages = Number(data.pages ?? Math.ceil(total / pageSize) ?? 1) || 1;
  return { total, pages, records };
}

export function formatAlarmTime(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  const n = typeof value === "number" ? value : Number(value);
  const d = Number.isFinite(n) && String(value).length >= 10 ? new Date(n) : new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    return String(value);
  }
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
