import type { HandleRecordApi } from "@g2-contract/attendance/api/handle-record";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

const baseURL = "/attendance";
export function createHandleRecordApi(transport: AttendanceTransport): HandleRecordApi {
  const { Get, service } = transport;
  const getHandleLogPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> => Get(baseURL + "/attendanceLog/page", { params });

  const exportHandleLog = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
    service.get(baseURL + "/attendanceLog/export", { params });
  return { getHandleLogPage, exportHandleLog };
}
