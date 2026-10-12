import dayjs from "dayjs";

export type TimeValue = string | number | null | undefined;

const normalizeTimestamp = (value: string | number): string | number => {
  const numericValue = typeof value === "number" || /^\d+$/.test(value) ? Number(value) : null;
  if (numericValue === null) {
    return value;
  }
  return numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue;
};

export const formatTime = (value: TimeValue, emptyText = "-"): string => {
  if (value === undefined || value === null || value === "") {
    return emptyText;
  }
  const time = dayjs(normalizeTimestamp(value));
  return time.isValid() ? time.format("YYYY-MM-DD HH:mm:ss") : String(value);
};
