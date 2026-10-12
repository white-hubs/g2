import type { AttendanceGroupApi } from "./api/attendance-group";
import type { AttendanceLedgerApi } from "./api/attendance-ledger";
import type { AttendancePreApi } from "./api/attendance-pre";
import type { AttendanceRecordApi } from "./api/attendance-record";
import type { ClassesManageApi } from "./api/classes-manage";
import type { DictionaryApi } from "./api/dictionary";
import type { FlowApi } from "./api/flow";
import type { HandleRecordApi } from "./api/handle-record";
import type { MessageApi } from "./api/message";
import type { OuaaApi } from "./api/ouaa";
import type { SchedulingManageApi } from "./api/scheduling-manage";
import type { AttendanceSelectionApi } from "./api/selection";
import type { StaffBusinessTripApi } from "./api/staff-business-trip";
import type { StaffClockInApi } from "./api/staff-clock-in";
import type { StaffLeaveApi } from "./api/staff-leave";
import type { StaffOffDutyApi } from "./api/staff-off-duty";
import type { StaffOvertimeApi } from "./api/staff-overtime";
import type { StaffSupplementApi } from "./api/staff-supplement";

export type AttendanceClient = StaffBusinessTripApi &
  DictionaryApi &
  AttendancePreApi &
  AttendanceGroupApi &
  StaffLeaveApi &
  ClassesManageApi &
  AttendanceLedgerApi &
  StaffOffDutyApi &
  StaffOvertimeApi &
  FlowApi &
  HandleRecordApi &
  MessageApi &
  OuaaApi &
  AttendanceRecordApi &
  StaffClockInApi &
  StaffSupplementApi &
  SchedulingManageApi &
  AttendanceReferenceApi &
  AttendanceSelectionApi;
export interface AttendanceReferenceApi {
  sceneNotificationMethod(sceneCode: string): Promise<{ value: string; label: string }[]>;
}
export type { BaseAPIResult, PageLeaveLedgerResult, PageResult } from "./common";
