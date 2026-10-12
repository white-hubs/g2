import { getDomainContext } from "../domain-context";
export const appFunctionCodes = {
  cardView: {
    homeCard: "attendance:cardView:homeCard",
  },
  attendanceGroup: {
    add: "attendance:group:add",
    update: "attendance:group:update",
    info: "attendance:group:info",
    delete: "attendance:group:delete",
  },
  attendanceClasses: {
    add: "attendance:classes:add",
    update: "attendance:classes:update",
    delete: "attendance:classes:delete",
  },
  attendanceSchedulingRules: {
    add: "attendance:schedulingRules:add",
    update: "attendance:schedulingRules:update",
    delete: "attendance:schedulingRules:delete",
  },
  attendanceStaffScheduling: {
    export: "attendance:staffScheduling:export",
    import: "attendance:staffScheduling:import",
    download: "attendance:staffScheduling:download",
  },
  attendanceStaffDuty: {
    export: "attendance:staffDuty:export",
    import: "attendance:staffDuty:import",
    download: "attendance:staffDuty:download",
  },
  attendanceClockInRules: {
    add: "attendance:clockInRules:add",
    update: "attendance:clockInRules:update",
    delete: "attendance:clockInRules:delete",
  },
  attendanceClockInRecord: {
    add: "attendance:clockInRecord:add",
    export: "attendance:clockInRecord:export",
    update: "attendance:clockInRecord:update",
    viewPic: "attendance:clockInRecord:viewPic",
  },
  attendanceclockInLedger: {
    export: "attendance:clockInLedger:export",
  },
  attendanceLeaveRules: {
    add: "attendance:leaveRules:add",
    update: "attendance:leaveRules:update",
    delete: "attendance:leaveRules:delete",
  },
  attendanceVacationBalance: {
    export: "attendance:vacationBalance:export",
    batchUpdate: "attendance:vacationBalance:batchUpdate",
    batchAdd: "attendance:vacationBalance:batchAdd",
  },
  attendanceLeaveApproval: {
    add: "attendance:leaveApproval:add",
    info: "attendance:leaveApproval:info",
  },
  attendanceDisposeLeaveApproval: {
    add: "attendance:disposeLeaveApproval:add",
    info: "attendance:disposeLeaveApproval:info",
  },
  attendanceSupplementRules: {
    add: "attendance:supplementRules:add",
    update: "attendance:supplementRules:update",
    delete: "attendance:supplementRules:delete",
  },
  attendanceSupplementApproval: {
    add: "attendance:supplementApproval:add",
    info: "attendance:supplementApproval:info",
  },
  attendanceOvertimeRules: {
    add: "attendance:overtimeRules:add",
    update: "attendance:overtimeRules:update",
    delete: "attendance:overtimeRules:delete",
  },
  attendanceOvertimeApproval: {
    add: "attendance:overtimeApproval:add",
    info: "attendance:overtimeApproval:info",
  },
  attendanceChangeApproval: {
    add: "attendance:changeApproval:add",
    info: "attendance:changeApproval:info",
  },
  attendanceOffDutyRules: {
    add: "attendance:offDutyRules:add",
    update: "attendance:offDutyRules:update",
    delete: "attendance:offDutyRules:delete",
  },
  attendanceOffDutyApproval: {
    add: "attendance:offDutyApproval:add",
    info: "attendance:offDutyApproval:info",
  },
  attendanceBusinessTripRules: {
    add: "attendance:businessTripRules:add",
    update: "attendance:businessTripRules:update",
    delete: "attendance:businessTripRules:delete",
  },
  attendanceBusinessTripApproval: {
    add: "attendance:businessTripApproval:add",
    info: "attendance:businessTripApproval:info",
  },
  attendanceAttendanceStatisticsDaily: {
    export: "attendance:attendanceStatisticsDaily:export",
  },
  attendanceAttendanceStatistics: {
    export: "attendance:attendanceStatistics:export",
  },
  attendanceAttendanceStatisticsPre: {
    export: "attendance:attendanceStatisticsPre:export",
  },
  attendanceHandleLogRecord: {
    export: "attendance:handleLogRecord:export",
  },
  flowSetting: {
    save: "attendance:flowSetting:save",
  },
  flowApprovalRecord: {
    info: "attendance:flowApprovalRecord:info",
  },
};
export function hasPermission(code: string | undefined): boolean {
  return Boolean(code && getDomainContext().getFunctionCodes().has(code));
}
