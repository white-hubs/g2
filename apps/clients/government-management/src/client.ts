import type { PlatformContext } from "@g2-composition/contract";
import type {
  AllFlowQuery,
  FlowRow,
  GovernmentManagementClient,
  OfficialRow,
  OptionItem,
  PageResult,
  StatisticKind,
} from "@g2-contract/government-management";

export interface HttpClient {
  get(url: string, init?: RequestInit): Promise<unknown>;
  post(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
  put(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
  delete(url: string, init?: RequestInit): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext): HttpClient;
}

const API = "/api";
const STATISTIC_PATHS: Record<StatisticKind, { list: string; export: string }> = {
  system: { list: "/official/regulation/stat", export: "/official/export/regulation/stat" },
  seal: { list: "/official/officialSeal/stat", export: "/official/export/officialSeal/stat" },
  issue: { list: "/official/topic/stat", export: "/official/export/topic/stat" },
  documentReceived: { list: "/official/documentReceived/stat", export: "/official/export/documentReceived/stat" },
  keywork: { list: "/official/keyWork/stat", export: "/official/export/keyWork/stat" },
  focusWork: { list: "/official/focusWork/stat", export: "/official/export/focusWork/stat" },
  focusWorkChange: { list: "/official/focusWork/update/stat", export: "/official/export/focusWork/update/stat" },
};
const DETAIL_PATHS = {
  system: "/official/regulation/stat",
  seal: "/official/officialSeal/stat",
  issue: "/official/topic/stat",
};

function withQuery(path: string, query?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) {
      continue;
    }
    search.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return search.size > 0 ? `${API}${path}?${search}` : `${API}${path}`;
}

function isEnvelope(value: Record<string, unknown>): boolean {
  if (!("data" in value)) {
    return false;
  }
  if (typeof value.success === "boolean" || "message" in value || "msg" in value) {
    return true;
  }
  const code = Number(value.code);
  return Number.isFinite(code) && (code === 0 || (code >= 100 && code < 600));
}

function unwrap<T>(response: unknown): T {
  let value = response;
  for (let depth = 0; depth < 3 && value && typeof value === "object" && !(value instanceof Blob); depth += 1) {
    const envelope = value as Record<string, unknown>;
    if (!isEnvelope(envelope)) {
      break;
    }
    if (envelope.success === false || (envelope.code !== undefined && !["0", "200"].includes(String(envelope.code)))) {
      throw new Error(String(envelope.message ?? envelope.msg ?? envelope.errorMessage ?? "请求失败"));
    }
    value = envelope.data;
  }
  return value as T;
}

function page<T>(response: unknown): PageResult<T> {
  const value = unwrap<unknown>(response);
  if (!value || typeof value !== "object" || !Array.isArray((value as { records?: unknown }).records)) {
    throw new Error("分页接口返回格式错误");
  }
  const result = value as { records: T[]; total?: number; pages?: number };
  return { records: result.records, total: Number(result.total ?? 0), pages: Number(result.pages ?? 0) };
}

function list<T>(response: unknown): T[] {
  const value = unwrap<unknown>(response);
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (value && typeof value === "object" && Array.isArray((value as { records?: unknown }).records)) {
    return (value as { records: T[] }).records;
  }
  if (value === null || value === undefined) {
    return [];
  }
  throw new Error("列表接口返回格式错误");
}

function blob(response: unknown): Blob {
  const value = unwrap<unknown>(response);
  if (!(value instanceof Blob)) {
    throw new Error("导出接口未返回文件流");
  }
  return value;
}

function encoded(id: string): string {
  return encodeURIComponent(id);
}

