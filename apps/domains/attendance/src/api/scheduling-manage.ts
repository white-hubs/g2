import type { SchedulingRule } from "@g2-contract/attendance/api/scheduling-manage";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/scheduling-manage";

export const schedulingRuleInsert = async (params: SchedulingRule): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).schedulingRuleInsert(params);

export const schedulingRulePage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).schedulingRulePage(params);

export const schedulingRuleDetail = async (params: { id: string }): Promise<BaseAPIResult<SchedulingRule & { id: string }>> =>
  (await getAttendanceClient()).schedulingRuleDetail(params);

export const schedulingRuleUpdate = async (params: SchedulingRule & { id: string }): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).schedulingRuleUpdate(params);

export const schedulingRuleDel = async (params: { id: string }): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).schedulingRuleDel(params);

export const staffSchedulingPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).staffSchedulingPage(params);

export const staffSchedulingRulehand = async (params: unknown): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).staffSchedulingRulehand(params);

export const staffSchedulingExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).staffSchedulingExport(params);

export const staffSchedulingDownLoad = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).staffSchedulingDownLoad(params);

export const staffSchedulingImport = async (params: FormData): Promise<unknown> =>
  (await getAttendanceClient()).staffSchedulingImport(params);

export const staffDutyPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).staffDutyPage(params);

export const staffDutyInsert = async (params: unknown): Promise<BaseAPIResult> => (await getAttendanceClient()).staffDutyInsert(params);

export const getDutyStaffListByMonth = async (params: unknown): Promise<BaseAPIResult<{ id: string; name: string }[]>> =>
  (await getAttendanceClient()).getDutyStaffListByMonth(params);

export const staffDutyhand = async (params: unknown): Promise<BaseAPIResult> => (await getAttendanceClient()).staffDutyhand(params);

export const staffDutyRemove = async (params: unknown): Promise<BaseAPIResult> => (await getAttendanceClient()).staffDutyRemove(params);

export const staffDutyExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).staffDutyExport(params);

export const staffDutyDownLoad = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).staffDutyDownLoad(params);

export const staffDutyImport = async (params: FormData): Promise<unknown> => (await getAttendanceClient()).staffDutyImport(params);
