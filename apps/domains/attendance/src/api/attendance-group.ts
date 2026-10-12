import type { AttendanceGroup } from "@g2-contract/attendance/api/attendance-group";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/attendance-group";

export const attendanceGroupInsert = async (params: AttendanceGroup): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).attendanceGroupInsert(params);

export const attendanceGroupPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).attendanceGroupPage(params);

export const attendanceGroupList = async (): Promise<BaseAPIResult<{ id: string; name: string }[]>> =>
  (await getAttendanceClient()).attendanceGroupList();

export const attendanceGroupDetail = async (
  params: { id: string },
  encryptionPhone = false,
): Promise<
  BaseAPIResult<
    AttendanceGroup & {
      id: string;
      overtimeRule: { id: string; name: string };
      leavePostRule: { id: string; name: string };
      awayBusinessRule: { id: string; name: string };
      cardRuleList: { id: string; name: string }[];
      holidayRuleList: { id: string; name: string }[];
      groupClassList: { id: string; name: string }[];
    }
  >
> => (await getAttendanceClient()).attendanceGroupDetail(params, encryptionPhone);

export const attendanceGroupUpdate = async (params: AttendanceGroup & { id: string }): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).attendanceGroupUpdate(params);

export const attendanceGroupPreChecked = async (params: AttendanceGroup & { id: string | undefined }): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).attendanceGroupPreChecked(params);

export const attendanceGroupDel = async (params: { id: string }): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).attendanceGroupDel(params);
