import type { PlatformContext } from "@g2-composition/contract";
import type {
  FumigationDispatchMapConfig,
  FumigationMonitorPersonnelLocation,
  FumigationOperationClient,
} from "@g2-contract/fumigation-operation";

const BFF = "/gw-bff/security-management/fumigation";
const COMMAND_DISPATCH_MAP_CONFIG = "COMMAND_DISPATCH_MAP_CONFIG";

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

interface DictionaryItem {
  code?: string;
  variable?: string;
}

interface FusionPersonRaw {
  id?: string | number;
  name?: string | null;
  gps?: { lng?: number | string | null; lat?: number | string | null } | null;
}

function withQuery(url: string, payload?: object): string {
  if (!payload) return url;
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!entries.length) return url;
  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(Array.isArray(value) ? value.join(",") : String(value))}`)
    .join("&");
  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
}

function encoded(value: string): string {
  return encodeURIComponent(value);
}

async function resultAs<T>(request: Promise<unknown>): Promise<T> {
  return (await request) as T;
}

function unwrap<T>(value: unknown): T {
  if (value && typeof value === "object" && "data" in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

function parseLngLat(value?: string): { lng: number; lat: number } | null {
  if (!value?.trim()) return null;
  const [longitude, latitude] = value.split(",");
  const lng = Number(longitude?.trim());
  const lat = Number(latitude?.trim());
  return Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : null;
}

export function createFumigationOperationClient(http: HttpClient): FumigationOperationClient {
  return {
    listFumigationWorks: (params) => resultAs(http.get(withQuery(`${BFF}/works`, params))),
    getFumigationWork: (id) => resultAs(http.get(`${BFF}/works/${encoded(id)}`)),
    createFumigationWork: (payload) => resultAs(http.post(`${BFF}/works`, payload)),
    submitFumigationApproval: (id, payload) => resultAs(http.post(`${BFF}/works/${encoded(id)}/approvals`, payload)),
    getFumigationPrechecks: (id) => resultAs(http.get(`${BFF}/works/${encoded(id)}/prechecks`)),
    runFumigationPrecheck: (id, payload) => resultAs(http.post(`${BFF}/works/${encoded(id)}/prechecks`, payload)),
    runFumigationPrechecks: (id) => resultAs(http.post(`${BFF}/works/${encoded(id)}/prechecks/run`, {})),
    completeFumigationWork: (id, payload) => resultAs(http.post(`${BFF}/works/${encoded(id)}/complete`, payload)),
    terminateFumigationWork: (id, payload) => resultAs(http.post(`${BFF}/works/${encoded(id)}/terminate`, payload)),
    sendFumigationNotification: async (id, payload) => {
      await http.post(`${BFF}/works/${encoded(id)}/notifications`, payload);
    },
    listFumigationWarehouses: (params) => resultAs(http.get(withQuery(`${BFF}/support/warehouses`, params))),
    listFumigationGrainVarieties: (warehouseId) => resultAs(http.get(`${BFF}/support/warehouses/${encoded(warehouseId)}/grain-varieties`)),
    listFumigationPesticideTypes: () => resultAs(http.get(`${BFF}/support/pesticide-types`)),
    listFumigationApplicationMethods: () => resultAs(http.get(`${BFF}/support/application-methods`)),
    listFumigationDevices: (params) => resultAs(http.get(withQuery(`${BFF}/devices`, params))),
    getFumigationDeviceMonitor: (deviceId) => resultAs(http.get(`${BFF}/devices/${encoded(deviceId)}/monitor`)),
    getFumigationDeviceProperties: (deviceId, propertyCodes) =>
      resultAs(http.get(withQuery(`${BFF}/devices/${encoded(deviceId)}/properties`, { propertyCodes }))),
    listFumigationLinkedDevices: (deviceId) => resultAs(http.get(`${BFF}/devices/${encoded(deviceId)}/linked`)),
    listFumigationAssociatedVideos: (deviceId) => resultAs(http.get(`${BFF}/devices/${encoded(deviceId)}/associated-videos`)),
    listFumigationWorkers: () => resultAs(http.get(`${BFF}/workers`)),
    listFumigationArchives: (params) => resultAs(http.get(withQuery(`${BFF}/archives`, params))),
    generateFumigationArchive: (workId) => resultAs(http.post(`${BFF}/archives/generate`, { workId })),
    getFumigationArchiveDocument: (archiveId) => resultAs(http.get(`${BFF}/archives/${encoded(archiveId)}/document`)),
    getFumigationRealtimeSituation: (applicationCode) => resultAs(http.get(withQuery(`${BFF}/realtime-situation`, { applicationCode }))),
    getFumigationRealtimeSituationStats: () => resultAs(http.get(`${BFF}/realtime-situation/stats`)),
    getFumigationRealtimeSituationWorks: () => resultAs(http.get(`${BFF}/realtime-situation/works`)),
    listFumigationRealtimeSituationWarehouses: () => resultAs(http.get(`${BFF}/realtime-situation/warehouses`)),
    listFumigationRealtimeSituationDevices: () => resultAs(http.get(`${BFF}/realtime-situation/devices`)),
    listFumigationRealtimeSituationAlarms: (applicationCode) =>
      resultAs(http.get(withQuery(`${BFF}/realtime-situation/alarms`, { applicationCode }))),
    getFumigationDispatchMapConfig: async (): Promise<FumigationDispatchMapConfig | null> => {
      const response = await http.get(withQuery("/api/dictionary/getDataDictionaryByItem", { itemCode: COMMAND_DISPATCH_MAP_CONFIG }));
      const items = unwrap<DictionaryItem[]>(response);
      if (!Array.isArray(items)) return null;
      const center = parseLngLat(items.find((item) => item.code === "lnglat")?.variable);
      if (!center) return null;
      const value = Number(items.find((item) => item.code === "radius")?.variable ?? 500);
      return { center, radius: Number.isFinite(value) && value > 0 ? value : 500 };
    },
    listFumigationMonitorPersonnelLocations: async (userIds): Promise<FumigationMonitorPersonnelLocation[]> => {
      const ids = userIds.map((item) => item.trim()).filter(Boolean);
      if (!ids.length) return [];
      const response = await http.get(withQuery("/api/fusion-communicate/fusion-communicate/users", { userIds: ids }));
      const users = unwrap<FusionPersonRaw[]>(response);
      if (!Array.isArray(users)) return [];
      return users
        .map((user) => {
          const lng = Number(user.gps?.lng);
          const lat = Number(user.gps?.lat);
          return {
            userId: user.id == null ? "" : String(user.id),
            name: user.name?.trim() || String(user.id ?? ""),
            ...(Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : {}),
          };
        })
        .filter((item) => item.userId);
    },
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<FumigationOperationClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createFumigationOperationClient(httpModule.createHttpClientForPlatform(ctx));
}

export type { FumigationOperationClient };
