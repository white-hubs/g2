import type {
  AttendanceRecordApi,
  FlowApprovalRecordExportParams,
  FlowApprovalRecordPageParams,
} from "@g2-contract/attendance/api/attendance-record";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

export function createAttendanceRecordApi(transport: AttendanceTransport): AttendanceRecordApi {
  const { Get, service } = transport;
  const attendanceApprovePage = async (params: {
    pageNumber: number;
    pageSize: number;
    businessType?: string; // 业务类型
    period?: string;
    sceneCode?: string; // 场景编码
    userId?: number;
  }): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/att/getApproveByUserPage", {
      params,
    });

  const flowApprovalRecordPage = async (params: FlowApprovalRecordPageParams): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/att/approve/record/page", { params });

  const flowApprovalRecordExport = async (params: FlowApprovalRecordExportParams): Promise<BaseAPIResult<Blob>> =>
    service.get("/attendance/att/approve/record/export", { params });
  return { attendanceApprovePage, flowApprovalRecordPage, flowApprovalRecordExport };
}
