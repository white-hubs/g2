import type { PlatformContext } from "@g2-composition/contract";
import type {
  CreditWeightSuggestionInput,
  CreditWeightSuggestionOutput,
  PageResult,
  SafetyCreditArchiveDetailVO,
  SafetyCreditArchiveOperationCommand,
  SafetyCreditArchivePageQuery,
  SafetyCreditArchiveSummaryVO,
  SafetyCreditArchiveVO,
  SafetyCreditBehaviorAuditPageQuery,
  SafetyCreditBehaviorPageQuery,
  SafetyCreditBehaviorRejectCommand,
  SafetyCreditBehaviorVO,
  SafetyCreditBenefitRecordCreateCommand,
  SafetyCreditBenefitRecordOperateCommand,
  SafetyCreditBenefitRecordPageQuery,
  SafetyCreditBenefitRecordVO,
  SafetyCreditBenefitRuleCommand,
  SafetyCreditBenefitRulePageQuery,
  SafetyCreditBenefitRuleVO,
  SafetyCreditCheckExecutionEnsureCommand,
  SafetyCreditCheckExecutionSubmitCommand,
  SafetyCreditCheckExecutionVO,
  SafetyCreditChecklistGenerateCommand,
  SafetyCreditChecklistPageQuery,
  SafetyCreditChecklistSaveCommand,
  SafetyCreditChecklistVO,
  SafetyCreditCheckQualityPageQuery,
  SafetyCreditCheckQualityReviewCommand,
  SafetyCreditCheckQualitySummaryVO,
  SafetyCreditCheckQualityVO,
  SafetyCreditCheckStatisticsSummaryVO,
  SafetyCreditClient,
  SafetyCreditDataSourceCommand,
  SafetyCreditDataSourceEnabledCommand,
  SafetyCreditDataSourcePageQuery,
  SafetyCreditDataSourceVO,
  SafetyCreditEventMappingsCommand,
  SafetyCreditEventMappingVO,
  SafetyCreditManualBehaviorCommand,
  SafetyCreditMerchantBehaviorPageQuery,
  SafetyCreditMerchantCommand,
  SafetyCreditMerchantImportResultVO,
  SafetyCreditMerchantPageQuery,
  SafetyCreditMerchantScoreSummaryVO,
  SafetyCreditMerchantVO,
  SafetyCreditOuaaAppointmentVO,
  SafetyCreditOuaaOrganizationVO,
  SafetyCreditOuaaPositionVO,
  SafetyCreditOuaaRoleVO,
  SafetyCreditOuaaUserPageQuery,
  SafetyCreditOuaaUserVO,
  SafetyCreditPublicityConfigCommand,
  SafetyCreditPublicityConfigVO,
  SafetyCreditRankingPageQuery,
  SafetyCreditRankingSummaryQuery,
  SafetyCreditRankingSummaryVO,
  SafetyCreditRankingVO,
  SafetyCreditScoreLogPageQuery,
  SafetyCreditScoreLogVO,
  SafetyCreditScoreModelCommand,
  SafetyCreditScoreModelPageQuery,
  SafetyCreditScoreModelVersionVO,
  SafetyCreditScoreModelVO,
  SafetyCreditSourceEventPageQuery,
} from "@g2-contract/safety-credit";
export interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}
interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext): HttpClient;
}
function withQuery(url: string, payload?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(payload ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }
  }
  return search.size > 0 ? url + "?" + search.toString() : url;
}
async function resultAs<T>(request: Promise<unknown>): Promise<T> {
  let result = await request;
  for (let depth = 0; depth < 4 && result && typeof result === "object" && !(result instanceof Blob); depth++) {
    const record = result as Record<string, unknown>;
    if (
      record.success === false ||
      (record.code != null && !["0", "200"].includes(String(record.code)) && (record.message || record.msg))
    ) {
      throw new Error(String(record.message ?? record.msg ?? "请求失败"));
    }
    if (!("data" in record)) break;
    result = record.data;
  }
  return result as T;
}
const baseURL = "/api/safety-credit";
const ouaaBaseURL = "/api/ouaa";
export function createSafetyCreditClient(http: HttpClient): SafetyCreditClient {
  return {
    pageOuaaApplications: (payload) => resultAs(http.get(withQuery("/api/ouaa/applications", payload))),
    async pageMerchants(payload: SafetyCreditMerchantPageQuery): Promise<PageResult<SafetyCreditMerchantVO>> {
      const url = `${baseURL}/merchants/page`;
      const resp = await resultAs<PageResult<SafetyCreditMerchantVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async getMerchant(id: string | number): Promise<SafetyCreditMerchantVO> {
      const url = `${baseURL}/merchants/${id}`;
      const resp = await resultAs<SafetyCreditMerchantVO>(http.get(withQuery(url, undefined)));
      return resp;
    },
    async pageOuaaMerchantUsers(payload: SafetyCreditOuaaUserPageQuery): Promise<PageResult<SafetyCreditOuaaUserVO>> {
      const url = `${baseURL}/merchants/ouaa-users/page`;
      const resp = await resultAs<PageResult<SafetyCreditOuaaUserVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async createMerchant(payload: SafetyCreditMerchantCommand): Promise<string | number> {
      const url = `${baseURL}/merchants`;
      const resp = await resultAs<string | number>(http.post(url, payload));
      return resp;
    },
    async updateMerchant(id: string | number, payload: SafetyCreditMerchantCommand): Promise<void> {
      const url = `${baseURL}/merchants/${id}`;
      await resultAs<void>(http.put(url, payload));
    },
    async deleteMerchant(id: string | number): Promise<void> {
      const url = `${baseURL}/merchants/${id}`;
      await resultAs<void>(http.delete(withQuery(url, undefined)));
    },
    async downloadMerchantImportTemplate(): Promise<Blob> {
      const url = `${baseURL}/merchants/import/template`;
      return await resultAs<Blob>(http.get(withQuery(url, undefined)));
    },
    async importMerchants(file: Blob): Promise<SafetyCreditMerchantImportResultVO> {
      const url = `${baseURL}/merchants/import`;
      const form = new FormData();
      form.append("file", file);
      const resp = await resultAs<SafetyCreditMerchantImportResultVO>(http.post(url, form));
      return resp;
    },
    async listOuaaOrganizations(payload: { enabled?: boolean } = { enabled: true }): Promise<SafetyCreditOuaaOrganizationVO[]> {
      const url = `${ouaaBaseURL}/organizations`;
      const resp = await resultAs<SafetyCreditOuaaOrganizationVO[]>(http.get(withQuery(url, payload)));
      return resp;
    },
    async pageOuaaPositions(payload: {
      pageNumber: number;
      pageSize: number;
      enabled?: boolean;
      name?: string;
    }): Promise<PageResult<SafetyCreditOuaaPositionVO>> {
      const url = `${ouaaBaseURL}/positions`;
      const resp = await resultAs<PageResult<SafetyCreditOuaaPositionVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async pageOuaaAppointments(payload: {
      pageNumber: number;
      pageSize: number;
      enable?: boolean;
      keyword?: string;
    }): Promise<PageResult<SafetyCreditOuaaAppointmentVO>> {
      const url = `${ouaaBaseURL}/appointment/page`;
      const resp = await resultAs<PageResult<SafetyCreditOuaaAppointmentVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async pageOuaaRoles(payload: {
      pageNumber: number;
      pageSize: number;
      enabled?: boolean;
      keyword?: string;
    }): Promise<PageResult<SafetyCreditOuaaRoleVO>> {
      const url = `${ouaaBaseURL}/roles`;
      const resp = await resultAs<PageResult<SafetyCreditOuaaRoleVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async pageDataSources(payload: SafetyCreditDataSourcePageQuery): Promise<PageResult<SafetyCreditDataSourceVO>> {
      const url = `${baseURL}/data-sources/page`;
      const resp = await resultAs<PageResult<SafetyCreditDataSourceVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async pageDataSourceEvents(payload: SafetyCreditSourceEventPageQuery): Promise<PageResult<SafetyCreditEventMappingVO>> {
      const url = `${baseURL}/data-sources/events/page`;
      const resp = await resultAs<PageResult<SafetyCreditEventMappingVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async updateDataSourceEnabled(id: string | number, payload: SafetyCreditDataSourceEnabledCommand): Promise<void> {
      const url = `${baseURL}/data-sources/${id}/enabled`;
      await resultAs<void>(http.put(url, payload));
    },
    async createDataSource(payload: SafetyCreditDataSourceCommand): Promise<string | number> {
      const url = `${baseURL}/data-sources`;
      const resp = await resultAs<string | number>(http.post(url, payload));
      return resp;
    },
    async updateDataSourceEventMappings(id: string | number, payload: SafetyCreditEventMappingsCommand): Promise<void> {
      const url = `${baseURL}/data-sources/${id}/event-mappings`;
      await resultAs<void>(http.put(url, payload));
    },
    async pageScoreModels(payload: SafetyCreditScoreModelPageQuery): Promise<PageResult<SafetyCreditScoreModelVO>> {
      const url = `${baseURL}/score-models/page`;
      const resp = await resultAs<PageResult<SafetyCreditScoreModelVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async createScoreModel(payload: SafetyCreditScoreModelCommand): Promise<string | number> {
      const url = `${baseURL}/score-models`;
      const resp = await resultAs<string | number>(http.post(url, payload));
      return resp;
    },
    async updateScoreModel(id: string | number, payload: SafetyCreditScoreModelCommand): Promise<void> {
      const url = `${baseURL}/score-models/${id}`;
      await resultAs<void>(http.put(url, payload));
    },
    async publishScoreModel(id: string | number): Promise<SafetyCreditScoreModelVO | undefined> {
      const url = `${baseURL}/score-models/${id}/publish`;
      const resp = await resultAs<SafetyCreditScoreModelVO | undefined>(http.post(url));
      return resp;
    },
    async listScoreModelVersions(id: string | number): Promise<SafetyCreditScoreModelVersionVO[]> {
      const url = `${baseURL}/score-models/${id}/versions`;
      const resp = await resultAs<SafetyCreditScoreModelVersionVO[]>(http.get(withQuery(url, undefined)));
      return resp;
    },
    async getScoreModelWeightSuggestion(payload: CreditWeightSuggestionInput): Promise<CreditWeightSuggestionOutput> {
      const url = `${baseURL}/score-models/weight-suggestions`;
      const resp = await resultAs<CreditWeightSuggestionOutput>(http.post(url, payload));
      return resp;
    },
    async pageScoreLogs(payload: SafetyCreditScoreLogPageQuery): Promise<PageResult<SafetyCreditScoreLogVO>> {
      const url = `${baseURL}/score-logs/page`;
      const resp = await resultAs<PageResult<SafetyCreditScoreLogVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async getMerchantScoreSummary(merchantId: string | number): Promise<SafetyCreditMerchantScoreSummaryVO> {
      const url = `${baseURL}/score-logs/merchant-summary`;
      const resp = await resultAs<SafetyCreditMerchantScoreSummaryVO>(http.get(withQuery(url, { merchantId })));
      return resp;
    },
    async pageBehaviors(payload: SafetyCreditBehaviorPageQuery): Promise<PageResult<SafetyCreditBehaviorVO>> {
      const url = `${baseURL}/behaviors/page`;
      const resp = await resultAs<PageResult<SafetyCreditBehaviorVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async getBehavior(id: string | number): Promise<SafetyCreditBehaviorVO> {
      const url = `${baseURL}/behaviors/${id}`;
      const resp = await resultAs<SafetyCreditBehaviorVO>(http.get(withQuery(url, undefined)));
      return resp;
    },
    async createManualBehavior(payload: SafetyCreditManualBehaviorCommand): Promise<string | number> {
      const url = `${baseURL}/behaviors/manual`;
      const resp = await resultAs<string | number>(http.post(url, payload));
      return resp;
    },
    async pageBehaviorAudits(payload: SafetyCreditBehaviorAuditPageQuery): Promise<PageResult<SafetyCreditBehaviorVO>> {
      const url = `${baseURL}/behaviors/audit/page`;
      const resp = await resultAs<PageResult<SafetyCreditBehaviorVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async approveBehavior(id: string | number): Promise<void> {
      const url = `${baseURL}/behaviors/${id}/approve`;
      await resultAs<void>(http.post(url));
    },
    async rejectBehavior(id: string | number, payload: SafetyCreditBehaviorRejectCommand): Promise<void> {
      const url = `${baseURL}/behaviors/${id}/reject`;
      await resultAs<void>(http.post(url, payload));
    },
    async pageMerchantBehaviors(payload: SafetyCreditMerchantBehaviorPageQuery): Promise<PageResult<SafetyCreditBehaviorVO>> {
      const url = `${baseURL}/merchant/behaviors/page`;
      const resp = await resultAs<PageResult<SafetyCreditBehaviorVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async pageArchives(payload: SafetyCreditArchivePageQuery): Promise<PageResult<SafetyCreditArchiveVO>> {
      const url = `${baseURL}/archives/page`;
      const resp = await resultAs<PageResult<SafetyCreditArchiveVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async getArchiveSummary(): Promise<SafetyCreditArchiveSummaryVO> {
      const url = `${baseURL}/archives/summary`;
      const resp = await resultAs<SafetyCreditArchiveSummaryVO>(http.get(withQuery(url, undefined)));
      return resp;
    },
    async getArchive(merchantId: string | number): Promise<SafetyCreditArchiveDetailVO> {
      const url = `${baseURL}/archives/${merchantId}`;
      const resp = await resultAs<SafetyCreditArchiveDetailVO>(http.get(withQuery(url, undefined)));
      return resp;
    },
    async suspendArchive(merchantId: string | number, payload: SafetyCreditArchiveOperationCommand): Promise<void> {
      const url = `${baseURL}/archives/${merchantId}/suspend`;
      await resultAs<void>(http.post(url, payload));
    },
    async recoverArchive(merchantId: string | number, payload: SafetyCreditArchiveOperationCommand): Promise<void> {
      const url = `${baseURL}/archives/${merchantId}/recover`;
      await resultAs<void>(http.post(url, payload));
    },
    async downloadArchives(payload: SafetyCreditArchivePageQuery): Promise<Blob> {
      const url = `${baseURL}/archives/export`;
      return await resultAs<Blob>(http.get(withQuery(url, payload)));
    },
    async pageRankings(payload: SafetyCreditRankingPageQuery): Promise<PageResult<SafetyCreditRankingVO>> {
      const url = `${baseURL}/rankings/page`;
      const resp = await resultAs<PageResult<SafetyCreditRankingVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async getRankingSummary(payload: SafetyCreditRankingSummaryQuery): Promise<SafetyCreditRankingSummaryVO> {
      const url = `${baseURL}/rankings/summary`;
      const resp = await resultAs<SafetyCreditRankingSummaryVO>(http.get(withQuery(url, payload)));
      return resp;
    },
    async getPublicityConfig(parkName: string): Promise<SafetyCreditPublicityConfigVO> {
      const url = `${baseURL}/publicity-config`;
      const resp = await resultAs<SafetyCreditPublicityConfigVO>(http.get(withQuery(url, { parkName })));
      return resp;
    },
    async updatePublicityConfig(payload: SafetyCreditPublicityConfigCommand): Promise<SafetyCreditPublicityConfigVO> {
      const url = `${baseURL}/publicity-config`;
      const resp = await resultAs<SafetyCreditPublicityConfigVO>(http.put(url, payload));
      return resp;
    },
    async getMerchantCredit(merchantId: string | number): Promise<SafetyCreditArchiveDetailVO> {
      const url = `${baseURL}/merchant/credit`;
      const resp = await resultAs<SafetyCreditArchiveDetailVO>(http.get(withQuery(url, { merchantId })));
      return resp;
    },
    async pageChecklists(payload: SafetyCreditChecklistPageQuery): Promise<PageResult<SafetyCreditChecklistVO>> {
      const url = `${baseURL}/checklists/page`;
      const resp = await resultAs<PageResult<SafetyCreditChecklistVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async generateChecklist(payload: SafetyCreditChecklistGenerateCommand): Promise<(string | number)[]> {
      const url = `${baseURL}/checklists/generate`;
      const resp = await resultAs<(string | number)[]>(http.post(url, payload));
      return resp;
    },
    async getChecklist(id: string | number): Promise<SafetyCreditChecklistVO> {
      const url = `${baseURL}/checklists/${id}`;
      const resp = await resultAs<SafetyCreditChecklistVO>(http.get(withQuery(url, undefined)));
      return resp;
    },
    async updateChecklist(id: string | number, payload: SafetyCreditChecklistSaveCommand): Promise<void> {
      const url = `${baseURL}/checklists/${id}`;
      await resultAs<void>(http.put(url, payload));
    },
    async deleteChecklist(id: string | number): Promise<void> {
      const url = `${baseURL}/checklists/${id}`;
      await resultAs<void>(http.delete(withQuery(url, undefined)));
    },
    async publishChecklist(id: string | number): Promise<void> {
      const url = `${baseURL}/checklists/${id}/publish`;
      await resultAs<void>(http.post(url));
    },
    async getCurrentCheckExecution(merchantId: string | number): Promise<SafetyCreditCheckExecutionVO | null> {
      const url = `${baseURL}/check-executions/current`;
      const resp = await resultAs<SafetyCreditCheckExecutionVO | null>(http.get(withQuery(url, { merchantId })));
      return resp;
    },
    async listCurrentCheckExecutions(merchantId: string | number): Promise<SafetyCreditCheckExecutionVO[]> {
      const url = `${baseURL}/check-executions/current/list`;
      const resp = await resultAs<SafetyCreditCheckExecutionVO[]>(http.get(withQuery(url, { merchantId })));
      return resp;
    },
    async ensureCurrentCheckExecution(payload: SafetyCreditCheckExecutionEnsureCommand): Promise<SafetyCreditCheckExecutionVO> {
      const url = `${baseURL}/check-executions/current/ensure`;
      const resp = await resultAs<SafetyCreditCheckExecutionVO>(http.post(url, payload));
      return resp;
    },
    async getCheckExecution(id: string | number): Promise<SafetyCreditCheckExecutionVO> {
      const url = `${baseURL}/check-executions/${id}`;
      const resp = await resultAs<SafetyCreditCheckExecutionVO>(http.get(withQuery(url, undefined)));
      return resp;
    },
    async saveCheckExecutionDraft(id: string | number, payload: SafetyCreditCheckExecutionSubmitCommand): Promise<void> {
      const url = `${baseURL}/check-executions/${id}/draft`;
      await resultAs<void>(http.put(url, payload));
    },
    async submitCheckExecution(id: string | number, payload: SafetyCreditCheckExecutionSubmitCommand): Promise<void> {
      const url = `${baseURL}/check-executions/${id}/submit`;
      await resultAs<void>(http.post(url, payload));
    },
    async pageCheckQuality(payload: SafetyCreditCheckQualityPageQuery): Promise<PageResult<SafetyCreditCheckQualityVO>> {
      const url = `${baseURL}/check-quality/page`;
      const resp = await resultAs<PageResult<SafetyCreditCheckQualityVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async getCheckQualitySummary(payload: SafetyCreditCheckQualityPageQuery): Promise<SafetyCreditCheckQualitySummaryVO> {
      const url = `${baseURL}/check-quality/summary`;
      const resp = await resultAs<SafetyCreditCheckQualitySummaryVO>(http.get(withQuery(url, payload)));
      return resp;
    },
    async reviewCheckQuality(id: string | number, payload: SafetyCreditCheckQualityReviewCommand): Promise<void> {
      const url = `${baseURL}/check-quality/${id}/review`;
      await resultAs<void>(http.post(url, payload));
    },
    async getCheckStatisticsSummary(): Promise<SafetyCreditCheckStatisticsSummaryVO> {
      const url = `${baseURL}/check-statistics/summary`;
      const resp = await resultAs<SafetyCreditCheckStatisticsSummaryVO>(http.get(withQuery(url, undefined)));
      return resp;
    },
    async pageCheckMerchantPerformance(payload: SafetyCreditCheckQualityPageQuery): Promise<PageResult<SafetyCreditCheckExecutionVO>> {
      const url = `${baseURL}/check-statistics/merchant-performance/page`;
      const resp = await resultAs<PageResult<SafetyCreditCheckExecutionVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async pageBenefitRules(payload: SafetyCreditBenefitRulePageQuery): Promise<PageResult<SafetyCreditBenefitRuleVO>> {
      const url = `${baseURL}/benefit-rules/page`;
      const resp = await resultAs<PageResult<SafetyCreditBenefitRuleVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async createBenefitRule(payload: SafetyCreditBenefitRuleCommand): Promise<string | number> {
      const url = `${baseURL}/benefit-rules`;
      const resp = await resultAs<string | number>(http.post(url, payload));
      return resp;
    },
    async updateBenefitRule(id: string | number, payload: SafetyCreditBenefitRuleCommand): Promise<void> {
      const url = `${baseURL}/benefit-rules/${id}`;
      await resultAs<void>(http.put(url, payload));
    },
    async deleteBenefitRule(id: string | number): Promise<void> {
      const url = `${baseURL}/benefit-rules/${id}`;
      await resultAs<void>(http.delete(withQuery(url, undefined)));
    },
    async updateBenefitRuleEnabled(id: string | number, payload: SafetyCreditDataSourceEnabledCommand): Promise<void> {
      const url = `${baseURL}/benefit-rules/${id}/enabled`;
      await resultAs<void>(http.put(url, payload));
    },
    async pageBenefitRecords(payload: SafetyCreditBenefitRecordPageQuery): Promise<PageResult<SafetyCreditBenefitRecordVO>> {
      const url = `${baseURL}/benefit-records/page`;
      const resp = await resultAs<PageResult<SafetyCreditBenefitRecordVO>>(http.get(withQuery(url, payload)));
      return resp;
    },
    async createBenefitRecord(payload: SafetyCreditBenefitRecordCreateCommand): Promise<string | number> {
      const url = `${baseURL}/benefit-records`;
      const resp = await resultAs<string | number>(http.post(url, payload));
      return resp;
    },
    async confirmBenefitRecord(id: string | number, payload?: SafetyCreditBenefitRecordOperateCommand): Promise<void> {
      const url = `${baseURL}/benefit-records/${id}/confirm`;
      await resultAs<void>(http.post(url, payload));
    },
    async cancelBenefitRecord(id: string | number, payload?: SafetyCreditBenefitRecordOperateCommand): Promise<void> {
      const url = `${baseURL}/benefit-records/${id}/cancel`;
      await resultAs<void>(http.post(url, payload));
    },
  };
}
export async function create(ctx: PlatformContext): Promise<SafetyCreditClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createSafetyCreditClient(module.createHttpClientForPlatform(ctx));
}
export type { SafetyCreditClient };
