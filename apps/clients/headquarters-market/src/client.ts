import type { PlatformContext } from "@g2-composition/contract";
import type { HeadquartersMarketClient, HeadquartersMarketConfig } from "@g2-contract/headquarters-market";

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
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

function coerceJson(payload: unknown): unknown {
  if (typeof payload !== "string") {
    return payload;
  }
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return payload;
  }
}

export function createHeadquartersMarketClient(http: HttpClient): HeadquartersMarketClient {
  return {
    // 遗留后端 path（包名不跟路径走，ADR-0062）
    getMarketConfig: async (id: string): Promise<HeadquartersMarketConfig> => {
      const response = coerceJson(await http.get(`/api/dataintegrate/market-config/${encodeURIComponent(id)}`));
      const unwrapped = unwrapLegacyEnvelope(response);
      if (unwrapped !== null && typeof unwrapped === "object") {
        return unwrapped as HeadquartersMarketConfig;
      }
      return {};
    },
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<HeadquartersMarketClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createHeadquartersMarketClient(httpModule.createHttpClientForPlatform(ctx));
}

export type { HeadquartersMarketClient, HeadquartersMarketConfig };
