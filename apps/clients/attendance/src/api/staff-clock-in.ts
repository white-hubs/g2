import type { ClockInRules, StaffClockInApi } from "@g2-contract/attendance/api/staff-clock-in";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

export function createStaffClockInApi(transport: AttendanceTransport): StaffClockInApi {
  const { Delete, Get, Post, Put, service } = transport;
  const getHolidayApi = async (year: number, month: number): Promise<BaseAPIResult<{ almanac: { month: string }[] }[]>> => {
    const params = {
      year,
      month,
    };
    return Get("/attendance/att/scheduling/rule/legal/holidays", { params });
  };

  const getDeviceList = async (params: unknown): Promise<BaseAPIResult> => Get("/device/device/instance/list-page", { params });

  const getEquipmentAccountList = async (params: unknown): Promise<BaseAPIResult> =>
    Get("/device-supervise/device-account/page", { params });

  const getDeviceGenre = async (): Promise<BaseAPIResult> => Get("/device/device/genre/search");

  const clockInRulesInsert = async (params: ClockInRules): Promise<BaseAPIResult> => Post("/attendance/att/clock/rule/add", params);

  const clockInRulesPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/att/clock/rule/page", { params });

  const clockInRulesDetail = async (params: { id: string }): Promise<BaseAPIResult<ClockInRules & { id: string }>> =>
    Get("/attendance/att/clock/rule/detail?id=" + params.id);

  const clockInRulesUpdate = async (params: ClockInRules & { id: string }): Promise<BaseAPIResult> =>
    Post("/attendance/att/clock/rule/edit", params);

  const clockInRulesDel = async (params: { id: string }): Promise<BaseAPIResult> =>
    Delete("/attendance/att/clock/rule/remove?id=" + params.id);

  const clockInLedgerPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/att/clockIn/ledgerPage", { params });

  const clockInLedgerExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
    service.get("/attendance/ledger/getClockInLedgerExcel", { params });

  const clockInRecordPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> => Get("/attendance/getClockInLog", { params });

  const clockInRecordExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
    service.get("/attendance/clockIn/getClockInLogExcel", { params });

  const clockInLogByDate = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/getClockInLogByDate", { params });

  const clockInRecordInsert = async (params: unknown): Promise<BaseAPIResult> => Post("/attendance/add/clockIn", params);

  const clockInRecordStatusUpdate = async (id: string): Promise<BaseAPIResult> => Put(`/attendance/update/clockIn/${id}`, {});
  return {
    getHolidayApi,
    getDeviceList,
    getEquipmentAccountList,
    getDeviceGenre,
    clockInRulesInsert,
    clockInRulesPage,
    clockInRulesDetail,
    clockInRulesUpdate,
    clockInRulesDel,
    clockInLedgerPage,
    clockInLedgerExport,
    clockInRecordPage,
    clockInRecordExport,
    clockInLogByDate,
    clockInRecordInsert,
    clockInRecordStatusUpdate,
  };
}
