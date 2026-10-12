import type * as CompositionContract from "@g2-composition/contract";
import type { LinkageClient, LinkagePage, LinkagePageQuery, LinkageRow } from "@g2-contract/linkage-control";

export interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(context: CompositionContract.PlatformContext): HttpClient;
}

function queryString(values: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return params.size ? `?${params}` : "";
}

function unwrap<T>(response: unknown): T {
  if (!response || typeof response !== "object" || response instanceof Blob) return response as T;
  const envelope = response as Record<string, unknown>;
  if (envelope.success === false || (envelope.code !== undefined && !["0", "200"].includes(String(envelope.code)))) {
    throw new Error(String(envelope.message ?? envelope.msg ?? envelope.errorMessage ?? "联动控制请求失败"));
  }
  if ("data" in envelope && ("code" in envelope || "success" in envelope || "message" in envelope || Object.keys(envelope).length === 1)) {
    return envelope.data as T;
  }
  return response as T;
}

function page<T>(response: unknown): LinkagePage<T> {
  const result = unwrap<Partial<LinkagePage<T>>>(response);
  if (!result || !Array.isArray(result.records)) throw new Error("联动控制列表响应格式错误");
  return { records: result.records, total: Number(result.total ?? 0), pages: Number(result.pages ?? 0) };
}

function list<T>(response: unknown): T[] {
  const value = unwrap<unknown>(response);
  if (!Array.isArray(value)) throw new Error("联动详情关联记录响应格式错误");
  return value as T[];
}

const RULE_PATHS = {
  condition: "/api/linkage/rule-device-conditions",
  scene: "/api/linkage/rule-scenes",
  time: "/api/linkage/rule-timings",
} as const;

export function createLinkageClient(http: HttpClient): LinkageClient {
  return {
    pageRules: async (kind: "condition" | "scene" | "time", query: LinkagePageQuery) =>
      page<LinkageRow>(await http.get(`${RULE_PATHS[kind]}${queryString(query)}`)),
    pageEvents: async (query) => page<LinkageRow>(await http.get(`/api/linkage/events${queryString(query)}`)),
    getEvent: async (id) => unwrap(await http.get(`/api/linkage/event/${encodeURIComponent(id)}`)),
    getEventDevices: async (eventId) => list(await http.get(`/api/linkage/event-iot-device-pros/${encodeURIComponent(eventId)}`)),
    getEventDeviceRecords: async (eventId) => list(await http.get(`/api/linkage/event-iot-device-pro-records/${encodeURIComponent(eventId)}`)),
    getEventVideos: async (eventId) => list(await http.get(`/api/linkage/event-video/${encodeURIComponent(eventId)}`)),
    getEventVideoRecords: async (eventId) => list(await http.get(`/api/linkage/event-video-records/${encodeURIComponent(eventId)}`)),
    getEventVideoFiles: async (eventId) => list(await http.get(`/api/linkage/event-video-file-paths/${encodeURIComponent(eventId)}`)),
    getEventMessageRecords: async (eventId) => list(await http.get(`/api/message2/msg-record/targets/${encodeURIComponent(eventId)}`)),
    getRule: async (id) => unwrap(await http.get(`/api/linkage/rule/${encodeURIComponent(id)}`)),
    getMessageConfigs: async (codes) => {
      const response = await http.get(`/api/message/sat-msg-configs?satMsgDefineCodes=${encodeURIComponent(codes.join(","))}`);
      const value = unwrap<unknown>(response);
      if (!Array.isArray(value)) throw new Error("联动消息配置响应格式错误");
      return value as Record<string, unknown>[];
    },
    saveMessageConfigs: async (method, rows) => unwrap(await http[method]("/api/message/sat-msg-config", { params: rows })),
    createRule: async (body) => unwrap(await http.post("/api/linkage/rule", body)),
    updateRule: async (id, body) => unwrap(await http.put(`/api/linkage/rule/${encodeURIComponent(id)}`, body)),
    deleteRule: async (id) => unwrap(await http.delete(`/api/linkage/rule/${encodeURIComponent(id)}`)),
    deleteRules: async (ids) => unwrap(await http.delete(`/api/linkage/rule/batch${queryString({ ids: ids.join(",") })}`)),
    setRuleEnabled: async (id, enabled) => unwrap(await http.put(`/api/linkage/rule/enabled/${encodeURIComponent(id)}/${enabled}`)),
    triggerScene: async (id, password) => unwrap(await http.post("/api/linkage/rule-scene/trigger", { id, password })),
  };
}

export async function create(context: CompositionContract.PlatformContext): Promise<LinkageClient> {
  const module = (await context.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createLinkageClient(module.createHttpClientForPlatform(context));
}
