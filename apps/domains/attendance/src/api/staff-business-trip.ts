import type { BusinessTripRules } from "@g2-contract/attendance/api/staff-business-trip";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/staff-business-trip";

export const businessTripRulesPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).businessTripRulesPage(params);

export const businessTripRulesDetail = async (params: { id: string }): Promise<BaseAPIResult<BusinessTripRules & { id: string }>> =>
  (await getAttendanceClient()).businessTripRulesDetail(params);

export const businessTripRulesDelete = async (params: { id: string }): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).businessTripRulesDelete(params);

export const businessTripRulesInsert = async (params: unknown): Promise<BaseAPIResult<BusinessTripRules>> =>
  (await getAttendanceClient()).businessTripRulesInsert(params);

export const businessTripRulesUpdate = async (params: unknown): Promise<BaseAPIResult<BusinessTripRules>> =>
  (await getAttendanceClient()).businessTripRulesUpdate(params);
