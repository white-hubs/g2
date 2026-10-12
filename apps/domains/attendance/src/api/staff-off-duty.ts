import type { OffDutyRules } from "@g2-contract/attendance/api/staff-off-duty";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/staff-off-duty";

export const offDutyRulesPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).offDutyRulesPage(params);

export const offDutyRulesDetail = async (params: { id: string }): Promise<BaseAPIResult<OffDutyRules>> =>
  (await getAttendanceClient()).offDutyRulesDetail(params);

export const offDutyRulesInsert = async (params: OffDutyRules): Promise<BaseAPIResult<unknown>> =>
  (await getAttendanceClient()).offDutyRulesInsert(params);

export const offDutyRulesUpdate = async (params: OffDutyRules & { id: string }): Promise<BaseAPIResult<unknown>> =>
  (await getAttendanceClient()).offDutyRulesUpdate(params);

export const offDutyRulesDelete = async (params: { id: string }): Promise<BaseAPIResult<unknown>> =>
  (await getAttendanceClient()).offDutyRulesDelete(params);

export const offDutyLedgerPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).offDutyLedgerPage(params);

export const offDutyLedgerExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).offDutyLedgerExport(params);
