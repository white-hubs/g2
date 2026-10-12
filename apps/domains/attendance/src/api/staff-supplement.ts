import type { SupplementRules } from "@g2-contract/attendance/api/staff-supplement";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/staff-supplement";

export const supplementRulesPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).supplementRulesPage(params);

export const supplementRulesList = async (params?: unknown): Promise<BaseAPIResult<{ id: string; name: string }[]>> =>
  (await getAttendanceClient()).supplementRulesList(params);

export const supplementRulesDetail = async (params: { id: string }): Promise<BaseAPIResult<SupplementRules>> =>
  (await getAttendanceClient()).supplementRulesDetail(params);

export const supplementRulesDelete = async (params: { id: string }): Promise<BaseAPIResult<SupplementRules>> =>
  (await getAttendanceClient()).supplementRulesDelete(params);

export const supplementRulesPost = async (params: unknown): Promise<BaseAPIResult<SupplementRules>> =>
  (await getAttendanceClient()).supplementRulesPost(params);

export const supplementLedgerList = async (params?: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).supplementLedgerList(params);

export const supplementLedgerExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).supplementLedgerExport(params);

export const supplementLedgerDetail = async (params?: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).supplementLedgerDetail(params);

export const supplementLedgerDetailExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).supplementLedgerDetailExport(params);
