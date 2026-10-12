import type { StaffSupplementApi, SupplementRules } from "@g2-contract/attendance/api/staff-supplement";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

export function createStaffSupplementApi(transport: AttendanceTransport): StaffSupplementApi {
  const { Delete, Get, Post, service } = transport;
  const supplementRulesPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> => Get("/attendance/card-rule/page", { params });

  const supplementRulesList = async (params?: unknown): Promise<BaseAPIResult<{ id: string; name: string }[]>> =>
    Get("/attendance/card-rule/list", { params });

  const supplementRulesDetail = async (params: { id: string }): Promise<BaseAPIResult<SupplementRules>> =>
    Get("/attendance/card-rule/" + params.id);

  const supplementRulesDelete = async (params: { id: string }): Promise<BaseAPIResult<SupplementRules>> =>
    Delete("/attendance/card-rule/" + params.id);

  const supplementRulesPost = async (params: unknown): Promise<BaseAPIResult<SupplementRules>> => Post("/attendance/card-rule", params);

  const supplementLedgerList = async (params?: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/getWorkOmitByPage", { params });

  const supplementLedgerExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
    service.get("/attendance/getWorkOmitByPage/excel", { params });

  const supplementLedgerDetail = async (params?: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/getWorkOmitDetails/page", { params });

  const supplementLedgerDetailExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
    service.get("/attendance/getWorkOmitDetails/excel", { params });
  return {
    supplementRulesPage,
    supplementRulesList,
    supplementRulesDetail,
    supplementRulesDelete,
    supplementRulesPost,
    supplementLedgerList,
    supplementLedgerExport,
    supplementLedgerDetail,
    supplementLedgerDetailExport,
  };
}
