import type { PlatformContext } from "@g2-composition/contract";
import { SECURE_EDU_BFF_BASE_PATH, type SecureEduClient, type SecureEduUpstreamPath } from "@g2-contract/secure-edu";

import { createMarketClient } from "./market";
interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext): HttpClient;
}

function withQuery(path: string, query?: Record<string, unknown>): string {
  const search = Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return `${SECURE_EDU_BFF_BASE_PATH}${path}${search ? `?${search}` : ""}`;
}

export function createSecureEduClient(http: HttpClient): SecureEduClient {
  const gateway = {
    get: <T>(path: SecureEduUpstreamPath, query?: Record<string, unknown>) => http.get(withQuery(path, query)) as Promise<T>,
    post: <T>(path: SecureEduUpstreamPath, body?: unknown) => http.post(`${SECURE_EDU_BFF_BASE_PATH}${path}`, body) as Promise<T>,
    put: <T>(path: SecureEduUpstreamPath, body?: unknown) => http.put(`${SECURE_EDU_BFF_BASE_PATH}${path}`, body) as Promise<T>,
    delete: <T>(path: SecureEduUpstreamPath, query?: Record<string, unknown>) => http.delete(withQuery(path, query)) as Promise<T>,
    download: async (path: SecureEduUpstreamPath, body?: unknown, method: "GET" | "POST" = "POST") => {
      const result =
        method === "GET"
          ? await http.get(withQuery(path, { download: "true" }))
          : await http.post(withQuery(path, { download: "true" }), body);
      if (!(result instanceof Blob)) {
        throw new Error("导出失败：响应不是文件流");
      }
      return result;
    },
    downloadUrl: (path: SecureEduUpstreamPath, query?: Record<string, unknown>) => withQuery(path, query),
  };
  return { ...gateway, market: createMarketClient(gateway, http) };
}

export async function create(ctx: PlatformContext): Promise<SecureEduClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createSecureEduClient(module.createHttpClientForPlatform(ctx));
}

export type { SecureEduClient };
