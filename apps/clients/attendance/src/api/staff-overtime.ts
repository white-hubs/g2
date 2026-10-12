import type { OvertimeRule, StaffOvertimeApi } from "@g2-contract/attendance/api/staff-overtime";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

export function createStaffOvertimeApi(transport: AttendanceTransport): StaffOvertimeApi {
  const { Delete, Get, Post, service } = transport;
  const overtimeRulesPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/work-overtime-rule/page", { params });

  const overtimeRulesList = async (params?: unknown): Promise<BaseAPIResult<{ id: string; name: string }[]>> =>
    Get("/attendance/work-overtime-rule/list", { params });

  const overtimeLedgerPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/getWorkOvertimeLedgerPage", { params });

  const overtimeDetailPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/getWorkOvertimeLedgerDetailsPage", { params });

  const overtimeLedgerExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
    service.get("/attendance/getWorkOvertimeLedgerExcel", { params });

  const overtimeDetailExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
    service.get("/attendance/getWorkOvertimeLedgerDetailsExcel", { params });

  const overtimeRulesDelete = async (params: { id: string }): Promise<BaseAPIResult> =>
    Delete("/attendance//work-overtime-rule/" + params.id);

  const overtimeRulesPost = async (params: OvertimeRule): Promise<BaseAPIResult<unknown>> => Post("/attendance/work-overtime-rule", params);

  const overtimeRulesDetail = async (params: { id: string }): Promise<BaseAPIResult<OvertimeRule>> =>
    Get("/attendance/work-overtime-rule/" + params.id);
  return {
    overtimeRulesPage,
    overtimeRulesList,
    overtimeLedgerPage,
    overtimeDetailPage,
    overtimeLedgerExport,
    overtimeDetailExport,
    overtimeRulesDelete,
    overtimeRulesPost,
    overtimeRulesDetail,
  };
}
