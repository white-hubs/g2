import type { OvertimeRule } from "@g2-contract/attendance/api/staff-overtime";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/staff-overtime";

export const overtimeRulesPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).overtimeRulesPage(params);

export const overtimeRulesList = async (params?: unknown): Promise<BaseAPIResult<{ id: string; name: string }[]>> =>
  (await getAttendanceClient()).overtimeRulesList(params);

export const overtimeLedgerPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).overtimeLedgerPage(params);

export const overtimeDetailPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).overtimeDetailPage(params);

export const overtimeLedgerExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).overtimeLedgerExport(params);

export const overtimeDetailExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).overtimeDetailExport(params);

export const overtimeRulesDelete = async (params: { id: string }): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).overtimeRulesDelete(params);

export const overtimeRulesPost = async (params: OvertimeRule): Promise<BaseAPIResult<unknown>> =>
  (await getAttendanceClient()).overtimeRulesPost(params);

export const overtimeRulesDetail = async (params: { id: string }): Promise<BaseAPIResult<OvertimeRule>> =>
  (await getAttendanceClient()).overtimeRulesDetail(params);
