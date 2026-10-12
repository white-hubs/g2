import type { HttpClient } from "./client";

export interface AttendanceHrPage<T = Record<string, unknown>> {
  records: T[];
  total: number;
}

export interface AttendanceHrClient {
  listHolidayRules(): Promise<unknown[]>;
  getHolidayDetailType(type: string): Promise<unknown>;
  getVacationBalance(params: { staffId: string; holidayRuleId: string; unit: string }): Promise<unknown>;
  calculateVacationDuration(params: Record<string, unknown>): Promise<unknown>;
  pageCancellationLeaveForms(params: Record<string, unknown>): Promise<AttendanceHrPage>;
  listClockInLogs(params: { userId: string; clockInDate: string; abnormal: boolean }): Promise<unknown[]>;
  listExchangeClasses(params: { staffId: string; workType: string; day: string }): Promise<unknown[]>;
  getOvertimeDuration(params: { workOvertimeType: string; period: string }): Promise<unknown>;
  listOvertimeCompensations(params: { workOvertimeType: string; processInstanceId?: string }): Promise<unknown[]>;
  getLeavePostDuration(params: Record<string, unknown>): Promise<unknown>;
  getAwayBusinessDuration(params: Record<string, unknown>): Promise<unknown>;
  getAttendanceStatistic(params: { type: string; userId: string; period: string }): Promise<unknown>;
  listPositions(): Promise<unknown[]>;
  pageAppointments(): Promise<AttendanceHrPage>;
  listPersonnelCategories(): Promise<unknown[]>;
  listRoles(): Promise<unknown[]>;
  listDoorTypes(): Promise<unknown[]>;
  pageDoorDevices(params: Record<string, unknown>): Promise<AttendanceHrPage>;
  pageParkingLots(params: Record<string, unknown>): Promise<AttendanceHrPage>;
  listPermissionAreas(): Promise<unknown[]>;
}

function query(path: string, params?: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  return search.size ? `${path}?${search}` : path;
}

function unwrap(value: unknown): unknown {
  for (let depth = 0; depth < 4 && value && typeof value === "object"; depth++) {
    const result = value as Record<string, unknown>;
    if (result.success === false || (result.code != null && !["0", "200"].includes(String(result.code)))) {
      throw new Error(String(result.message ?? result.msg ?? "请求失败"));
    }
    if (!("data" in result)) break;
    value = result.data;
  }
  return value;
}

function list(value: unknown): unknown[] {
  const result = unwrap(value);
  if (Array.isArray(result)) return result;
  const record = result && typeof result === "object" ? (result as Record<string, unknown>) : {};
  return Array.isArray(record.records) ? record.records : Array.isArray(record.list) ? record.list : [];
}

function page(value: unknown): AttendanceHrPage {
  const result = unwrap(value);
  const record = result && typeof result === "object" ? (result as Record<string, unknown>) : {};
  const records = Array.isArray(record.records)
    ? record.records
    : Array.isArray(record.list)
      ? record.list
      : Array.isArray(result)
        ? result
        : [];
  return { records, total: Number(record.total ?? records.length) };
}

export function createAttendanceHrClient(http: Pick<HttpClient, "get">): AttendanceHrClient {
  const get = (path: string, params?: Record<string, unknown>) => http.get(query(path, params));
  return {
    listHolidayRules: async () => list(await get("/api/attendance/att/holiday/rule/list")),
    getHolidayDetailType: async (type) => unwrap(await get(`/api/attendance/detail/type/${encodeURIComponent(type)}`)),
    getVacationBalance: async (params) => unwrap(await get("/api/attendance/att/Holiday/balance/total", params)),
    calculateVacationDuration: async (params) => unwrap(await get("/api/attendance/att/askLeave/calcDuration", params)),
    pageCancellationLeaveForms: async (params) => page(await get("/api/attendance/att/askLeaveFrom/cancelAskFrom/page", params)),
    listClockInLogs: async (params) => list(await get("/api/attendance/getClockInLogByDate", params)),
    listExchangeClasses: async (params) => list(await get("/api/attendance/att/exchange/classes", params)),
    getOvertimeDuration: async (params) => unwrap(await get("/api/attendance/work/overtime/duration", params)),
    listOvertimeCompensations: async (params) => list(await get("/api/attendance/work/overtime/compensation", params)),
    getLeavePostDuration: async (params) => unwrap(await get("/api/attendance/att/leavePost/duration", params)),
    getAwayBusinessDuration: async (params) => unwrap(await get("/api/attendance/att/awayBusiness/duration", params)),
    getAttendanceStatistic: async (params) => unwrap(await get("/api/attendance/personnel/getClockInDetailsByUserId", params)),
    listPositions: async () => list(await get("/api/ouaa/authenticated/position/list", { enabled: true })),
    pageAppointments: async () => page(await get("/api/ouaa/appointment/page", { enable: true, pageNumber: 1, pageSize: 1000 })),
    listPersonnelCategories: async () => list(await get("/api/personnel/staff-type/list")),
    listRoles: async () => list(await get("/api/ouaa/authenticated/role/list-by-product", { enabled: true })),
    listDoorTypes: async () => list(await get("/api/door/getDoorType")),
    pageDoorDevices: async (params) => page(await get("/api/door/getDoorDevicePage", { ...params, applicationCode: "DOORMANAGE" })),
    pageParkingLots: async (params) => page(await get("/api/park-management/parking-infos-page", params)),
    listPermissionAreas: async () => list(await get("/api/mdata/area/list")),
  };
}
