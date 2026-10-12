import type { PlatformContext } from "@g2-composition/contract";

export type SmallEngineeringRecord = Record<string, unknown> & { id?: string; processInstanceId?: string };
export interface SmallEngineeringPage<T = SmallEngineeringRecord> {
  records: T[];
  total: number;
  pages: number;
}
export interface SmallEngineeringStatistics {
  total?: number;
  apply?: number;
  signing?: number;
  underway?: number;
  completed?: number;
  waitAccept?: number;
  abnormal?: number;
  normal?: number;
  ringRatio?: number;
}
export interface SmallEngineeringClient {
  projectStatistics(params?: Record<string, unknown>): Promise<SmallEngineeringStatistics>;
  projectHomeStatistics(params?: Record<string, unknown>): Promise<SmallEngineeringStatistics>;
  listProjectNodes(params: Record<string, unknown>): Promise<SmallEngineeringPage>;
  listProjectApplies(params: Record<string, unknown>): Promise<SmallEngineeringPage>;
  listSignContracts(params: Record<string, unknown>): Promise<SmallEngineeringPage>;
  getProjectDetail(id: string): Promise<SmallEngineeringRecord>;
  listSchedules(params: Record<string, unknown>): Promise<SmallEngineeringPage>;
  getScheduleDetail(id: string): Promise<SmallEngineeringRecord>;
  listScheduleTracks(id: string): Promise<SmallEngineeringRecord[]>;
  listScheduleFeedbacks(params: { feedbackType: string; scheduleId: string }): Promise<SmallEngineeringRecord[]>;
  getFeedbackDetail(id: string): Promise<SmallEngineeringRecord>;
  saveSchedule(value: SmallEngineeringRecord): Promise<unknown>;
  updateSchedule(value: SmallEngineeringRecord): Promise<unknown>;
  deleteSchedules(ids: string[]): Promise<unknown>;
  submitScheduleFeedback(value: SmallEngineeringRecord): Promise<unknown>;
  submitScheduleAcceptance(value: SmallEngineeringRecord): Promise<unknown>;
  listProjectTypes(params?: Record<string, unknown>): Promise<SmallEngineeringRecord[]>;
  pageProjectTypes(params: Record<string, unknown>): Promise<SmallEngineeringPage>;
  saveProjectType(value: { id?: string; name: string }): Promise<unknown>;
  deleteProjectType(id: string): Promise<unknown>;
  listReforms(params: Record<string, unknown>): Promise<SmallEngineeringPage>;
  reformAnalysis(params: Record<string, unknown>): Promise<SmallEngineeringRecord>;
  listTemporaryPatrols(params: Record<string, unknown>): Promise<SmallEngineeringPage>;
  getTemporaryPatrol(id: string): Promise<SmallEngineeringRecord>;
  isProjectAbnormal(id: string): Promise<string>;
  submitTemporaryPatrol(value: SmallEngineeringRecord): Promise<unknown>;
  listOrganizations(): Promise<SmallEngineeringRecord[]>;
  getMessageConfig(params: { businessType: string; label: string }): Promise<SmallEngineeringRecord[]>;
  saveMessageConfig(value: SmallEngineeringRecord): Promise<unknown>;
}

export interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}
interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext): HttpClient;
}

const BASE = "/api/loose-works";
const idPath = (id: string): string => encodeURIComponent(id);
function withQuery(path: string, params?: Record<string, unknown>): string {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });
  return query.size > 0 ? `${path}?${query}` : path;
}
function unwrap<T>(response: unknown): T {
  let value = response;
  for (let i = 0; i < 4 && value && typeof value === "object" && !Array.isArray(value); i++) {
    const record = value as Record<string, unknown>;
    if (record.success === false || (record.code !== undefined && !["0", "200"].includes(String(record.code)))) {
      throw new Error(String(record.message ?? record.msg ?? "请求失败"));
    }
    if (!("data" in record)) {
      break;
    }
    value = record.data;
  }
  return value as T;
}
function asPage(response: unknown): SmallEngineeringPage {
  const value = unwrap<Partial<SmallEngineeringPage>>(response);
  return {
    records: Array.isArray(value?.records) ? value.records : [],
    total: Number(value?.total ?? 0),
    pages: Number(value?.pages ?? 0),
  };
}
function asList(response: unknown): SmallEngineeringRecord[] {
  const value = unwrap<SmallEngineeringRecord[] | { records?: SmallEngineeringRecord[] }>(response);
  return Array.isArray(value) ? value : Array.isArray(value?.records) ? value.records : [];
}

