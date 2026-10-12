import type * as CompositionContract from "@g2-composition/contract";
import type {
  BulletinDetail,
  BulletinRow,
  DeliveryRecord,
  ModelTypeRow,
  NoticeLevel,
  PageResult,
  RecipientOption,
  TechnicalBulletinClient,
} from "@g2-contract/technical-bulletin";

export interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: CompositionContract.PlatformContext): HttpClient;
}

const MANAGEMENT = "/api/management";

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
  const isEnvelope =
    "data" in envelope && ("code" in envelope || "success" in envelope || "message" in envelope || "msg" in envelope || keys.length === 1);
  return (isEnvelope ? envelope.data : response) as T;
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

export function createTechnicalBulletinClient(http: HttpClient): TechnicalBulletinClient {
  return {
    pageAnnouncements: async (query) => page<BulletinRow>(await http.get(withQuery(`${MANAGEMENT}/announcement/page`, query))),
    getAnnouncement: async (id) => unwrap<BulletinDetail>(await http.get(`${MANAGEMENT}/announcement/${encodeURIComponent(id)}`)),
    saveAnnouncement: async (body) => unwrap(await http.post(`${MANAGEMENT}/announcement`, body)),
    deleteAnnouncement: async (id) => unwrap(await http.delete(`${MANAGEMENT}/announcement/${encodeURIComponent(id)}`)),
    deleteAnnouncements: async (ids) => unwrap(await http.delete(withQuery(`${MANAGEMENT}/announcement/bath`, { ids: ids.join(",") }))),
    updateVisibility: async (body) => unwrap(await http.post(`${MANAGEMENT}/announcement/update/hide-top`, body)),

    listNoticeTypes: async (query) => list<ModelTypeRow>(await http.get(withQuery(`${MANAGEMENT}/getList/ANNOUNCEMENT`, query))),
    listNoticeLabels: async (query) => list<ModelTypeRow>(await http.get(withQuery(`${MANAGEMENT}/getList/ANNOUNCEMENT_TAG`, query))),
    listInstitutions: async (query) => list<ModelTypeRow>(await http.get(withQuery(`${MANAGEMENT}/getList/PUBLISH_AGENCY`, query))),
    listNoticeLevels: async () => list<NoticeLevel>(await http.get(`${MANAGEMENT}/getAnnouncementLevels`)),
    createModelType: async (body) => unwrap(await http.post(`${MANAGEMENT}/addModelTypeCommand`, body)),
    updateModelType: async (id, body) => unwrap(await http.put(`${MANAGEMENT}/updateModelTypeCommand/${encodeURIComponent(id)}`, body)),
    deleteModelType: async (id) => unwrap(await http.delete(`${MANAGEMENT}/removeModelType/${encodeURIComponent(id)}`)),

    listDepartments: async (query) => list<RecipientOption>(await http.get(withQuery("/api/ouaa/authenticated/organizations/list", query))),
    pagePositions: async (query) => page<RecipientOption>(await http.get(withQuery("/api/ouaa/authenticated/positions", query))),
    pageRoles: async (query) => page<RecipientOption>(await http.get(withQuery("/api/ouaa/authenticated/product/role/page", query))),
    pageUsers: async (query) =>
      page<RecipientOption>(await http.get(withQuery("/api/ouaa/authenticated/user-under-tenant/page", { ...query, enable: true }))),
    listDeliveryRecords: async (businessKey) =>
      list<DeliveryRecord>(await http.get(`/api/message2/msg-record/targets/${encodeURIComponent(businessKey)}`)),
  };
}

export async function create(ctx: CompositionContract.PlatformContext): Promise<TechnicalBulletinClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createTechnicalBulletinClient(module.createHttpClientForPlatform(ctx));
}

export type { TechnicalBulletinClient };
