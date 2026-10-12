import type { BaseAPIResult, PageResult } from "../common";

/** 出差规则 */
export interface BusinessTripRules {
  /**
   * 提前申请
   */
  beforeApply: boolean;
  /**
   * 时长计算方式，工作日：WORKING_DAY，自然日：CALENDAR_DAY
   */
  calculationWay: "WORKING_DAY" | "CALENDAR_DAY";
  /**
   * 最小请假时间
   */
  minAskUnit: number;
  /**
   * 规则名称
   */
  name: string;
}
export interface StaffBusinessTripApi {
  businessTripRulesPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  businessTripRulesDetail(params: { id: string }): Promise<BaseAPIResult<BusinessTripRules & { id: string }>>;
  businessTripRulesDelete(params: { id: string }): Promise<BaseAPIResult>;
  businessTripRulesInsert(params: unknown): Promise<BaseAPIResult<BusinessTripRules>>;
  businessTripRulesUpdate(params: unknown): Promise<BaseAPIResult<BusinessTripRules>>;
}
