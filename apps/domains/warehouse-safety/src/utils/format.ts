export function emptyText(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  return String(value);
}

export function formatDateTime(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  const text = String(value);
  const numeric = Number(text);
  const date = Number.isFinite(numeric) && numeric > 0 ? new Date(numeric) : new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text;
  }
  const pad = (part: number): string => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
