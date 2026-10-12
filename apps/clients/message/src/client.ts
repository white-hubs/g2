import type { PlatformContext } from "@g2-composition/contract";
import type { MessageClient, MessageListParams, MessageSceneConfig } from "@g2-contract/message";

/**
 * 接口路径/方法核对自旧仓 `legacy/bimops-fe-web-migrate/src/api/message.js`；
 * 网关 `baseURL = "/api/message2"` 原样保留（ADR-0057 F1）。
 * TODO(dual-track): message2 非 cube-services BFF 面；收敛时再迁 /gw-bff 或独立 backend。
 */
const baseURL = "/api/message2";

/** 运行时经 `ctx.loadPlatform("httpPlatform", "client")` 取得；不静态打进本 remote。 */
interface HttpClient {
  post: (url: string, body?: unknown) => Promise<unknown>;
  get: (url: string) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

function unwrapLegacyEnvelope(payload: unknown): unknown {
  if (payload !== null && typeof payload === "object" && "code" in payload) {
    const envelope = payload as { code?: unknown; data?: unknown };
    if (envelope.code === 200) {
      return envelope.data === null ? true : envelope.data;
    }
  }
  return payload;
}

function buildQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, String(item));
      }
      continue;
    }
    search.append(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function createMessageClient(http: HttpClient): MessageClient {
  return {
    async getMessageConfig(params) {
      return unwrapLegacyEnvelope(await http.get(`/api/bracing/message/getConfigInfo${buildQueryString(params)}`)) as MessageSceneConfig[];
    },
    async addMessageConfig(payload) {
      return unwrapLegacyEnvelope(await http.post("/api/bracing/message/addConfig", payload)) as string;
    },
    async sceneNotificationMethod(sceneCode) {
      const [channelsResult, sceneResult] = await Promise.all([
        http.get("/api/message2/sat-msg-channels"),
        http.get(`/api/message2/sat-msg-scene-receive/code/${encodeURIComponent(sceneCode)}`),
      ]);
      const channels = unwrapLegacyEnvelope(channelsResult) as { channelCode: string; channelName: string }[];
      const scene = unwrapLegacyEnvelope(sceneResult) as { channelCodes: string[] };
      return channels
        .filter((channel) => scene.channelCodes.includes(channel.channelCode))
        .map((channel) => ({ label: channel.channelName, value: channel.channelCode }));
    },
    async getMessageList(params: MessageListParams) {
      const response = await http.get(`${baseURL}/msg-records${buildQueryString(params)}`);
      return unwrapLegacyEnvelope(response);
    },
    async getUnreadCount(channelType) {
      const segment = channelType ? `/${channelType}` : "";
      const response = await http.get(`${baseURL}/msg-record/un-read/total${segment}`);
      return unwrapLegacyEnvelope(response);
    },
    async markAllAsRead() {
      const response = await http.put(`${baseURL}/msg-record/read-all/CHANNEL_SITE`);
      return unwrapLegacyEnvelope(response);
    },
    async markAsRead(ids) {
      const response = await http.put(`${baseURL}/msg-record/read-batch?ids=${ids.join(",")}`);
      return unwrapLegacyEnvelope(response);
    },
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057 H1/X1）。 */
export async function create(ctx: PlatformContext): Promise<MessageClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createMessageClient(httpModule.createHttpClientForPlatform(ctx));
}

export type { MessageClient, MessageListParams };
