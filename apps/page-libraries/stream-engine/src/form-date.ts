export function formatCurrentDateTime(format: string, date = new Date()): string {
  const parts: Record<string, string> = {
    yyyy: String(date.getFullYear()),
    MM: String(date.getMonth() + 1).padStart(2, "0"),
    dd: String(date.getDate()).padStart(2, "0"),
    HH: String(date.getHours()).padStart(2, "0"),
    mm: String(date.getMinutes()).padStart(2, "0"),
    ss: String(date.getSeconds()).padStart(2, "0"),
  };
  return format.replace(/yyyy|MM|dd|HH|mm|ss/g, (token) => parts[token] ?? token);
}

export function formatDateRangeLength(value: unknown): string {
  if (!Array.isArray(value) || value.length !== 2 || !value[0] || !value[1]) return "先选择时间哦";
  const start = new Date(String(value[0]).replace(" ", "T"));
  const end = new Date(String(value[1]).replace(" ", "T"));
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return "先选择时间哦";
  const minutes = Math.floor((end.getTime() - start.getTime()) / 60_000);
  if (minutes === 0) return "0（时长为0，请确认）";
  if (minutes < 0) return "结束时间早于开始时间";
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  const remainingMinutes = minutes % 60;
  return (
    [days && `${days}天`, hours && `${hours}小时`, remainingMinutes && `${remainingMinutes}分钟`].filter(Boolean).join(" ") ||
    "0（时长为0，请确认）"
  );
}
