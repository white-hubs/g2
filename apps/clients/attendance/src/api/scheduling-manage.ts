import type { SchedulingManageApi, SchedulingRule } from "@g2-contract/attendance/api/scheduling-manage";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

export function createSchedulingManageApi(transport: AttendanceTransport): SchedulingManageApi {
  const { Delete, Get, Post, service } = transport;
  const schedulingRuleInsert = async (params: SchedulingRule): Promise<BaseAPIResult> =>
    Post("/attendance/att/scheduling/rule/add", params);

  const schedulingRulePage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/att/scheduling/rule/page", { params });

  const schedulingRuleDetail = async (params: { id: string }): Promise<BaseAPIResult<SchedulingRule & { id: string }>> =>
    Get("/attendance/att/scheduling/rule/detail?id=" + params.id);

  const schedulingRuleUpdate = async (params: SchedulingRule & { id: string }): Promise<BaseAPIResult> =>
    Post("/attendance/att/scheduling/rule/edit", params);

  const schedulingRuleDel = async (params: { id: string }): Promise<BaseAPIResult> =>
    Delete("/attendance/att/scheduling/rule/remove?id=" + params.id);

  const staffSchedulingPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/att/scheduling/hand/page", { params });

  const staffSchedulingRulehand = async (params: unknown): Promise<BaseAPIResult> => Post("/attendance/att/scheduling/hand/action", params);

  const staffSchedulingExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
    service.post("/attendance/att/scheduling/export", params);

  const staffSchedulingDownLoad = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
    service.post("/attendance/att/scheduling/template/download", params);

  const staffSchedulingImport = async (params: FormData): Promise<unknown> =>
    Post("/attendance/att/scheduling/template/import", params, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

  const staffDutyPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> => Get("/attendance/att/duty/page", { params });

  const staffDutyInsert = async (params: unknown): Promise<BaseAPIResult> => Post("/attendance/att/duty/add/staff", params);

  const getDutyStaffListByMonth = async (params: unknown): Promise<BaseAPIResult<{ id: string; name: string }[]>> =>
    Get("/attendance/att/duty/all/staff", { params });

  const staffDutyhand = async (params: unknown): Promise<BaseAPIResult> => Post("/attendance/att/duty/hand", params);

  const staffDutyRemove = async (params: unknown): Promise<BaseAPIResult> => Post("/attendance/att/duty/remove/staff", params);

  const staffDutyExport = async (params: unknown): Promise<BaseAPIResult<Blob>> => service.post("/attendance/att/duty/export", params);

  const staffDutyDownLoad = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
    service.post("/attendance/att/duty/template/download", params);

  const staffDutyImport = async (params: FormData): Promise<unknown> =>
    Post("/attendance/att/duty/template/import", params, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  return {
    schedulingRuleInsert,
    schedulingRulePage,
    schedulingRuleDetail,
    schedulingRuleUpdate,
    schedulingRuleDel,
    staffSchedulingPage,
    staffSchedulingRulehand,
    staffSchedulingExport,
    staffSchedulingDownLoad,
    staffSchedulingImport,
    staffDutyPage,
    staffDutyInsert,
    getDutyStaffListByMonth,
    staffDutyhand,
    staffDutyRemove,
    staffDutyExport,
    staffDutyDownLoad,
    staffDutyImport,
  };
}
