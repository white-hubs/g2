import type { BaseAPIResult, PageResult } from "../common";

/** 补卡规则 */
export interface SupplementRules {
  content: string[];
  days: number;
  id: string;
  name: string;
  times: number;
  types: string[];
  typeName: string;
  updateTime: number;
}
export interface StaffSupplementApi {
  supplementRulesPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  supplementRulesList(params?: unknown): Promise<BaseAPIResult<{ id: string; name: string }[]>>;
  supplementRulesDetail(params: { id: string }): Promise<BaseAPIResult<SupplementRules>>;
  supplementRulesDelete(params: { id: string }): Promise<BaseAPIResult<SupplementRules>>;
  supplementRulesPost(params: unknown): Promise<BaseAPIResult<SupplementRules>>;
  supplementLedgerList(params?: unknown): Promise<BaseAPIResult<PageResult>>;
  supplementLedgerExport(params: unknown): Promise<BaseAPIResult<Blob>>;
  supplementLedgerDetail(params?: unknown): Promise<BaseAPIResult<PageResult>>;
  supplementLedgerDetailExport(params: unknown): Promise<BaseAPIResult<Blob>>;
}
