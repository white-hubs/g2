import type * as CompositionContract from "@g2-composition/contract";
import type {
  ElectronicPatrolClient,
  PageResult,
  PatrolArea,
  PatrolDepartment,
  PatrolOverview,
  PatrolRow,
  PatrolUser,
} from "@g2-contract/electronic-patrol";

export interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: CompositionContract.PlatformContext): HttpClient;
}

const MAINTAIN = "/api/maintain";

function withQuery(path: string, query?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    search.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return search.size > 0 ? `${path}?${search}` : path;
}

function unwrap<T>(response: unknown): T {
  if (!response || typeof response !== "object" || response instanceof Blob) {
    return response as T;
  }
  const envelope = response as Record<string, unknown>;
  if (envelope.success === false || (envelope.code !== undefined && !["0", "200"].includes(String(envelope.code)))) {
    throw new Error(String(envelope.message ?? envelope.msg ?? envelope.errorMessage ?? "请求失败"));
  }
  const keys = Object.keys(envelope);
  const isResponseEnvelope =
    "data" in envelope && ("code" in envelope || "success" in envelope || "message" in envelope || "msg" in envelope || keys.length === 1);
  // httpPlatform 有时已经解包为领域对象；任务详情本身也包含 `data`（巡更点数组）。
  // 仅识别明确的业务响应壳，不能看到 data 字段就继续下钻。
  return (isResponseEnvelope ? envelope.data : response) as T;
}

function page<T>(response: unknown): PageResult<T> {
  const value = unwrap<Partial<PageResult<T>>>(response);
  return {
    records: Array.isArray(value?.records) ? value.records : [],
    total: Number(value?.total ?? 0),
    pages: Number(value?.pages ?? 0),
  };
}

function list<T>(response: unknown): T[] {
  const value = unwrap<T[] | { records?: T[] }>(response);
  return Array.isArray(value) ? value : Array.isArray(value?.records) ? value.records : [];
}

function blob(response: unknown): Blob {
  const value = unwrap<unknown>(response);
  if (!(value instanceof Blob)) {
    throw new Error("下载接口未返回文件流");
  }
  return value;
}

function upload(file: Blob): FormData {
  const body = new FormData();
  body.append("file", file);
  return body;
}

