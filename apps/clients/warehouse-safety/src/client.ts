import type { PlatformContext } from "@g2-composition/contract";
import type { WarehouseSafetyGateway } from "@g2-contract/warehouse-safety";

function withQuery<T extends object>(url: string, payload?: T): string {
  if (!payload) return url;
  const entries = Object.entries(payload).filter(([, v]) => v !== undefined);
  if (!entries.length) return url;
  const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
}

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

export type WarehouseSafetyClient = WarehouseSafetyGateway;

export function createWarehouseSafetyClient(http: HttpClient): WarehouseSafetyClient {
  const base = "/gw-bff/warehouse-safety";
  const request = {
    get: <T>(url: string) => http.get(url) as Promise<T>,
    post: <T>(url: string, body?: unknown) => http.post(url, body) as Promise<T>,
    put: <T>(url: string, body?: unknown) => http.put(url, body) as Promise<T>,
    delete: <T>(url: string) => http.delete(url) as Promise<T>,
  };

  return {
    pageWarehouses: (params) => request.get(withQuery(`${base}/warehouses`, params)),
    getWarehouseStatistics: () => request.get(`${base}/statistics/warehouses`),
    getWarehouse: (id) => request.get(`${base}/warehouses/${encodeURIComponent(String(id))}`),
    createWarehouse: (payload) => request.post(`${base}/warehouses`, payload),
    updateWarehouse: (id, payload) => request.put(`${base}/warehouses/${encodeURIComponent(String(id))}`, payload),
    deleteWarehouse: (id) => request.delete(`${base}/warehouses/${encodeURIComponent(String(id))}`),

    pageShelves: (params) => request.get(withQuery(`${base}/shelves`, params)),
    getShelfStatistics: () => request.get(`${base}/statistics/shelves`),
    getShelf: (id) => request.get(`${base}/shelves/${encodeURIComponent(String(id))}`),
    createShelf: (payload) => request.post(`${base}/shelves`, payload),
    updateShelf: (id, payload) => request.put(`${base}/shelves/${encodeURIComponent(String(id))}`, payload),
    deleteShelf: (id) => request.delete(`${base}/shelves/${encodeURIComponent(String(id))}`),

    pageForklifts: (params) => request.get(withQuery(`${base}/forklifts`, params)),
    getForkliftStatistics: () => request.get(`${base}/statistics/forklifts`),
    getForklift: (id) => request.get(`${base}/forklifts/${encodeURIComponent(String(id))}`),
    createForklift: (payload) => request.post(`${base}/forklifts`, payload),
    updateForklift: (id, payload) => request.put(`${base}/forklifts/${encodeURIComponent(String(id))}`, payload),
    deleteForklift: (id) => request.delete(`${base}/forklifts/${encodeURIComponent(String(id))}`),

    pageEvents: (params) => request.get(withQuery(`${base}/events`, params)),
    getEvent: (id) => request.get(`${base}/events/${encodeURIComponent(String(id))}`),
    listEventDevices: (id) => request.get(`${base}/events/${encodeURIComponent(String(id))}/devices`),
    pageDeviceOptions: (params) => request.get(withQuery(`${base}/devices`, params)),
    getAreaTree: () => request.get(`${base}/areas/tree`),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<WarehouseSafetyClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createWarehouseSafetyClient(httpModule.createHttpClientForPlatform(ctx));
}
