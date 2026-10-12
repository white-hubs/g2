import type { PlatformContext } from "@g2-composition/contract";
import type { AuthClient, AuthTokenRequest } from "@g2-contract/auth";

const TOKEN_PATH = "/gw-bff/auth/token";

interface HttpClient {
  post: (url: string, body?: unknown) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

export function createAuthClient(http: HttpClient): AuthClient {
  return {
    async exchangeToken(body: AuthTokenRequest) {
      return http.post(TOKEN_PATH, body);
    },
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057 H1/X1）。 */
export async function create(ctx: PlatformContext): Promise<AuthClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createAuthClient(httpModule.createHttpClientForPlatform(ctx));
}

export type { AuthClient, AuthTokenRequest };
