import type { OffDutyRules, StaffOffDutyApi } from "@g2-contract/attendance/api/staff-off-duty";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

export function createStaffOffDutyApi(transport: AttendanceTransport): StaffOffDutyApi {
  const { Delete, Get, Post, service } = transport;
  const offDutyRulesPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/att/leavePost/rule/page", { params });

  const offDutyRulesDetail = async (params: { id: string }): Promise<BaseAPIResult<OffDutyRules>> =>
    Get("/attendance/att/leavePost/rule/detail?id=" + params.id);

  const offDutyRulesInsert = async (params: OffDutyRules): Promise<BaseAPIResult<unknown>> =>
    Post("/attendance/att/leavePost/rule/add", params);

  const offDutyRulesUpdate = async (params: OffDutyRules & { id: string }): Promise<BaseAPIResult<unknown>> =>
    Post("/attendance/att/leavePost/rule/edit", params);

  const offDutyRulesDelete = async (params: { id: string }): Promise<BaseAPIResult<unknown>> =>
    Delete("/attendance/att/leavePost/rule/remove?id=" + params.id);

  const offDutyLedgerPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/att/leavePost/ledger/page", { params });

  const offDutyLedgerExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
    service.get("/attendance/att/leavePost/ledger/export", { params });
  return {
    offDutyRulesPage,
    offDutyRulesDetail,
    offDutyRulesInsert,
    offDutyRulesUpdate,
    offDutyRulesDelete,
    offDutyLedgerPage,
    offDutyLedgerExport,
  };
}
