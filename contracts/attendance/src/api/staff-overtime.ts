import type { BaseAPIResult, PageResult } from "../common";

export interface OvertimeRule {
  id?: string;
  /**
   * 名称
   */
  name: string;
  /**
   * 细则
   */
  ruleDetails: OverTimeRuleDetails[];
  /**
   * 加班上限周期(每天、每周、每月)
   */
  upperLimitCycle: string | undefined;
  /**
   * 加班上限累计时长(小时)
   */
  upperLimitDuration: number | null | undefined;
}

/**
 * 细则
 */
export interface OverTimeRuleDetails {
  /**
   * 下班后多少分钟开始计算
   */
  afterTime: number | null;
  /**
   * 加班补偿方案
   */
  compensate: string;
  /**
   * 系统自动计算：SYSTEM；人工判定：ARTIFICIAL
   */
  compensationMethod: string;
  /**
   * 加班审批条件：UNLIMITED（无限制）ADVANCE（加班前发起）
   */
  workCondition: string;
  /**
   * 计算方式
   */
  method: string;
  /**
   * 计算调休比例
   */
  proportion: number;
  /**
   * 加班类型(工作日：WORK、休息日：REST、节假日：FESTIVAL：)
   */
  type: string;
  /**
   * 计算单位(半小时、小时)
   */
  units: string;
}
export interface StaffOvertimeApi {
  overtimeRulesPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  overtimeRulesList(params?: unknown): Promise<BaseAPIResult<{ id: string; name: string }[]>>;
  overtimeLedgerPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  overtimeDetailPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  overtimeLedgerExport(params: unknown): Promise<BaseAPIResult<Blob>>;
  overtimeDetailExport(params: unknown): Promise<BaseAPIResult<Blob>>;
  overtimeRulesDelete(params: { id: string }): Promise<BaseAPIResult>;
  overtimeRulesPost(params: OvertimeRule): Promise<BaseAPIResult<unknown>>;
  overtimeRulesDetail(params: { id: string }): Promise<BaseAPIResult<OvertimeRule>>;
}
