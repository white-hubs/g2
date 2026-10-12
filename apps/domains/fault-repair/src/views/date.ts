const pad = (value: number): string => String(value).padStart(2, "0");

export function formatDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDateTime(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  const normalized = typeof value === "string" && /^\d+$/u.test(value) ? Number(value) : value;
  const date = new Date(typeof normalized === "string" ? normalized.replace(" ", "T") : normalized);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return `${formatDay(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function currentMonthRange(now = new Date()): string[] {
  return [formatDay(new Date(now.getFullYear(), now.getMonth(), 1)), formatDay(now)];
}
