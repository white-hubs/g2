import dayjs from "dayjs";

export function formatTimestamp(date: Date, pattern = "YYYY-MM-DD HH:mm:ss"): string {
  return dayjs(date).format(pattern);
}
