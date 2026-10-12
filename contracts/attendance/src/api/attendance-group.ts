import type { BaseAPIResult, PageResult } from "../common";

export interface AttendanceGroup {
  /**
   * 考勤组规则id 打卡规则id
   */
  clockRuleId: number | undefined;
  /**
   * 适用人员集合
   */
  groupStaffList?: GroupStaffList[];
  /**
   * 名称
   */
  name: string;
  /**
   * 适用范围，PART,ALL
   */
  ranges: string | undefined;
  /**
   * 排班规则id
   */
  schedulingRuleId: number | undefined;
  cardRuleIds: string | undefined;
  groupClassIds: string | undefined;
  overtimeRuleId: string | undefined;
  holidayRuleIds: string | undefined;
  leavePostRuleId: string | undefined;
  awayBusinessRuleId: string | undefined;
}

export interface GroupStaffList {
  deptId: string;
  deptName: string;
  id: string;
  mobile: string;
  name: string;
  organizations: string;
}

export interface StaffList {
  organizations: { id: string; name: string }[];
  id: string;
  name: string;
  mobile: string;
}
export interface AttendanceGroupApi {
  attendanceGroupInsert(params: AttendanceGroup): Promise<BaseAPIResult>;
  attendanceGroupPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  attendanceGroupList(): Promise<BaseAPIResult<{ id: string; name: string }[]>>;
  attendanceGroupDetail(
    params: { id: string },
    encryptionPhone?: boolean,
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
  >;
  attendanceGroupUpdate(params: AttendanceGroup & { id: string }): Promise<BaseAPIResult>;
  attendanceGroupPreChecked(params: AttendanceGroup & { id: string | undefined }): Promise<BaseAPIResult>;
  attendanceGroupDel(params: { id: string }): Promise<BaseAPIResult>;
}
