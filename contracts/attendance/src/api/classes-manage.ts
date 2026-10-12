import type { BaseAPIResult, PageResult } from "../common";
import type { ClassesType } from "../types/classes";

export interface Classes {
  /**
   * 班次类型
   */
  classesType: string | undefined;
  /**
   * 建议应用范围，部门id，逗号隔开，全部时为0
   */
  deptIds?: string | string[];
  /**
   * 下班结束打卡时间
   */
  endClockAfterTime: string;
  /**
   * 下班开始打卡时间
   */
  endClockBeforeTime: string;
  /**
   * 是否跨天班次
   */
  endTimeIsMorrow: boolean;
  /**
   * 下班时间
   */
  endWorkTime: string;
  /**
   * 班次名称
   */
  name: string;
  /**
   * 简称
   */
  nickName: string;
  /**
   * 休息结束时间
   */
  restEndTime: string;
  /**
   * 休息开始时间
   */
  restStartTime: string;
  /**
   * 上班结束打卡时间
   */
  startClockAfterTime: string;
  /**
   * 上班开始打卡时间
   */
  startClockBeforeTime: string;
  /**
   * 上班时间
   */
  startWorkTime: string;
}
export interface ClassesManageApi {
  classesInsert(params: Classes): Promise<BaseAPIResult>;
  classesPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  classesList(): Promise<BaseAPIResult<{ id: string; name: string; classesType: ClassesType }[]>>;
  classesPageWithDept(params: Record<string, unknown>): Promise<BaseAPIResult<PageResult>>;
  classesDetail(params: { id: string }): Promise<BaseAPIResult<Classes & { id: string }>>;
  classesUpdate(params: Classes & { id: string }): Promise<BaseAPIResult>;
  classesDel(params: { id: string }): Promise<BaseAPIResult>;
  classesDelCheck(params: { id: string }): Promise<BaseAPIResult>;
}
