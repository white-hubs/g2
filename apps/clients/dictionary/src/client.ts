import type { PlatformContext } from "@g2-composition/contract";
import type { DictionaryClient } from "@g2-contract/dictionary";

function withQuery(url: string, payload?: object): string {
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

function unwrap<T>(value: unknown): T {
  return (value !== null && typeof value === "object" && "data" in value ? value.data : value) as T;
}

export type { DictionaryClient };

export function createDictionaryClient(http: HttpClient): DictionaryClient {
  return {
    getDictionaryItemByCode: async (code) => unwrap(await http.get(`/gw-bff/dictionary/items/${encodeURIComponent(code)}`)),
    createDictionaryItem: async (params) => unwrap(await http.post(`/gw-bff/dictionary/items`, params)),
    getOrCreateDictionaryItem: async (params) => unwrap(await http.post(`/gw-bff/dictionary/items/get-or-create`, params)),
    getDataDictionaryByItem: async (params) => unwrap(await http.get(withQuery(`/gw-bff/dictionary/datas`, params))),
    getDictionaryByItem: async (params) => unwrap(await http.get(withQuery(`/gw-bff/dictionary/datas`, params))),
    createDataDictionary: async (params) => unwrap(await http.post(`/gw-bff/dictionary/datas`, params)),
    updateDataDictionary: async (params) => unwrap(await http.put(`/gw-bff/dictionary/datas`, params)),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<DictionaryClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createDictionaryClient(httpModule.createHttpClientForPlatform(ctx));
}
