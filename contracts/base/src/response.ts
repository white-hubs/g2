export interface ErrorResponse<T> {
  status: number;
  code: string;
  message: string;
  details: T;
  timestamp: number;
}

export interface Pagination<T> {
  total: number;
  pages: number;
  records: T[];
}
