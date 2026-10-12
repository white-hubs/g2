import type { AttendanceGroup, AttendanceGroupApi } from "@g2-contract/attendance/api/attendance-group";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

export function createAttendanceGroupApi(transport: AttendanceTransport): AttendanceGroupApi {
  const { Delete, Get, Post } = transport;
  const attendanceGroupInsert = async (params: AttendanceGroup): Promise<BaseAPIResult> => Post("/attendance/att/group/add", params);

  const attendanceGroupPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> => Get("/attendance/att/group/page", { params });

  const attendanceGroupList = async (): Promise<BaseAPIResult<{ id: string; name: string }[]>> => Get("/attendance/att/group/list");

  const attendanceGroupDetail = async (
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
  > =>
    Get("/attendance/att/group/detail?id=" + params.id, {
      headers: {
        encryption: encryptionPhone ? "true" : "false",
      },
    });

  const attendanceGroupUpdate = async (params: AttendanceGroup & { id: string }): Promise<BaseAPIResult> =>
    Post("/attendance/att/group/edit", params);

  const attendanceGroupPreChecked = async (params: AttendanceGroup & { id: string | undefined }): Promise<BaseAPIResult> =>
    Post("/attendance/att/group/check/staff", params);

  const attendanceGroupDel = async (params: { id: string }): Promise<BaseAPIResult> =>
    Delete("/attendance/att/group/remove?id=" + params.id);
  return {
    attendanceGroupInsert,
    attendanceGroupPage,
    attendanceGroupList,
    attendanceGroupDetail,
    attendanceGroupUpdate,
    attendanceGroupPreChecked,
    attendanceGroupDel,
  };
}
