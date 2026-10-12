import type { HttpClient } from "./client";
export interface AttendanceHrPage<T = Record<string, unknown>> {
    records: T[];
    total: number;
}
export interface AttendanceHrClient {
    listHolidayRules(): Promise<unknown[]>;
    getHolidayDetailType(type: string): Promise<unknown>;
    getVacationBalance(params: {
        staffId: string;
        holidayRuleId: string;
        unit: string;
    }): Promise<unknown>;
    calculateVacationDuration(params: Record<string, unknown>): Promise<unknown>;
    pageCancellationLeaveForms(params: Record<string, unknown>): Promise<AttendanceHrPage>;
    listClockInLogs(params: {
        userId: string;
        clockInDate: string;
        abnormal: boolean;
    }): Promise<unknown[]>;
    listExchangeClasses(params: {
        staffId: string;
        workType: string;
        day: string;
    }): Promise<unknown[]>;
    getOvertimeDuration(params: {
        workOvertimeType: string;
        period: string;
    }): Promise<unknown>;
    listOvertimeCompensations(params: {
        workOvertimeType: string;
        processInstanceId?: string;
    }): Promise<unknown[]>;
    getLeavePostDuration(params: Record<string, unknown>): Promise<unknown>;
    getAwayBusinessDuration(params: Record<string, unknown>): Promise<unknown>;
    getAttendanceStatistic(params: {
        type: string;
        userId: string;
        period: string;
    }): Promise<unknown>;
    listPositions(): Promise<unknown[]>;
    pageAppointments(): Promise<AttendanceHrPage>;
    listPersonnelCategories(): Promise<unknown[]>;
    listRoles(): Promise<unknown[]>;
    listDoorTypes(): Promise<unknown[]>;
    pageDoorDevices(params: Record<string, unknown>): Promise<AttendanceHrPage>;
    pageParkingLots(params: Record<string, unknown>): Promise<AttendanceHrPage>;
    listPermissionAreas(): Promise<unknown[]>;
}
export declare function createAttendanceHrClient(http: Pick<HttpClient, "get">): AttendanceHrClient;
//# sourceMappingURL=attendance-hr-client.d.ts.map