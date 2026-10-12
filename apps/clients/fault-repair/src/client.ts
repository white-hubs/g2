import type { PlatformContext } from "@g2-composition/contract";

export interface FaultRecord {
  id?: string | number;
  code?: string;
  submitedTime?: string | number;
  instanceName?: string;
  objName?: string;
  faultType?: string;
  faultTypeName?: string;
  urgencyLevel?: string;
  startUserName?: string;
  status?: string;
  activeNodeName?: string;
  result?: string;
  processInstanceId?: string;
  currentTaskId?: string;
  confirmTime?: string | number;
  completeTime?: string | number;
  timeConsuming?: string | number;
  name?: string;
  productCategoryName?: string;
  typeName?: string;
  createTime?: string | number;
  userName?: string;
  organizationName?: string;
  totalNumber?: number;
  waitNumber?: number;
  dealNumber?: number;
  dealRate?: string | number;
  avgWaitTime?: string;
  [key: string]: unknown;
}
export interface FaultPage {
  records: FaultRecord[];
  total: number;
  pages: number;
}
export interface FaultQuery {
  pageNumber?: number;
  pageSize?: number;
  businessType?: string;
  applicationCode?: string;
  type?: string;
  status?: string;
  submitTime?: string;
  period?: string;
  faultTypeId?: string;
  organizationId?: string;
  keyword?: string;
  progress?: string;
  reportTime?: string;
  productCategoryCode?: string;
}
export interface FaultType {
  id?: string | number;
  name: string;
  [key: string]: unknown;
}
export interface FaultCategory {
  categoryCode: string;
  categoryName: string;
  deviceNum?: number;
  children?: FaultCategory[];
}
export interface FaultAttachment {
  id: string | number;
  name?: string;
  path?: string;
  url?: string;
  type?: string;
  suffix?: string;
}
export interface FaultTrend {
  total: number;
  months: { timeFlag: string; num: number }[];
}
export interface FaultRepairClient {
  pagePersonal(query: FaultQuery): Promise<FaultPage>;
  pageRecords(query: FaultQuery): Promise<FaultPage>;
  pageOrderStatistics(query: FaultQuery): Promise<FaultPage>;
  pagePersonnelStatistics(query: FaultQuery): Promise<FaultPage>;
  exportOrderStatistics(query: FaultQuery): Promise<Blob>;
  exportPersonnelStatistics(query: FaultQuery): Promise<Blob>;
  listTypes(query?: FaultQuery): Promise<FaultType[]>;
  createType(value: Pick<FaultType, "name"> & { applicationCode?: string }): Promise<void>;
  updateType(value: FaultType & { id: string | number; applicationCode?: string }): Promise<void>;
  deleteType(id: string | number): Promise<void>;
  pageCases(query: FaultQuery): Promise<FaultPage>;
  getCase(id: string | number): Promise<FaultRecord>;
  createCase(value: FaultRecord): Promise<void>;
  updateCase(value: FaultRecord & { id: string | number }): Promise<void>;
  deleteCase(id: string | number): Promise<void>;
  pageReports(query: FaultQuery): Promise<FaultPage>;
  reportTypes(): Promise<{ value: string; label: string }[]>;
  createReport(value: { type: string; reportTime: string; applicationCode: string }): Promise<void>;
  deleteReport(id: string | number): Promise<void>;
  reportOverview(id: string | number): Promise<FaultRecord>;
  listDepartments(): Promise<FaultType[]>;
  listFlowNodeNames(query: { businessType: string }): Promise<string[]>;
  listCaseCategories(query?: FaultQuery): Promise<FaultCategory[]>;
  listProductCategories(): Promise<FaultCategory[]>;
  uploadCaseFile(file: Blob): Promise<FaultAttachment>;
  getCaseTrend(id: string | number): Promise<FaultTrend>;
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
const MAINTAIN = "/api/maintain";
function withQuery(path: string, query?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  return search.size > 0 ? `${path}?${search}` : path;
}
function unwrap<T>(response: unknown): T {
  let value = response;
  for (let i = 0; i < 4 && value && typeof value === "object" && !(value instanceof Blob); i++) {
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
function asPage(response: unknown): FaultPage {
  const value = unwrap<Partial<FaultPage>>(response);
  return {
    records: Array.isArray(value?.records) ? value.records : [],
    total: Number(value?.total ?? 0),
    pages: Number(value?.pages ?? 0),
  };
}
function asList<T>(response: unknown): T[] {
  const value = unwrap<T[] | { records?: T[] }>(response);
  return Array.isArray(value) ? value : Array.isArray(value?.records) ? value.records : [];
}
const REPORT_TYPE_LABELS: Record<string, string> = { REPORT_DAY: "日报", REPORT_WEEK: "周报", REPORT_MONTH: "月报" };
/** 旧接口的字典行可能使用 code/name 或 type/typeName，统一交给 Select 的 label/value。 */
export function normalizeReportTypes(rows: unknown[]): { value: string; label: string }[] {
  return rows.flatMap((row) => {
    const item = row && typeof row === "object" ? (row as Record<string, unknown>) : { value: row };
    const value = String(item.value ?? item.code ?? item.type ?? item.key ?? "");
    if (!value) {
      return [];
    }
    const label = String(item.label ?? item.name ?? item.typeName ?? item.text ?? REPORT_TYPE_LABELS[value] ?? value);
    return [{ value, label: label.trim() || REPORT_TYPE_LABELS[value] || value }];
  });
}
function asBlob(response: unknown): Blob {
  const value = unwrap<unknown>(response);
  if (!(value instanceof Blob)) {
    throw new Error("导出接口未返回文件");
  }
  return value;
}
const idPath = (id: string | number) => encodeURIComponent(String(id));
export function createFaultRepairClient(http: HttpClient): FaultRepairClient {
  return {
    pagePersonal: async (query) => asPage(await http.get(withQuery(`${MAINTAIN}/fault/apply/personal`, query))),
    pageRecords: async (query) => asPage(await http.get(withQuery(`${MAINTAIN}/fault/apply/all`, query))),
    pageOrderStatistics: async (query) => asPage(await http.get(withQuery(`${MAINTAIN}/fault/apply/statistics/type`, query))),
    pagePersonnelStatistics: async (query) => asPage(await http.get(withQuery("/api/flow/getWordOrderStatisticsByUser", query))),
    exportOrderStatistics: async (query) => asBlob(await http.get(withQuery(`${MAINTAIN}/fault/apply/statistics/typeExcel`, query))),
    exportPersonnelStatistics: async (query) => asBlob(await http.get(withQuery("/api/flow/exportWordOrderStatisticsByUser", query))),
    listTypes: async (query) =>
      asList<FaultType>(await http.get(withQuery(`${MAINTAIN}/fault-type/list`, { applicationCode: "FAULT", ...query }))),
    createType: async (value) => {
      unwrap(await http.post(`${MAINTAIN}/fault-type`, { applicationCode: "FAULT", ...value }));
    },
    updateType: async (value) => {
      unwrap(await http.put(`${MAINTAIN}/fault-type/${idPath(value.id)}`, { applicationCode: "FAULT", ...value }));
    },
    deleteType: async (id) => {
      unwrap(await http.delete(`${MAINTAIN}/fault-type/${idPath(id)}`));
    },
    pageCases: async (query) => asPage(await http.get(withQuery(`${MAINTAIN}/fault-case/page`, { applicationCode: "FAULT", ...query }))),
    getCase: async (id) => unwrap(await http.get(`${MAINTAIN}/fault-case/${idPath(id)}`)),
    createCase: async (value) => {
      unwrap(await http.post(`${MAINTAIN}/fault-case`, value));
    },
    updateCase: async (value) => {
      unwrap(await http.put(`${MAINTAIN}/fault-case/${idPath(value.id)}`, value));
    },
    deleteCase: async (id) => {
      unwrap(await http.delete(`${MAINTAIN}/fault-case/${idPath(id)}`));
    },
    pageReports: async (query) => asPage(await http.get(withQuery(`${MAINTAIN}/getReport`, { applicationCode: "FAULT", ...query }))),
    reportTypes: async () => normalizeReportTypes(asList<unknown>(await http.get(`${MAINTAIN}/getReportType`))),
    createReport: async (value) => {
      unwrap(await http.post(`${MAINTAIN}/addReport`, value));
    },
    deleteReport: async (id) => {
      unwrap(await http.delete(`${MAINTAIN}/deleteReport/${idPath(id)}`));
    },
    reportOverview: async (id) => unwrap(await http.get(`${MAINTAIN}/getReportOverview/${idPath(id)}`)),
    listDepartments: async () => asList(await http.get("/api/ouaa/authenticated/organizations/list")),
    listFlowNodeNames: async (query) => asList(await http.get(withQuery("/api/flow/form-flow-business/node/name", query))),
    listCaseCategories: async (query) =>
      asList(await http.get(withQuery(`${MAINTAIN}/fault-case/device-type/list`, { keyword: "", applicationCode: "FAULT", ...query }))),
    listProductCategories: async () => asList(await http.get("/api/device-center/iot/product/category-tree")),
    uploadCaseFile: async (file) => {
      const form = new FormData();
      form.append("file", file);
      form.append("businessKey", "ouaa");
      form.append("sceneCode", "FAULT_ORDER:CASE");
      const result = unwrap<Partial<FaultAttachment>>(await http.post("/api/file/file", form));
      if (result?.id === undefined) {
        throw new Error("上传附件未返回文件 ID");
      }
      return { id: result.id, name: result.name, path: result.path, url: result.url, type: result.type, suffix: result.suffix };
    },
    getCaseTrend: async (id) => unwrap(await http.get(`${MAINTAIN}/get-fault-trend/${idPath(id)}`)),
  };
}
export async function create(ctx: PlatformContext): Promise<FaultRepairClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createFaultRepairClient(module.createHttpClientForPlatform(ctx));
}
