import type { BaseAPIResult, PageLeaveLedgerResult, PageResult } from "../common";

export interface LeaveRules {
  /**
   * 请假时间计算方式，（工作日/自然日
   */
  calculationWay: string | undefined;
  /**
   * 一天折算小时
   */
  dayOfHour: number | null;
  /**
   * 发放时间，（入职日发放，每年1月1发放
   */
  grantDate: string;
  /**
   * 发放方式，（每年发放
   */
  grantWay: string | undefined;
  /**
   * 最小申请单位
   */
  minAskUnit: number | null;
  /**
   * 名称
   */
  name: string;
  /**
   * 是否限额，(true表示不限额
   */
  notLimit: boolean;
  /**
   * 额度配置，(json
   */
  quota: string | Quota;
  /**
   * 有效期，（json
   */
  validity: string | Validity;
  intoAbsence: boolean;
  holidayType: string | undefined;
}

export interface Quota {
  /**
   * 额度类型（固定额度/按社会工龄/按公司工龄AttHolidayQuotaTypeEnum
   */
  quotaType: "FIXED" | "SOCIETY_AGE" | "COMPANY_AGE";
  /**
   * 固定额度数量
   */
  fixedNumber: number | null | undefined;
  /**
   * 固定额度单位
   */
  fixedUnit: "DAY" | "HOUR";
  /**
   * 额度层级
   */
  quotaLevelList: {
    ageYear: number | null | undefined;
    holidayNumber: number | null | undefined;
    unit: "DAY" | "HOUR";
  }[];
}

export interface Validity {
  // 长期有效
  longTerm: boolean;
  /**
   * 发放日起 多少自然年有效
   */
  natureYear: number | null | undefined;
  /**
   * 发放日起 多少个单位时间有效
   */
  validityNumber: number | null | undefined;
  /**
   * 有效期单位
   */
  validityUnit: string;
}
export interface StaffLeaveApi {
  leaveRulesPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  leaveRulesList(): Promise<BaseAPIResult>;
  getHolidayList(): Promise<BaseAPIResult>;
  leaveRulesDetail(params: { id: string }): Promise<BaseAPIResult<LeaveRules>>;
  leaveRulesInsert(params: LeaveRules): Promise<BaseAPIResult<unknown>>;
  leaveRulesUpdate(params: LeaveRules & { id: string }): Promise<BaseAPIResult<unknown>>;
  leaveRulesDelete(params: { id: string }): Promise<BaseAPIResult<unknown>>;
  leaveBalancePage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  leaveBalanceUpdate(params: unknown): Promise<BaseAPIResult<unknown>>;
  leaveBalanceDetailPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  leaveBalanceExport(params: unknown): Promise<BaseAPIResult<Blob>>;
  leaveBalanceCancel(params: unknown): Promise<BaseAPIResult>;
  getStaffLeaveBalance(params: {
    staffId: string;
    holidayRuleId: number | string;
    unit: "小时" | "天";
  }): Promise<BaseAPIResult<{ total: number; notLimit: boolean }>>;
  getStaffleaveLedger(params: unknown): Promise<BaseAPIResult<PageLeaveLedgerResult>>;
  exportStaffLeave(params: unknown): Promise<BaseAPIResult>;
  getHolidayRuleNotLimit(params?: unknown): Promise<BaseAPIResult>;
  holidayBalanceDownLoad(params: { holidayIdList: (string | number)[]; initTemplate: boolean }): Promise<BaseAPIResult<Blob>>;
  holidayBalanceImport(params: { file: Blob | null; init: boolean; ruleNames: string }): Promise<BaseAPIResult>;
}
