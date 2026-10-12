import type { PlatformContext } from "@g2-composition/contract";
import type { EmergencySuppliesClient } from "@g2-contract/emergency-supplies";

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

function withQuery(url: string, payload?: Record<string, unknown>): string {
  if (!payload) {
    return url;
  }
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (entries.length === 0) {
    return url;
  }
  const query = entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&");
  return `${url}?${query}`;
}

async function resultAs<T>(request: Promise<unknown>): Promise<T> {
  return (await request) as T;
}

export function createEmergencySuppliesClient(http: HttpClient): EmergencySuppliesClient {
  return {
    getWarehousePage: (payload) => resultAs(http.get(withQuery("/gw-bff/emergency-supplies/warehouses/page", payload))),
    getWarehouseDetail: (id) => resultAs(http.get(`/gw-bff/emergency-supplies/warehouses/${encodeURIComponent(id)}`)),
    createWarehouse: (payload) => resultAs(http.post("/gw-bff/emergency-supplies/warehouses", payload)),
    updateWarehouse: async (id, payload) => {
      await http.put(`/gw-bff/emergency-supplies/warehouses/${encodeURIComponent(id)}`, payload);
    },
    changeWarehouseStatus: async (id, status) => {
      await http.put(withQuery(`/gw-bff/emergency-supplies/warehouses/${encodeURIComponent(id)}/status`, { status }));
    },
    deleteWarehouse: async (id) => {
      await http.delete(`/gw-bff/emergency-supplies/warehouses/${encodeURIComponent(id)}`);
    },
    getSuppliesTypePage: (payload) => resultAs(http.get(withQuery("/gw-bff/emergency-supplies/supplies-types/page", payload))),
    createSuppliesType: (payload) => resultAs(http.post("/gw-bff/emergency-supplies/supplies-types", payload)),
    updateSuppliesType: async (id, payload) => {
      await http.put(`/gw-bff/emergency-supplies/supplies-types/${encodeURIComponent(id)}`, payload);
    },
    deleteSuppliesType: async (id) => {
      await http.delete(`/gw-bff/emergency-supplies/supplies-types/${encodeURIComponent(id)}`);
    },
    getSuppliesPage: (payload) => resultAs(http.get(withQuery("/gw-bff/emergency-supplies/supplies/page", payload))),
    getSuppliesDetail: (id) => resultAs(http.get(`/gw-bff/emergency-supplies/supplies/${encodeURIComponent(id)}`)),
    getSuppliesOverview: () => resultAs(http.get("/gw-bff/emergency-supplies/supplies/overview")),
    createSupplies: (payload) => resultAs(http.post("/gw-bff/emergency-supplies/supplies", payload)),
    updateSupplies: async (id, payload) => {
      await http.put(`/gw-bff/emergency-supplies/supplies/${encodeURIComponent(id)}`, payload);
    },
    changeSuppliesStatus: async (id, status) => {
      await http.put(withQuery(`/gw-bff/emergency-supplies/supplies/${encodeURIComponent(id)}/status`, { status }));
    },
    exportSuppliesLedger: (payload) => resultAs(http.get(withQuery("/gw-bff/emergency-supplies/supplies/export", payload))),
    downloadSuppliesImportTemplate: () => resultAs(http.get("/gw-bff/emergency-supplies/supplies/import-template")),
    importSuppliesLedger: async (file) => {
      const form = new FormData();
      form.append("file", file);
      await http.post("/api/emergency/emergency-supplies/import", form);
    },
    createSuppliesBatch: (id, payload) =>
      resultAs(http.post(`/gw-bff/emergency-supplies/supplies/${encodeURIComponent(id)}/batches`, payload)),
    getSuppliesBatches: (id) => resultAs(http.get(`/gw-bff/emergency-supplies/supplies/${encodeURIComponent(id)}/batches`)),
    getDispatchOrderPage: (payload) => resultAs(http.get(withQuery("/gw-bff/emergency-supplies/dispatch-orders/page", payload))),
    getDispatchOrderDetail: (id) => resultAs(http.get(`/gw-bff/emergency-supplies/dispatch-orders/${encodeURIComponent(id)}`)),
    createDispatchOrder: (payload) => resultAs(http.post("/gw-bff/emergency-supplies/dispatch-orders", payload)),
    getDispatchStat: () => resultAs(http.get("/gw-bff/emergency-supplies/dispatch-orders/stat")),
    confirmDispatchOutbound: async (id, payload) => {
      await http.put(`/gw-bff/emergency-supplies/dispatch-orders/${encodeURIComponent(id)}/confirm-outbound`, payload ?? {});
    },
    confirmDispatchUsing: async (id) => {
      await http.put(`/gw-bff/emergency-supplies/dispatch-orders/${encodeURIComponent(id)}/confirm-using`, {});
    },
    cancelDispatchOrder: async (id) => {
      await http.put(`/gw-bff/emergency-supplies/dispatch-orders/${encodeURIComponent(id)}/cancel`, {});
    },
    returnDispatchItem: async (id, payload) => {
      await http.post(`/gw-bff/emergency-supplies/dispatch-items/${encodeURIComponent(id)}/return`, payload);
    },
    writeoffDispatchItem: async (id, payload) => {
      await http.post(`/gw-bff/emergency-supplies/dispatch-items/${encodeURIComponent(id)}/writeoff`, payload);
    },
    getWarningConfig: () => resultAs(http.get("/gw-bff/emergency-supplies/warning-config")),
    updateWarningConfig: async (payload) => {
      await http.put("/gw-bff/emergency-supplies/warning-config", payload);
    },
    getExpiryWarningPage: (payload) => resultAs(http.get(withQuery("/gw-bff/emergency-supplies/expiry-warnings/page", payload))),
    getStockWarningPage: (payload) => resultAs(http.get(withQuery("/gw-bff/emergency-supplies/stock-warnings/page", payload))),
    getSuppliesMapPoints: (payload) => resultAs(http.get(withQuery("/gw-bff/emergency-supplies/map/points", payload))),
    getSuppliesMapData: (payload) => resultAs(http.get(withQuery("/gw-bff/emergency-supplies/map/data", payload))),
    getSuppliesMapWarnings: (payload) => resultAs(http.get(withQuery("/gw-bff/emergency-supplies/map/warnings", payload))),
  };
}

/** MF `./client` 入口：自持 http 编排。 */
export async function create(ctx: PlatformContext): Promise<EmergencySuppliesClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createEmergencySuppliesClient(httpModule.createHttpClientForPlatform(ctx));
}

export type { EmergencySuppliesClient };
