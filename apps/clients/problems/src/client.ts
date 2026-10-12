import type { PlatformContext } from "@g2-composition/contract";

export interface ProblemRecord {
  id?: string | number;
  code?: string;
  submitedTime?: string | number;
  instanceName?: string;
  hiddenObjName?: string;
  hiddenType?: string;
  urgencyLevel?: string;
  startUserName?: string;
  status?: string;
  activeNodeName?: string;
  result?: string;
  processInstanceId?: string;
  currentTaskId?: string;
  name?: string;
  hiddenDangerCategoryId?: string;
  hiddenDangerCategoryName?: string;
  hiddenTypeName?: string;
  userName?: string;
  organizationName?: string;
  totalNumber?: number;
  waitNumber?: number;
  dealNumber?: number;
  dealRate?: string | number;
  avgWaitTime?: string;
  [key: string]: unknown;
}
export interface ProblemPage {
  records: ProblemRecord[];
  total: number;
  pages: number;
}
export interface ProblemQuery {
  pageNumber: number;
  pageSize: number;
  businessType?: string;
  applicationCode?: string;
  type?: string;
  status?: string;
  submitTime?: string;
  period?: string;
  hiddenDangerTypeId?: string;
  organizationId?: string;
  keyword?: string;
}
export interface ProblemConfig {
  id?: string | number;
  name: string;
  hiddenDangerCategoryId?: string | number;
  hiddenDangerCategoryName?: string;
}
export interface ProblemsClient {
  pagePersonal(query: ProblemQuery): Promise<ProblemPage>;
  pageRecords(query: ProblemQuery): Promise<ProblemPage>;
  pageOrderStatistics(query: ProblemQuery): Promise<ProblemPage>;
  pagePersonnelStatistics(query: ProblemQuery): Promise<ProblemPage>;
  listDegrees(): Promise<ProblemConfig[]>;
  createDegree(value: Pick<ProblemConfig, "name">): Promise<void>;
  updateDegree(value: ProblemConfig & { id: string | number }): Promise<void>;
  deleteDegree(id: string | number): Promise<void>;
  listCategories(): Promise<ProblemConfig[]>;
  createCategory(value: Pick<ProblemConfig, "name">): Promise<void>;
  updateCategory(value: ProblemConfig & { id: string | number }): Promise<void>;
  deleteCategory(id: string | number): Promise<void>;
  listTypes(query?: { hiddenDangerCategoryId?: string; pageNumber?: number; pageSize?: number }): Promise<ProblemConfig[]>;
  createType(value: ProblemConfig): Promise<void>;
  updateType(value: ProblemConfig & { id: string | number }): Promise<void>;
  deleteType(id: string | number): Promise<void>;
  listDepartments(): Promise<ProblemConfig[]>;
  exportOrderStatistics(query: ProblemQuery): Promise<Blob>;
  exportPersonnelStatistics(query: ProblemQuery): Promise<Blob>;
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

function withQuery(path: string, query?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  return search.size > 0 ? `${path}?${search.toString()}` : path;
}
function unwrap<T>(response: unknown): T {
  let value = response;
  for (let index = 0; index < 4 && value && typeof value === "object" && !(value instanceof Blob); index++) {
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
function asPage(value: unknown): ProblemPage {
  const page = unwrap<Partial<ProblemPage>>(value);
  return { records: Array.isArray(page?.records) ? page.records : [], total: Number(page?.total ?? 0), pages: Number(page?.pages ?? 0) };
}
function asList(value: unknown): ProblemConfig[] {
  const result = unwrap<ProblemConfig[] | { records?: ProblemConfig[] }>(value);
  return Array.isArray(result) ? result : Array.isArray(result?.records) ? result.records : [];
}
function asBlob(value: unknown): Blob {
  const result = unwrap<unknown>(value);
  if (!(result instanceof Blob)) {
    throw new Error("导出接口未返回文件");
  }
  return result;
}
const maintain = "/api/maintain";
export function createProblemsClient(http: HttpClient): ProblemsClient {
  return {
    pagePersonal: async (query) => asPage(await http.get(withQuery(`${maintain}/hidden/apply/personal`, query))),
    pageRecords: async (query) => asPage(await http.get(withQuery(`${maintain}/hidden/apply/all`, query))),
    pageOrderStatistics: async (query) => asPage(await http.get(withQuery(`${maintain}/hidden/work/order/statistics`, query))),
    pagePersonnelStatistics: async (query) => asPage(await http.get(withQuery("/api/flow/getWordOrderStatisticsByUser", query))),
    listDegrees: async () => asList(await http.get(`${maintain}/hidden-danger-level/list`)),
    createDegree: async (value) => {
      unwrap(await http.post(`${maintain}/hidden-danger-level`, value));
    },
    updateDegree: async (value) => {
      unwrap(await http.put(`${maintain}/hidden-danger-level/${encodeURIComponent(String(value.id))}`, value));
    },
    deleteDegree: async (id) => {
      unwrap(await http.delete(`${maintain}/hidden-danger-level/${encodeURIComponent(String(id))}`));
    },
    listCategories: async () => asList(await http.get(`${maintain}/hidden-danger-category/list`)),
    createCategory: async (value) => {
      unwrap(await http.post(`${maintain}/hidden-danger-category`, value));
    },
    updateCategory: async (value) => {
      unwrap(await http.put(`${maintain}/hidden-danger-category/${encodeURIComponent(String(value.id))}`, value));
    },
    deleteCategory: async (id) => {
      unwrap(await http.delete(`${maintain}/hidden-danger-category/${encodeURIComponent(String(id))}`));
    },
    listTypes: async (query) => asList(await http.get(withQuery(`${maintain}/hidden-danger-type/list`, query))),
    createType: async (value) => {
      unwrap(await http.post(`${maintain}/hidden-danger-type`, value));
    },
    updateType: async (value) => {
      unwrap(await http.put(`${maintain}/hidden-danger-type/${encodeURIComponent(String(value.id))}`, value));
    },
    deleteType: async (id) => {
      unwrap(await http.delete(`${maintain}/hidden-danger-type/${encodeURIComponent(String(id))}`));
    },
    listDepartments: async () => asList(await http.get("/api/ouaa/authenticated/organizations/list")),
    exportOrderStatistics: async (query) => asBlob(await http.get(withQuery(`${maintain}/hidden/work/order/statisticsExcel`, query))),
    exportPersonnelStatistics: async (query) => asBlob(await http.get(withQuery("/api/flow/exportWordOrderStatisticsByUser", query))),
  };
}
export async function create(ctx: PlatformContext): Promise<ProblemsClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createProblemsClient(module.createHttpClientForPlatform(ctx));
}
