import type { LeaveRules, StaffLeaveApi } from "@g2-contract/attendance/api/staff-leave";
import type { BaseAPIResult, PageLeaveLedgerResult, PageResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

export function createStaffLeaveApi(transport: AttendanceTransport): StaffLeaveApi {
  const { Delete, Get, Post, Put, service } = transport;
  const leaveRulesPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/att/holiday/rule/page", { params });

  const leaveRulesList = async (): Promise<BaseAPIResult> => Get("/attendance/att/holiday/rule/list");

  const getHolidayList = async (): Promise<BaseAPIResult> => Get("/attendance/att/legal/holiday/list");

  const leaveRulesDetail = async (params: { id: string }): Promise<BaseAPIResult<LeaveRules>> =>
    Get("/attendance/att/holiday/rule/detail?id=" + params.id);

  const leaveRulesInsert = async (params: LeaveRules): Promise<BaseAPIResult<unknown>> => Post("/attendance/att/holiday/rule/add", params);

  const leaveRulesUpdate = async (params: LeaveRules & { id: string }): Promise<BaseAPIResult<unknown>> =>
    Put("/attendance/att/holiday/rule/edit", params);

  const leaveRulesDelete = async (params: { id: string }): Promise<BaseAPIResult<unknown>> =>
    Delete("/attendance/att/holiday/rule/remove?id=" + params.id);

  const leaveBalancePage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/att/Holiday/balance/page", { params });

  const leaveBalanceUpdate = async (params: unknown): Promise<BaseAPIResult<unknown>> =>
    Put("/attendance/att/Holiday/balance/edit", params);

  const leaveBalanceDetailPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/att/Holiday/balance/record/page", { params });

  const leaveBalanceExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
    service.get("/attendance/att/Holiday/balance/export", { params });

  const leaveBalanceCancel = async (params: unknown): Promise<BaseAPIResult> =>
    Get("/attendance/att/holiday/balance/record/effective", { params });

  const getStaffLeaveBalance = async (params: {
    staffId: string;
    holidayRuleId: number | string;
    unit: "小时" | "天";
  }): Promise<BaseAPIResult<{ total: number; notLimit: boolean }>> => Get("/attendance/att/Holiday/balance/total", { params });

  const getStaffleaveLedger = async (params: unknown): Promise<BaseAPIResult<PageLeaveLedgerResult>> =>
    Get("/attendance/att/askLeave/ledger/page", { params });

  const exportStaffLeave = async (params: unknown): Promise<BaseAPIResult> => Post("/attendance/att/askLeave/ledger/export", { params });

  const getHolidayRuleNotLimit = async (params?: unknown): Promise<BaseAPIResult> =>
    Get("/attendance/att/holiday/rule/notLimit/list", { params });

  const holidayBalanceDownLoad = async (params: {
    holidayIdList: (string | number)[];
    initTemplate: boolean;
  }): Promise<BaseAPIResult<Blob>> => service.post("/attendance/att/holiday/balance/template/download", params);

  const holidayBalanceImport = async (params: { file: Blob | null; init: boolean; ruleNames: string }): Promise<BaseAPIResult> =>
    Post("/attendance/att/Holiday/balance/import", params, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  return {
    leaveRulesPage,
    leaveRulesList,
    getHolidayList,
    leaveRulesDetail,
    leaveRulesInsert,
    leaveRulesUpdate,
    leaveRulesDelete,
    leaveBalancePage,
    leaveBalanceUpdate,
    leaveBalanceDetailPage,
    leaveBalanceExport,
    leaveBalanceCancel,
    getStaffLeaveBalance,
    getStaffleaveLedger,
    exportStaffLeave,
    getHolidayRuleNotLimit,
    holidayBalanceDownLoad,
    holidayBalanceImport,
  };
}
