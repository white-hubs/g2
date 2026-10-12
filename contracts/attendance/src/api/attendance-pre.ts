import type { BaseAPIResult, PageResult } from "../common";

export interface AttendancePreApi {
  beforeStatPage(params: unknown, permissionId?: string): Promise<BaseAPIResult<PageResult>>;
  beforeStatExport(params: unknown): Promise<BaseAPIResult<Blob>>;
}
