const pad = (value: number): string => String(value).padStart(2, "0");

export function formatDateTime(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  const normalized = typeof value === "string" && /^\d+$/u.test(value) ? Number(value) : value;
  const date = new Date(typeof normalized === "string" ? normalized.replace(" ", "T") : normalized);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
