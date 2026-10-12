function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatParts(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** 兼容 string / epoch ms / Jackson LocalDateTime 数组 [y,m,d,h,mi,s]。 */
export function formatDateTime(value: unknown): string {
  if (value == null || value === "") return "--";

  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "--" : formatParts(d);
  }

  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d, h = 0, mi = 0, s = 0] = value.map((n) => Number(n));
    if (![y, m, d].every((n) => Number.isFinite(n))) return "--";
    // Jackson 月份多为 1-based；与 Date 构造一致时用 monthIndex = m - 1
    const dt = new Date(y, m - 1, d, h, mi, s);
    return Number.isNaN(dt.getTime()) ? "--" : formatParts(dt);
  }

  if (typeof value === "object" && value !== null && "format" in value && typeof (value as { format: unknown }).format === "function") {
    return (value as { format: (pattern: string) => string }).format("YYYY-MM-DD HH:mm:ss");
  }

  const raw = String(value).trim();
  if (!raw) return "--";
  // `YYYY-MM-DD HH:mm:ss` 在部分引擎对空格分隔解析不稳，归一为 ISO 本地形态
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(raw) ? raw.replace(" ", "T") : raw;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return "--";
  return formatParts(d);
}

/** RangePicker 值可能是 dayjs（有 format）或 Date/string；域不直依 dayjs。 */
export function formatRangeBound(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "object" && "format" in value && typeof (value as { format: unknown }).format === "function") {
    return (value as { format: (pattern: string) => string }).format("YYYY-MM-DD HH:mm:ss");
  }
  const formatted = formatDateTime(value);
  return formatted === "--" ? "" : formatted;
}