export function createGovernmentManagementClient(http: HttpClient): GovernmentManagementClient {
  return {
    pageFlows: async (query) => page<FlowRow>(await http.get(withQuery("/flow/process/instance/historical/page", query))),
    pageAllFlows: async (query: AllFlowQuery) =>
      page<FlowRow>(await http.get(withQuery("/flow/process/instance/historical/allPage", query))),
    exportAllFlows: async (query) => blob(await http.get(withQuery("/flow/process/instance/historical/export", query))),
    pageFocusFlows: async (query) => page<OfficialRow>(await http.get(withQuery("/official/focusWork/flow/page", query))),
    listOrganizations: async () => list<OptionItem>(await http.get(`${API}/ouaa/authenticated/organizations/list?enabled=true`)),
    listFirstUsers: async () => list<OptionItem>(await http.get(`${API}/official/focusWork/firstUsers`)),

    pageStatistics: async (kind, query) => page<OfficialRow>(await http.get(withQuery(STATISTIC_PATHS[kind].list, query))),
    getStatisticDetail: async (kind, id, query) =>
      page<OfficialRow>(await http.get(withQuery(`${DETAIL_PATHS[kind]}/${encoded(id)}/detail`, query))),
    exportStatistics: async (kind, period) => blob(await http.post(`${API}${STATISTIC_PATHS[kind].export}`, { period })),

    pageSeals: async (query) => page<OfficialRow>(await http.get(withQuery("/official/officialSeal/page", query))),
    addSeal: async (body) => {
      unwrap(await http.post(`${API}/official/officialSeal/add`, body));
    },
    updateSeal: async (id, body) => {
      unwrap(await http.put(`${API}/official/officialSeal/${encoded(id)}/update`, body));
    },
    deleteSeal: async (id) => {
      unwrap(await http.delete(`${API}/official/officialSeal/${encoded(id)}`));
    },
    pageCategories: async (query) => page<OfficialRow>(await http.get(withQuery("/official/focusWork/category", query))),
    addCategory: async (body) => {
      unwrap(await http.post(`${API}/official/focusWork/category`, body));
    },
    updateCategory: async (id, body) => {
      unwrap(await http.put(`${API}/official/focusWork/category/${encoded(id)}`, body));
    },
    deleteCategory: async (id) => {
      unwrap(await http.delete(`${API}/official/focusWork/category/${encoded(id)}`));
    },

    pageFocusWork: async (query) => page<OfficialRow>(await http.get(withQuery("/official/focusWork/page/extendFlow", query))),
    getFocusWorkDetail: async (id) => unwrap<OfficialRow>(await http.get(`${API}/official/focusWork/${encoded(id)}/detail/reply`)),
    getFocusWorkReplies: async (id) => list<OfficialRow>(await http.get(`${API}/official/focusWork/${encoded(id)}/reply`)),
    getFocusWorkFailure: async (id) => unwrap<OfficialRow>(await http.get(`${API}/official/focusWork/${encoded(id)}/fail`)),
    replyFocusWork: async (body) => {
      unwrap(await http.post(`${API}/official/focusWork/fail`, body));
    },
    exportFocusWork: async (query) => blob(await http.get(withQuery("/official/focusWork/excel/extendFlow", query))),

    listApprovalTypes: async () => list<OptionItem>(await http.get(`${API}/official/official/approval/biz/type`)),
    getBusinessFlow: async (code) => String(unwrap<unknown>(await http.get(`${API}/flow/form-flow-business/${encoded(code)}/flow`)) ?? ""),
    listFormFlows: async (query) => list<OptionItem>(await http.get(withQuery("/flow/form-flow/list", query))),
    getFormFlow: async (id) => unwrap<OfficialRow>(await http.get(withQuery(`/flow/form-flow/${encoded(id)}`, { id }))),
    listFormFields: async (type) => list<OptionItem>(await http.get(withQuery("/official/official/approval/biz/form/field", { type }))),
    saveFlowBusiness: async (body) => {
      unwrap(await http.post(`${API}/flow/form-flow-business`, body));
    },
  };
}

export async function create(ctx: PlatformContext): Promise<GovernmentManagementClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createGovernmentManagementClient(module.createHttpClientForPlatform(ctx));
}

export type { GovernmentManagementClient };
