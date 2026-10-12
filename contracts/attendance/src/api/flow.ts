import type { BaseAPIResult, PageResult } from "../common";

export interface FlowApi {
  getFlowProcessPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
}
