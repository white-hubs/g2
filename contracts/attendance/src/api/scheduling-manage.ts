import type { BaseAPIResult, PageResult } from "../common";

export interface SameShift {
  sameShiftNumber: number | null;
  sameShiftType: string[] | null;
}

export interface SchedulingRule {
  continuousDays: string | undefined;
  sameShift: SameShift[] | string;
  intervalHour: string | undefined;
  /**
   * 节假日休息
   */
  legalHolidaysRest: boolean;
  /**
   * 规则名称
   */
  name: string;
  rulesClassesList: RulesClassesList[];
  ways: string;
}

export interface RulesClassesList {
  /**
   * 班次id
   */
  id: string;
  name: string;
  /**
   * 星期
   */
  week: string;
}

export interface Limit {
  continuousDays: number | null;
  intervalHour: number | null;
  // sameShiftNumber: number | null;
  // sameShiftType: string[] | null;
  sameShift: {
    sameShiftNumber: number | null;
    sameShiftType: string[] | null;
  }[];
}
export interface SchedulingManageApi {
  schedulingRuleInsert(params: SchedulingRule): Promise<BaseAPIResult>;
  schedulingRulePage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  schedulingRuleDetail(params: { id: string }): Promise<BaseAPIResult<SchedulingRule & { id: string }>>;
  schedulingRuleUpdate(params: SchedulingRule & { id: string }): Promise<BaseAPIResult>;
  schedulingRuleDel(params: { id: string }): Promise<BaseAPIResult>;
  staffSchedulingPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  staffSchedulingRulehand(params: unknown): Promise<BaseAPIResult>;
  staffSchedulingExport(params: unknown): Promise<BaseAPIResult<Blob>>;
  staffSchedulingDownLoad(params: unknown): Promise<BaseAPIResult<Blob>>;
  staffSchedulingImport(params: FormData): Promise<unknown>;
  staffDutyPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  staffDutyInsert(params: unknown): Promise<BaseAPIResult>;
  getDutyStaffListByMonth(params: unknown): Promise<BaseAPIResult<{ id: string; name: string }[]>>;
  staffDutyhand(params: unknown): Promise<BaseAPIResult>;
  staffDutyRemove(params: unknown): Promise<BaseAPIResult>;
  staffDutyExport(params: unknown): Promise<BaseAPIResult<Blob>>;
  staffDutyDownLoad(params: unknown): Promise<BaseAPIResult<Blob>>;
  staffDutyImport(params: FormData): Promise<unknown>;
}
