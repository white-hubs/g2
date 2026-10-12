import type { ClockInRules } from "@g2-contract/attendance/api/staff-clock-in";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/staff-clock-in";

export const getHolidayApi = async (year: number, month: number): Promise<BaseAPIResult<{ almanac: { month: string }[] }[]>> =>
  (await getAttendanceClient()).getHolidayApi(year, month);

export const getDeviceList = async (params: unknown): Promise<BaseAPIResult> => (await getAttendanceClient()).getDeviceList(params);

export const getEquipmentAccountList = async (params: unknown): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).getEquipmentAccountList(params);

export const getDeviceGenre = async (): Promise<BaseAPIResult> => (await getAttendanceClient()).getDeviceGenre();

export const clockInRulesInsert = async (params: ClockInRules): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).clockInRulesInsert(params);

export const clockInRulesPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).clockInRulesPage(params);

export const clockInRulesDetail = async (params: { id: string }): Promise<BaseAPIResult<ClockInRules & { id: string }>> =>
  (await getAttendanceClient()).clockInRulesDetail(params);

export const clockInRulesUpdate = async (params: ClockInRules & { id: string }): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).clockInRulesUpdate(params);

export const clockInRulesDel = async (params: { id: string }): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).clockInRulesDel(params);

export const clockInLedgerPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).clockInLedgerPage(params);

export const clockInLedgerExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).clockInLedgerExport(params);

export const clockInRecordPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).clockInRecordPage(params);

export const clockInRecordExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).clockInRecordExport(params);

export const clockInLogByDate = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).clockInLogByDate(params);

export const clockInRecordInsert = async (params: unknown): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).clockInRecordInsert(params);

export const clockInRecordStatusUpdate = async (id: string): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).clockInRecordStatusUpdate(id);