export function createSmallEngineeringClient(http: HttpClient): SmallEngineeringClient {
  const get = (path: string, params?: Record<string, unknown>) => http.get(withQuery(`${BASE}${path}`, params));
  return {
    projectStatistics: async (params) => unwrap(await get("/project/statistics", params)),
    projectHomeStatistics: async (params) => unwrap(await get("/project/home/statistics", params)),
    listProjectNodes: async (params) => asPage(await get("/project/apply/nodeList", params)),
    listProjectApplies: async (params) => asPage(await get("/project/apply/list", params)),
    listSignContracts: async (params) => asPage(await get("/project/signContract/list", params)),
    getProjectDetail: async (id) => unwrap(await get(`/project/detail/${idPath(id)}`)),
    listSchedules: async (params) => asPage(await get("/project/schedule/list", params)),
    getScheduleDetail: async (id) => unwrap(await get(`/project/schedule/detail/${idPath(id)}`)),
    listScheduleTracks: async (id) => asList(await get(`/project/schedule/${idPath(id)}/trackDownList`)),
    listScheduleFeedbacks: async (params) => asList(await get("/project/feedback/by/schedule/id", params)),
    getFeedbackDetail: async (id) => unwrap(await get("/project/feedback/get/by/id", { id })),
    saveSchedule: async (value) => unwrap(await http.post(`${BASE}/project/schedule/save`, value)),
    updateSchedule: async (value) => unwrap(await http.post(`${BASE}/project/schedule/edit`, value)),
    deleteSchedules: async (ids) => unwrap(await http.post(`${BASE}/project/schedule/delete`, ids)),
    submitScheduleFeedback: async (value) => unwrap(await http.post(`${BASE}/project/schedule/feedback`, value)),
    submitScheduleAcceptance: async (value) => unwrap(await http.post(`${BASE}/project/schedule/checkAccept`, value)),
    listProjectTypes: async (params) => asList(await get("/project-type/list", params)),
    pageProjectTypes: async (params) => asPage(await get("/project-type/page", params)),
    saveProjectType: async (value) => unwrap(await http.post(`${BASE}/project-type/save-or-update`, value)),
    deleteProjectType: async (id) => unwrap(await http.delete(withQuery(`${BASE}/project-type/delete`, { id }))),
    listReforms: async (params) => asPage(await get("/project/reform/list", params)),
    reformAnalysis: async (params) => unwrap(await get("/project/reform/analysis", params)),
    listTemporaryPatrols: async (params) => asPage(await get("/project/inspect/record/page", params)),
    getTemporaryPatrol: async (id) => unwrap(await get("/project/inspect/record/detail", { id })),
    isProjectAbnormal: async (id) => unwrap(await get("/project/inspect/record/abnormal", { id })),
    submitTemporaryPatrol: async (value) => unwrap(await http.post(`${BASE}/project/inspect/record/submit`, value)),
    listOrganizations: async () => asList(await http.get("/api/ouaa/authenticated/organizations/list?enabled=true")),
    getMessageConfig: async (params) => asList(await http.get(withQuery("/api/bracing/message/getConfigInfo", params))),
    saveMessageConfig: async (value) => unwrap(await http.post("/api/bracing/message/addConfig", value)),
  };
}

export async function create(ctx: PlatformContext): Promise<SmallEngineeringClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createSmallEngineeringClient(module.createHttpClientForPlatform(ctx));
}
