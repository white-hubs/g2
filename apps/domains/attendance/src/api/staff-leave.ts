import type { LeaveRules } from "@g2-contract/attendance/api/staff-leave";
import type { BaseAPIResult, PageLeaveLedgerResult, PageResult } from "@g2-contract/attendance/common";

import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/staff-leave";

export const leaveRulesPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).leaveRulesPage(params);

export const leaveRulesList = async (): Promise<BaseAPIResult> => (await getAttendanceClient()).leaveRulesList();

export const getHolidayList = async (): Promise<BaseAPIResult> => (await getAttendanceClient()).getHolidayList();

export const leaveRulesDetail = async (params: { id: string }): Promise<BaseAPIResult<LeaveRules>> =>
  (await getAttendanceClient()).leaveRulesDetail(params);

export const leaveRulesInsert = async (params: LeaveRules): Promise<BaseAPIResult<unknown>> =>
  (await getAttendanceClient()).leaveRulesInsert(params);

export const leaveRulesUpdate = async (params: LeaveRules & { id: string }): Promise<BaseAPIResult<unknown>> =>
  (await getAttendanceClient()).leaveRulesUpdate(params);

export const leaveRulesDelete = async (params: { id: string }): Promise<BaseAPIResult<unknown>> =>
  (await getAttendanceClient()).leaveRulesDelete(params);

export const leaveBalancePage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).leaveBalancePage(params);

export const leaveBalanceUpdate = async (params: unknown): Promise<BaseAPIResult<unknown>> =>
  (await getAttendanceClient()).leaveBalanceUpdate(params);

export const leaveBalanceDetailPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).leaveBalanceDetailPage(params);

export const leaveBalanceExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).leaveBalanceExport(params);

export const leaveBalanceCancel = async (params: unknown): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).leaveBalanceCancel(params);

export const getStaffLeaveBalance = async (params: {
  staffId: string;
  holidayRuleId: number | string;
  unit: "小时" | "天";
}): Promise<BaseAPIResult<{ total: number; notLimit: boolean }>> => (await getAttendanceClient()).getStaffLeaveBalance(params);

export const getStaffleaveLedger = async (params: unknown): Promise<BaseAPIResult<PageLeaveLedgerResult>> =>
  (await getAttendanceClient()).getStaffleaveLedger(params);

export const exportStaffLeave = async (params: unknown): Promise<BaseAPIResult> => (await getAttendanceClient()).exportStaffLeave(params);

export const getHolidayRuleNotLimit = async (params?: unknown): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).getHolidayRuleNotLimit(params);

export const holidayBalanceDownLoad = async (params: {
  holidayIdList: (string | number)[];
  initTemplate: boolean;
}): Promise<BaseAPIResult<Blob>> => (await getAttendanceClient()).holidayBalanceDownLoad(params);

export const holidayBalanceImport = async (params: { file: Blob | null; init: boolean; ruleNames: string }): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).holidayBalanceImport(params);
