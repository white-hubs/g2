/** 旧仓 `timeFormat`：带秒或仅日期；空值返回 null，由页面统一落到 `--`。 */
export function timeFormat(value: string | number | Date | null | undefined, withTime = true): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const pad = (input: number): string => String(input).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return withTime ? `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` : day;
}

/** 旧仓 `millennial`：千分位展示；`withDecimal=false` 时不保留两位小数。 */
export function millennial(value: number | string | null | undefined, withDecimal = true): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  const [integer, decimal] = numeric.toFixed(2).split(".");
  const formatted = Number(integer).toLocaleString();
  return withDecimal ? `${formatted}.${decimal}` : formatted;
}

/** 表格/详情空值统一展示为 `--`，保留 0 与 false。 */
export function orDash(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  return String(value);
}

/** 旧页把 RangePicker 区间拼成 `开始 00:00:00,结束 23:59:59` 后作为 period 提交。 */
export function toPeriod(range: unknown): string | undefined {
  if (!Array.isArray(range) || range.length !== 2) {
    return undefined;
  }
  const [start, end] = range.map((item) => String(item ?? "").slice(0, 10));
  return start && end ? `${start} 00:00:00,${end} 23:59:59` : undefined;
}

/** 浏览器下载 Blob，供维保统计导出使用。 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
