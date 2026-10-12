import type { FlowApprovalRecordExportParams, FlowApprovalRecordPageParams } from "@g2-contract/attendance/api/attendance-record";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/attendance-record";

export const attendanceApprovePage = async (params: {
  pageNumber: number;
  pageSize: number;
  businessType?: string; // 业务类型
  period?: string;
  sceneCode?: string; // 场景编码
  userId?: number;
}): Promise<BaseAPIResult<PageResult>> => (await getAttendanceClient()).attendanceApprovePage(params);

export const flowApprovalRecordPage = async (params: FlowApprovalRecordPageParams): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).flowApprovalRecordPage(params);

export const flowApprovalRecordExport = async (params: FlowApprovalRecordExportParams): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).flowApprovalRecordExport(params);
