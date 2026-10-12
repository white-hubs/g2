import type { PlatformContext } from "@g2-composition/contract";
import type {
  AppealRecord,
  EnterpriseRecord,
  FactoryManagementClient,
  InterviewRecord,
  MonitorRecord,
  OperationRecord,
  PageResult,
  RentalRecord,
  RoomRateRecord,
  RoomRecord,
  RoomStatistics,
  SelectRecord,
  TenantOverview,
  TypeRecord,
} from "@g2-contract/factory-management";

export interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext): HttpClient;
}

const PARK = "/api/park";
const OPERATION = "/api/youxianqu-park";

function withQuery(path: string, query?: Record<string, unknown>): string {
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
  const keys = Object.keys(envelope);
  const isEnvelope =
    "data" in envelope && ("code" in envelope || "success" in envelope || "message" in envelope || "msg" in envelope || keys.length === 1);
  if (!isEnvelope) {
    return response as T;
  }
  if (envelope.success === false || (envelope.code !== undefined && !["0", "200"].includes(String(envelope.code)))) {
    throw new Error(String(envelope.message ?? envelope.msg ?? envelope.errorMessage ?? "请求失败"));
  }
  return envelope.data as T;
}

function list<T>(response: unknown): T[] {
  const value = unwrap<T[] | { records?: T[] }>(response);
  return Array.isArray(value) ? value : Array.isArray(value?.records) ? value.records : [];
}

function page<T>(response: unknown): PageResult<T> {
  const value = unwrap<Partial<PageResult<T>> | T[]>(response);
  if (Array.isArray(value)) {
    return { records: value, total: value.length, pages: value.length > 0 ? 1 : 0 };
  }
  return {
    records: Array.isArray(value?.records) ? value.records : [],
    total: Number(value?.total ?? 0),
    pages: Number(value?.pages ?? 0),
  };
}

function idsQuery(path: string, ids: string[]): string {
  return withQuery(path, { ids: ids.join(",") });
}

