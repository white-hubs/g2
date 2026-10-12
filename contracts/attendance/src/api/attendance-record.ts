import type { BaseAPIResult, PageResult } from "../common";

export interface FlowApprovalRecordPageParams {
  pageNumber: number;
  pageSize: number;
  applicationCode: string;
  businessType: string | undefined;
  organizationId: string | undefined;
  submitTime: string | undefined;
  businessTime: string | undefined;
  status: string | undefined;
  username: string | undefined;
}

export type FlowApprovalRecordExportParams = Omit<FlowApprovalRecordPageParams, "pageNumber" | "pageSize">;
export interface AttendanceRecordApi {
  attendanceApprovePage(params: {
    pageNumber: number;
    pageSize: number;
    businessType?: string; // 业务类型
    period?: string;
    sceneCode?: string; // 场景编码
    userId?: number;
  }): Promise<BaseAPIResult<PageResult>>;
  flowApprovalRecordPage(params: FlowApprovalRecordPageParams): Promise<BaseAPIResult<PageResult>>;
  flowApprovalRecordExport(params: FlowApprovalRecordExportParams): Promise<BaseAPIResult<Blob>>;
}
