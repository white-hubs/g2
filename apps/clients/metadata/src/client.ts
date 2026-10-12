// @ts-nocheck — generated client; tighten types in a follow-up
import type { PlatformContext } from "@g2-composition/contract";

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

export type MetadataClient = {
  listAllArea: () => Promise<unknown>;
};

export function createMetadataClient(http: HttpClient): MetadataClient {
  return {
    listAllArea: async () => http.get("/gw-bff/metadata/areas/list-all"),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<MetadataClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createMetadataClient(httpModule.createHttpClientForPlatform(ctx));
}