export function createFactoryManagementClient(http: HttpClient): FactoryManagementClient {
  return {
    getTenantOverview: async (tenantCode) =>
      unwrap<TenantOverview>(await http.get(`/api/ouaa/tenant-under-tenant/${encodeURIComponent(tenantCode)}`)),
    getRoomStatistics: async () => unwrap<RoomStatistics>(await http.get(`${PARK}/getRoomStatistics`)),
    listRoomRates: async () => list<RoomRateRecord>(await http.get(`${PARK}/getRoomRateList`)),

    listTypes: async (tag, query) => list<SelectRecord>(await http.get(withQuery(`${PARK}/type-data/${tag}/list`, { ...query, tag }))),
    pageTypes: async (tag, query) => page<TypeRecord>(await http.get(withQuery(`${PARK}/type-data/${tag}/list`, { ...query, tag }))),
    createType: async (tag, body) => unwrap(await http.post(`${PARK}/type-data/${tag}`, body)),
    updateType: async (id, body) => unwrap(await http.put(`${PARK}/type-data/${encodeURIComponent(id)}`, body)),
    deleteType: async (id) => unwrap(await http.delete(`${PARK}/type-data/${encodeURIComponent(id)}`)),

    listEnterpriseTypes: async () => list<SelectRecord>(await http.get(`${PARK}/enterprise/types`)),
    listEnterpriseScales: async () => list<SelectRecord>(await http.get(`${PARK}/enterprise/scales`)),
    listEnterprises: async (query) => list<SelectRecord>(await http.get(withQuery(`${PARK}/enterprise/list`, query))),
    pageEnterprises: async (query) => page<EnterpriseRecord>(await http.get(withQuery(`${PARK}/enterprise/page`, query))),
    pageEnterpriseDirectory: async (query) => page<EnterpriseRecord>(await http.get(withQuery(`${PARK}/enterprise/directory/page`, query))),
    getEnterprise: async (id) => unwrap<EnterpriseRecord>(await http.get(`${PARK}/enterprise/${encodeURIComponent(id)}`)),
    createEnterprise: async (body) => unwrap(await http.post(`${PARK}/enterprise`, body)),
    updateEnterprise: async (id, body) => unwrap(await http.put(`${PARK}/enterprise/${encodeURIComponent(id)}`, body)),
    deleteEnterprise: async (id) => unwrap(await http.delete(`${PARK}/enterprise/${encodeURIComponent(id)}`)),
    deleteEnterprises: async (ids) => unwrap(await http.delete(idsQuery(`${PARK}/enterprise/batch`, ids))),

    pageAppeals: async (query) => page<AppealRecord>(await http.get(withQuery(`${PARK}/enterprise-appeal/page`, query))),
    listAppeals: async (query) => list<SelectRecord>(await http.get(withQuery(`${PARK}/enterprise-appeal/list`, query))),
    getAppeal: async (id) => unwrap<AppealRecord>(await http.get(`${PARK}/enterprise-appeal/${encodeURIComponent(id)}`)),
    createAppeal: async (body) => unwrap(await http.post(`${PARK}/enterprise-appeal`, body)),
    updateAppeal: async (id, body) => unwrap(await http.put(`${PARK}/enterprise-appeal/${encodeURIComponent(id)}`, body)),
    deleteAppeal: async (id) => unwrap(await http.delete(`${PARK}/enterprise-appeal/${encodeURIComponent(id)}`)),
    deleteAppeals: async (ids) => unwrap(await http.delete(idsQuery(`${PARK}/enterprise-appeal/batch`, ids))),

    pageInterviews: async (query) => page<InterviewRecord>(await http.get(withQuery(`${PARK}/enterprise-interview/page`, query))),
    getInterview: async (id) => unwrap<InterviewRecord>(await http.get(`${PARK}/enterprise-interview/${encodeURIComponent(id)}`)),
    createInterview: async (body) => unwrap(await http.post(`${PARK}/enterprise-interview`, body)),
    updateInterview: async (id, body) => unwrap(await http.put(`${PARK}/enterprise-interview/${encodeURIComponent(id)}`, body)),
    deleteInterview: async (id) => unwrap(await http.delete(`${PARK}/enterprise-interview/${encodeURIComponent(id)}`)),
    deleteInterviews: async (ids) => unwrap(await http.delete(idsQuery(`${PARK}/enterprise-interview/batch`, ids))),

    listAreas: async (query) => list<SelectRecord>(await http.get(withQuery("/api/mdata/area/list", query))),
    listRoomStatuses: async () => list<SelectRecord>(await http.get(`${PARK}/room/status`)),
    listRooms: async (query) => list<SelectRecord>(await http.get(withQuery(`${PARK}/tenantRoom/list`, query))),
    pageRooms: async (query) => page<RoomRecord>(await http.get(withQuery(`${PARK}/room/page`, query))),
    getRoom: async (id) => unwrap<RoomRecord>(await http.get(`${PARK}/room/${encodeURIComponent(id)}`)),
    createRoom: async (body) => unwrap(await http.post(`${PARK}/room`, body)),
    updateRoom: async (id, body) => unwrap(await http.put(`${PARK}/room/${encodeURIComponent(id)}`, body)),
    deleteRoom: async (id) => unwrap(await http.delete(`${PARK}/room/${encodeURIComponent(id)}`)),
    deleteRooms: async (ids) => unwrap(await http.delete(idsQuery(`${PARK}/room/batch`, ids))),

    pageRentals: async (query) => page<RentalRecord>(await http.get(withQuery(`${PARK}/room-rent-record/page`, query))),
    getRental: async (id) => unwrap<RentalRecord>(await http.get(`${PARK}/room-rent-record/${encodeURIComponent(id)}`)),
    createRental: async (body) => unwrap(await http.post(`${PARK}/room-rent-record`, body)),
    updateRental: async (id, body) => unwrap(await http.put(`${PARK}/room-rent-record/${encodeURIComponent(id)}`, body)),
    deleteRental: async (id) => unwrap(await http.delete(`${PARK}/room-rent-record/${encodeURIComponent(id)}`)),
    deleteRentals: async (ids) => unwrap(await http.delete(idsQuery(`${PARK}/room-rent-record/batch`, ids))),

    listMonitors: async (categoryCode) =>
      list<MonitorRecord>(await http.get(withQuery("/api/securitymanagement/getDeviceMonitor/FACTORYMANAGEMENT", { categoryCode }))),
    createMonitor: async (body) => unwrap(await http.post("/api/securitymanagement/addDeviceMonitor", body)),
    updateMonitor: async (id, body) =>
      unwrap(await http.put(`/api/securitymanagement/updateDeviceMonitor/${encodeURIComponent(id)}`, body)),
    deleteMonitor: async (id) => unwrap(await http.delete(`/api/securitymanagement/deleteDeviceMonitor/${encodeURIComponent(id)}`)),

    pageInvestmentPlans: async (query) => page<OperationRecord>(await http.get(withQuery(`${OPERATION}/investmentPlan/page`, query))),
    pageProjects: async (query) => page<OperationRecord>(await http.get(withQuery(`${OPERATION}/projectManagement/page`, query))),
    pageEstateContracts: async (query) => page<OperationRecord>(await http.get(withQuery(`${OPERATION}/estateContract/page`, query))),
    pageComplaints: async (query) => page<OperationRecord>(await http.get(withQuery(`${OPERATION}/complaint/page`, query))),
    pageRentRecords: async (query) => page<OperationRecord>(await http.get(withQuery(`${OPERATION}/rentRecord/page`, query))),
  };
}

export async function create(ctx: PlatformContext): Promise<FactoryManagementClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createFactoryManagementClient(module.createHttpClientForPlatform(ctx));
}

export type { FactoryManagementClient };
