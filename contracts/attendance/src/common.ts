export interface BaseAPIResult<T = unknown> {
  error: { type: "axios" | "http" | "backend"; code: string | number; msg: string } | null;
  code: number;
  data: T;
  message: string;
  timestamp: number;
}
export interface PageResult {
  total: number;
  page: number;
  records: unknown[];
}
export interface PageLeaveLedgerResult {
  total: number;
  page: number;
  records: unknown[];
  tableTitle: {
    id: number;
    name: number;
    notLimit: number;
  }[];
}
