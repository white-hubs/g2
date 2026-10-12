import type { PlatformContext } from "@g2-composition/contract";
import type { BroadcastCenterClient } from "@g2-contract/broadcast-center";

function withQuery(url: string, payload?: Record<string, unknown>): string {
  if (!payload) return url;
  const entries = Object.entries(payload).filter(([, v]) => v !== undefined && v !== null && v !== "");
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

const API = "/api/broadcast";

export type { BroadcastCenterClient };

export function createBroadcastCenterClient(http: HttpClient): BroadcastCenterClient {
  return {
    getBroadcastPlayRecordPage: async (payload) =>
      http.get(withQuery(`${API}/broadcast-play-record/page`, { ...payload })) as ReturnType<
        BroadcastCenterClient["getBroadcastPlayRecordPage"]
      >,
    broadcastTemplatePage: async (payload) =>
      http.get(withQuery(`${API}/broadcast-template/page`, { ...payload })) as ReturnType<BroadcastCenterClient["broadcastTemplatePage"]>,
    broadcastPlayRecordPage: async (payload) =>
      http.get(withQuery(`${API}/broadcast-play-record/page`, { ...payload })) as ReturnType<
        BroadcastCenterClient["broadcastPlayRecordPage"]
      >,
    getBroadcastRuleInfo: async (id) =>
      http.get(`${API}/broadcast-play-rule/${encodeURIComponent(id)}`) as ReturnType<BroadcastCenterClient["getBroadcastRuleInfo"]>,
    broadcastPlayRulePage: async (payload) =>
      http.get(withQuery(`${API}/broadcast-play-rule/page`, { ...payload })) as ReturnType<BroadcastCenterClient["broadcastPlayRulePage"]>,
    deleteBroadcastTemplate: async (id) => {
      await http.delete(`${API}/broadcast-template/${encodeURIComponent(id)}`);
    },
    deleteBroadcastPlayRule: async (id) => {
      await http.delete(`${API}/broadcast-play-rule/${encodeURIComponent(id)}`);
    },
    broadcastTemplate: async (payload) => http.post(`${API}/broadcast-template`, { ...payload }),
    addBroadcastRule: async (payload) => http.post(`${API}/broadcast-play-rule`, { ...payload }),
    updateBroadcastRule: async (id, payload) => http.put(`${API}/broadcast-play-rule/${encodeURIComponent(id)}`, { ...payload }),
    editBroadcast: async (id, payload) => http.put(`${API}/broadcast-template/${encodeURIComponent(id)}`, { ...payload }),
    broadcastPlayRuleEnabled: async (id, checked) => http.put(`${API}/broadcast-play-rule/${encodeURIComponent(id)}/enabled/${checked}`),
    getBroadcastTemplates: async (keyword) =>
      http.get(`${API}/broadcast-templates?keyword=${encodeURIComponent(keyword ?? "")}`) as ReturnType<
        BroadcastCenterClient["getBroadcastTemplates"]
      >,
    broadcastPlayByNum: async (payload) => {
      await http.post(`${API}/broadcast-play/text`, { ...payload });
    },
    broadcastPlayByCirculate: async (payload) => {
      await http.post(`${API}/broadcast-play/circulate/text`, { ...payload });
    },
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<BroadcastCenterClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createBroadcastCenterClient(httpModule.createHttpClientForPlatform(ctx));
}
