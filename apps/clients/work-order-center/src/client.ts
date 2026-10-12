import type * as CompositionContract from "@g2-composition/contract";
import type {
  PageResult,
  WorkOrderBusinessType,
  WorkOrderCenterClient,
  WorkOrderRecord,
  WorkOrderStatistics,
} from "@g2-contract/work-order-center";

interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: CompositionContract.PlatformContext): HttpClient;
}

const FLOW = "/api/flow";

function withQuery(path: string, query?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }
  }
  return search.size > 0 ? `${path}?${search}` : path;
}

function unwrap<T>(response: unknown): T {
  let value = response;
  for (let depth = 0; depth < 4 && value && typeof value === "object" && !(value instanceof Blob); depth += 1) {
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
    throw new Error("导出接口未返回文件流");
  }
  return value;
}

export function createWorkOrderCenterClient(http: HttpClient): WorkOrderCenterClient {
  return {
    pageWorkOrders: async (query) => page<WorkOrderRecord>(await http.get(withQuery(`${FLOW}/process/instance/historical/allPage`, query))),
    deleteWorkOrders: async (ids) => unwrap(await http.post(`${FLOW}/form/instance/form-flows/delete`, ids)),
    pageStatistics: async (query) => page<WorkOrderStatistics>(await http.get(withQuery(`${FLOW}/statistics/group/businessType`, query))),
    exportStatistics: async (query) => blob(await http.get(withQuery(`${FLOW}/statistics/group/businessType/export`, query))),
    listBusinessTypes: async () => list<WorkOrderBusinessType>(await http.get(`${FLOW}/form-business/type/list`)),
  };
}

export async function create(ctx: CompositionContract.PlatformContext): Promise<WorkOrderCenterClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createWorkOrderCenterClient(module.createHttpClientForPlatform(ctx));
}

export type { WorkOrderCenterClient };
