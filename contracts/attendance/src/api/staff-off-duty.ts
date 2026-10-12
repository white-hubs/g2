import type { BaseAPIResult, PageResult } from "../common";

export interface OffDutyRules {
  /**
   * 提前申请
   */
  beforeApply: boolean;
  /**
   * 时长计算方式，工作日：WORKING_DAY，自然日：CALENDAR_DAY
   */
  calculationWay: string;

  /**
   * 最小请假时间
   */
  minAskUnit: number;
  /**
   * 规则名称
   */
  name: string;
}
export interface StaffOffDutyApi {
  offDutyRulesPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  offDutyRulesDetail(params: { id: string }): Promise<BaseAPIResult<OffDutyRules>>;
  offDutyRulesInsert(params: OffDutyRules): Promise<BaseAPIResult<unknown>>;
  offDutyRulesUpdate(params: OffDutyRules & { id: string }): Promise<BaseAPIResult<unknown>>;
  offDutyRulesDelete(params: { id: string }): Promise<BaseAPIResult<unknown>>;
  offDutyLedgerPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  offDutyLedgerExport(params: unknown): Promise<BaseAPIResult<Blob>>;
}
