import type { BusinessTripRules, StaffBusinessTripApi } from "@g2-contract/attendance/api/staff-business-trip";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

export function createStaffBusinessTripApi(transport: AttendanceTransport): StaffBusinessTripApi {
  const { Delete, Get, Post } = transport;
  const businessTripRulesPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/att/awayBusiness/rule/page", { params });

  const businessTripRulesDetail = async (params: { id: string }): Promise<BaseAPIResult<BusinessTripRules & { id: string }>> =>
    Get("/attendance/att/awayBusiness/rule/detail?id=" + params.id);

  const businessTripRulesDelete = async (params: { id: string }): Promise<BaseAPIResult> =>
    Delete("/attendance/att/awayBusiness/rule/remove?id=" + params.id);

  const businessTripRulesInsert = async (params: unknown): Promise<BaseAPIResult<BusinessTripRules>> =>
    Post("/attendance/att/awayBusiness/rule/add", params);

  const businessTripRulesUpdate = async (params: unknown): Promise<BaseAPIResult<BusinessTripRules>> =>
    Post("/attendance/att/awayBusiness/rule/edit", params);
  return { businessTripRulesPage, businessTripRulesDetail, businessTripRulesDelete, businessTripRulesInsert, businessTripRulesUpdate };
}
