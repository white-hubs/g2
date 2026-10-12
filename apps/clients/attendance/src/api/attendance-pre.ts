import type { AttendancePreApi } from "@g2-contract/attendance/api/attendance-pre";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

export function createAttendancePreApi(transport: AttendanceTransport): AttendancePreApi {
  const { Get, service } = transport;
  const beforeStatPage = async (params: unknown, permissionId = ""): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/att/beforeStat/page", {
      headers: {
        permission: permissionId,
      },
      params,
    });

  const beforeStatExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
    service.get("/attendance/att/beforeStat/export", {
      params,
    });
  return { beforeStatPage, beforeStatExport };
}
