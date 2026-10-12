import type { PlatformContext } from "@g2-composition/contract";
import type { HazardGovernanceGateway } from "@g2-contract/hazard-governance";

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

function withQuery(url: string, payload?: object): string {
  const entries = Object.entries(payload ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (entries.length === 0) {
    return url;
  }
  const query = entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&");
  return url.includes("?") ? `${url}&${query}` : `${url}?${query}`;
}

function idSegment(id: string | number): string {
  return encodeURIComponent(String(id));
}

async function resultAs<T>(request: Promise<unknown>): Promise<T> {
  return (await request) as T;
}

export type HazardGovernanceClient = HazardGovernanceGateway;

export function createHazardGovernanceClient(http: HttpClient): HazardGovernanceClient {
  const base = "/api/hazard-governance";

  return {
    getHazardCategoryTree: () => resultAs(http.get(`${base}/categories/tree`)),
    generateHazardCategoriesByAi: (payload) => resultAs(http.post(`${base}/categories/ai/generation`, { ...payload })),
    createHazardCategory: (payload) => resultAs(http.post(`${base}/categories`, { ...payload })),
    batchCreateHazardCategories: (payload) => resultAs(http.post(`${base}/categories/batch`, { ...payload })),
    updateHazardCategory: async (id, payload) => {
      await http.put(`${base}/categories/${idSegment(id)}`, { ...payload });
    },
    deleteHazardCategory: async (id) => {
      await http.delete(`${base}/categories/${idSegment(id)}`);
    },
    createHazardApprovalTemplate: (payload) => resultAs(http.post(`${base}/approval-templates`, { ...payload })),
    updateHazardApprovalTemplate: async (id, payload) => {
      await http.put(`${base}/approval-templates/${idSegment(id)}`, { ...payload });
    },
    deleteHazardApprovalTemplate: async (id) => {
      await http.delete(`${base}/approval-templates/${idSegment(id)}`);
    },
    pageHazardApprovalTemplates: (params) => resultAs(http.get(withQuery(`${base}/approval-templates/page`, params))),
    listHazardApprovalTemplates: (params) => resultAs(http.get(withQuery(`${base}/approval-templates`, params))),
    pageHazardLedger: (params) => resultAs(http.get(withQuery(`${base}/hazards/ledger/page`, params))),
    getHazardDetail: (id) => resultAs(http.get(`${base}/hazards/${idSegment(id)}`)),
    createHazardPendingConfirmation: (payload) => resultAs(http.post(`${base}/hazards/pending-confirmation`, { ...payload })),
    batchCreateHazardPendingConfirmation: (payload) =>
      resultAs(
        http.post(
          `${base}/hazards/pending-confirmation/batch`,
          payload.map((item) => ({ ...item })),
        ),
      ),
    recognizeHazardsByAi: (payload) => resultAs(http.post(`${base}/hazards/ai/recognition`, { ...payload })),
    confirmHazard: async (id, payload) => {
      await http.post(`${base}/hazards/${idSegment(id)}/confirm`, { ...payload });
    },
    markHazardMisreport: async (payload) => {
      await http.post(`${base}/hazards/misreport`, { ...payload });
    },
    urgeHazard: async (id) => {
      await http.post(`${base}/hazards/${idSegment(id)}/urge`, {});
    },
    pageHazardApprovalTasks: (params) => resultAs(http.get(withQuery(`${base}/hazards/approval-tasks/page`, params))),
    getHazardApprovalTaskDetail: (taskId) => resultAs(http.get(`${base}/approval-tasks/${idSegment(taskId)}`)),
    approveHazardApprovalTask: async (taskId, payload) => {
      await http.post(`${base}/approval-tasks/${idSegment(taskId)}/approve`, { ...payload });
    },
    rejectHazardApprovalTask: async (taskId, payload) => {
      await http.post(`${base}/approval-tasks/${idSegment(taskId)}/reject`, { ...payload });
    },
    pageHazardAcceptanceTasks: (params) => resultAs(http.get(withQuery(`${base}/hazards/acceptance-tasks/page`, params))),
    getHazardAcceptanceDetail: (id) => resultAs(http.get(`${base}/hazards/${idSegment(id)}/acceptance`)),
    submitHazardAcceptance: async (id) => {
      await http.post(`${base}/hazards/${idSegment(id)}/acceptance-submission`);
    },
    acceptHazardAcceptance: async (id, payload) => {
      await http.post(`${base}/hazards/${idSegment(id)}/acceptance`, { ...payload });
    },
    pageHazardRectificationTasks: (params) => resultAs(http.get(withQuery(`${base}/hazards/rectification/page`, params))),
    submitHazardRectificationPlan: (id, payload) =>
      resultAs(http.post(`${base}/hazards/${idSegment(id)}/rectification-plan`, { ...payload })),
    getLatestHazardRectificationProgress: (id) => resultAs(http.get(`${base}/hazards/${idSegment(id)}/rectification-progress`)),
    createHazardRectificationProgress: (id, payload) =>
      resultAs(http.post(`${base}/hazards/${idSegment(id)}/rectification-progress`, { ...payload })),
    getHazardTodoStatistics: (params) =>
      resultAs(http.get(withQuery(`${base}/hazards/todo-statistics`, { pageNumber: 1, pageSize: 10, ...params }))),
    pageHazardTodoItems: (params) => resultAs(http.get(withQuery(`${base}/hazards/todo-items`, params))),
    getHazardDashboardSummary: (params) => resultAs(http.get(withQuery(`${base}/hazards/dashboard/summary`, params))),
    getHazardDashboardCharts: (params) => resultAs(http.get(withQuery(`${base}/hazards/dashboard/charts`, params))),
    getHazardDashboardRankings: (params) => resultAs(http.get(withQuery(`${base}/hazards/dashboard/rankings`, params))),
    getHazardRepeatedRectificationSummary: (params) =>
      resultAs(http.get(withQuery(`${base}/root-cause-analysis/repeated-rectifications/summary`, params))),
    pageHazardRepeatedRectifications: (params) =>
      resultAs(http.get(withQuery(`${base}/root-cause-analysis/repeated-rectifications/page`, params))),
    getHazardRepeatedRectificationDetail: ({ id, ...query }) =>
      resultAs(http.get(withQuery(`${base}/root-cause-analysis/repeated-rectifications/${idSegment(id)}`, query))),
    decideHazardRepeatedRectification: async (id, payload) => {
      await http.post(`${base}/root-cause-analysis/repeated-rectifications/${idSegment(id)}/decision`, { ...payload });
    },
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<HazardGovernanceClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createHazardGovernanceClient(httpModule.createHttpClientForPlatform(ctx));
}
