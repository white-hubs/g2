import type { BaseAPIResult, PageResult } from "../common";

export interface HandleRecordApi {
  getHandleLogPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  exportHandleLog(params: unknown): Promise<BaseAPIResult<Blob>>;
}
