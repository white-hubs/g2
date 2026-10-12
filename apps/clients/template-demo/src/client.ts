// @ts-nocheck — generated client; tighten types in a follow-up
import type { PlatformContext } from "@g2-composition/contract";

function withQuery(url: string, payload?: Record<string, unknown>): string {
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

export type TemplateDemoClient = {
  listTemplateDemo: (params?: unknown) => Promise<unknown>;
  getTemplateDemoDetail: (id?: unknown) => Promise<unknown>;
  createTemplateDemo: (params?: unknown) => Promise<unknown>;
  updateTemplateDemo: (params?: unknown) => Promise<unknown>;
  deleteTemplateDemo: (id?: unknown) => Promise<unknown>;
};

export function createTemplateDemoClient(http: HttpClient): TemplateDemoClient {
  return {
    listTemplateDemo: async (params?: unknown) => http.get(withQuery("/template/demo/list", { ...params } as Record<string, unknown>)),
    getTemplateDemoDetail: async (id?: unknown) => http.get(`/template/demo/detail/${id}`),
    createTemplateDemo: async (params?: unknown) => http.post("/template/demo", { ...params }),
    updateTemplateDemo: async (params?: unknown) => http.put("/template/demo", { ...params }),
    deleteTemplateDemo: async (id?: unknown) => http.delete(`/template/demo/${id}`),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<TemplateDemoClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createTemplateDemoClient(httpModule.createHttpClientForPlatform(ctx));
}
