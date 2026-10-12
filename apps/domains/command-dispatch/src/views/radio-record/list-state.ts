import type { RecordingQuery } from "@g2-contract/command-dispatch";

export interface PageState<T> {
  loading: boolean;
  error: string;
  records: T[];
  total: number;
}

export interface RecordingSearch {
  code: string;
  period: string;
  fileType: string;
  pageNumber: number;
  pageSize: number;
}

export function parsePageValue(field: string, raw: unknown): unknown {
  if (field !== "pageNumber" && field !== "pageSize") {
    return raw;
  }
  const value = Number(raw);
  const fallback = field === "pageSize" ? 10 : 1;
  return Number.isSafeInteger(value) && value > 0 && (field !== "pageSize" || value <= 100) ? value : fallback;
}

export function restorePeriod(period: string): [string, string] | undefined {
  const dates = period.split(",");
  if (dates.length !== 2) {
    return undefined;
  }
  const [start, end] = dates;
  const isDate = (value: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  return isDate(start) && isDate(end) && start <= end ? [start, end] : undefined;
}

export function recordingQuery(state: RecordingSearch): RecordingQuery {
  return {
    code: state.code,
    period: restorePeriod(state.period)?.join(",") ?? "",
    fileType: state.fileType === "all" ? null : state.fileType === "voice" ? "voice" : "video",
    pageNumber: state.pageNumber,
    pageSize: state.pageSize,
  };
}

export function errorText(error: unknown, fallback = "加载失败，请重试"): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function createPageLoader<T>(state: PageState<T>) {
  let latestRequest = 0;
  return async (fetchPage: () => Promise<{ records: T[]; total: number }>): Promise<void> => {
    const request = ++latestRequest;
    state.loading = true;
    state.error = "";
    try {
      const page = await fetchPage();
      if (request !== latestRequest) {
        return;
      }
      state.records = page.records;
      state.total = page.total;
    } catch (error) {
      if (request === latestRequest) {
        state.error = errorText(error);
      }
    } finally {
      if (request === latestRequest) {
        state.loading = false;
      }
    }
  };
}