export function createElectronicPatrolClient(http: HttpClient): ElectronicPatrolClient {
  return {
    pagePlans: async (query) => page<PatrolRow>(await http.get(withQuery(`${MAINTAIN}/electron/getPalnPage`, query))),
    listPlanStatus: async () => list(await http.get(`${MAINTAIN}/electron/getPalnStatus`)),
    getPlan: async (id) => unwrap(await http.get(`${MAINTAIN}/electron/plan/${encodeURIComponent(id)}`)),
    createPlan: async (body) => unwrap(await http.post(`${MAINTAIN}/electron/plan/add`, body)),
    updatePlan: async (body) => unwrap(await http.put(`${MAINTAIN}/electron/plan/update`, body)),
    changePlanStatus: async (body) => unwrap(await http.put(`${MAINTAIN}/electron/plan`, body)),
    deletePlan: async (id) => unwrap(await http.delete(`${MAINTAIN}/electron/plan/delete/${encodeURIComponent(id)}`)),
    calculatePeriods: async (query) => unwrap(await http.get(withQuery(`${MAINTAIN}/electron/task/calcPeriod`, query))),
    getAttendanceEnabled: async () => Boolean(unwrap(await http.get(`${MAINTAIN}/electron/plan/attendance`))),

    pageTasks: async (query) => page<PatrolRow>(await http.get(withQuery(`${MAINTAIN}/electron/task/queryTaskPage`, query))),
    getTaskOverview: async () => unwrap<PatrolOverview>(await http.get(withQuery(`${MAINTAIN}/electron/task/overview`, { admin: false }))),
    getTask: async (id) =>
      unwrap(await http.get(withQuery(`${MAINTAIN}/electron/task/${encodeURIComponent(id)}`, { executePeriodAll: true }))),
    getTaskLocations: async (query) => list(await http.get(withQuery(`${MAINTAIN}/electron/task/location`, query))),
    createTask: async (body) => unwrap(await http.post(`${MAINTAIN}/electron/task/insert`, body)),
    acceptTask: async (id) => unwrap(await http.get(`${MAINTAIN}/electron/accept/task/${encodeURIComponent(id)}`)),
    removeTasks: async (ids) => unwrap(await http.put(`${MAINTAIN}/electron/task/remove-batch`, { taskIdList: ids })),

    pageRecords: async (query) => page<PatrolRow>(await http.get(withQuery(`${MAINTAIN}/electron/task/queryRecordPage`, query))),
    exportRecords: async (query) => blob(await http.get(withQuery(`${MAINTAIN}/electron/task/queryRecordExport`, query))),

    pagePoints: async (query) => page<PatrolRow>(await http.get(withQuery(`${MAINTAIN}/patrol/location/page`, query))),
    createPoint: async (body) => unwrap(await http.post(`${MAINTAIN}/patrol/location/insert`, body)),
    updatePoint: async (body) => unwrap(await http.put(`${MAINTAIN}/patrol/location/update`, body)),
    deletePoint: async (id) => unwrap(await http.delete(`${MAINTAIN}/patrol/location/${encodeURIComponent(id)}`)),
    downloadPointTemplate: async () => blob(await http.post(`${MAINTAIN}/patrol/location/getTemplateExcel`, {})),
    importPoints: async (file) => unwrap(await http.post(`${MAINTAIN}/patrol/location/import/template`, upload(file))),
    downloadPointQrcodes: async (items) =>
      blob(await http.post("/api/identity/qrcode/generate/batch/download", { entityType: "PATROL_POINT", entityInfo: items })),

    pageNfc: async (query) => page<PatrolRow>(await http.get(withQuery(`${MAINTAIN}/nfc/queryNcfPage`, query))),
    listNfc: async (deviceId) => list(await http.get(withQuery(`${MAINTAIN}/nfc/queryNcfAll`, { deviceId }))),
    createNfc: async (body) => unwrap(await http.post(`${MAINTAIN}/nfc/insert`, body)),
    updateNfc: async (body) => unwrap(await http.put(`${MAINTAIN}/nfc/update`, body)),
    deleteNfc: async (id) => unwrap(await http.delete(`${MAINTAIN}/nfc/delete/${encodeURIComponent(id)}`)),
    downloadNfcTemplate: async () => blob(await http.post(`${MAINTAIN}/nfc/download/template`, {})),
    importNfc: async (file) => unwrap(await http.post(`${MAINTAIN}/nfc/import`, upload(file))),

    pageRoutes: async (query) => page<PatrolRow>(await http.get(withQuery(`${MAINTAIN}/patrol/route/page`, query))),
    listRoutes: async () => list(await http.get(`${MAINTAIN}/patrol/route/all`)),
    getRoute: async (id) => unwrap(await http.get(`${MAINTAIN}/patrol/route/${encodeURIComponent(id)}`)),
    createRoute: async (body) => unwrap(await http.post(`${MAINTAIN}/patrol/route/insert`, body)),
    updateRoute: async (body) => unwrap(await http.put(`${MAINTAIN}/patrol/route/update`, body)),
    deleteRoute: async (id) => unwrap(await http.delete(`${MAINTAIN}/patrol/route/${encodeURIComponent(id)}`)),

    getDictionary: async (itemCode, code) => list(await http.get(withQuery("/api/dictionary/getDataDictionaryByItem", { itemCode, code }))),
    createDictionary: async (body) => unwrap(await http.post("/api/dictionary/addDataDictionary", body)),
    updateDictionary: async (body) => unwrap(await http.put("/api/dictionary/updateDataDictionary", body)),

    pagePointStatistics: async (query) => page<PatrolRow>(await http.get(withQuery(`${MAINTAIN}/electron/statistics/location`, query))),
    pagePersonnelStatistics: async (query) =>
      page<PatrolRow>(await http.get(withQuery(`${MAINTAIN}/electron/statistics/personnel`, query))),
    pageRouteStatistics: async (query) => page<PatrolRow>(await http.get(withQuery(`${MAINTAIN}/electron/statistics/patrolRoute`, query))),
    exportPointStatistics: async (query) => blob(await http.get(withQuery(`${MAINTAIN}/electron/statistics/locationExport`, query))),
    exportPersonnelStatistics: async (query) => blob(await http.get(withQuery(`${MAINTAIN}/electron/statistics/personnelExport`, query))),
    exportRouteStatistics: async (query) => blob(await http.get(withQuery(`${MAINTAIN}/electron/statistics/patrolRouteExport`, query))),

    listAreas: async () => list<PatrolArea>(await http.get("/api/mdata/area/list")),
    listDepartments: async () =>
      list<PatrolDepartment>(await http.get(withQuery("/api/ouaa/authenticated/organizations/list", { enabled: true }))),
    pageUsers: async (query) =>
      page<PatrolUser>(
        await http.get(
          withQuery("/api/ouaa/authenticated/user-under-tenant/page", {
            enabled: true,
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            keyword: query.keyword,
          }),
        ),
      ),
    getTenantLocation: async (tenantCode) => unwrap(await http.get(`/api/ouaa/tenant-under-tenant/${encodeURIComponent(tenantCode)}`)),
  };
}

export async function create(ctx: CompositionContract.PlatformContext): Promise<ElectronicPatrolClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createElectronicPatrolClient(module.createHttpClientForPlatform(ctx));
}

export type { ElectronicPatrolClient };
