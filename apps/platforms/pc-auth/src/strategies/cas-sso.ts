import type { AuthClient } from "@g2-contract/auth";
import type { HttpClient } from "@g2-platform/http/client";

import type { AuthStrategy } from "../auth-strategy";

/**
 * 真实接口签名核对自 /Users/dg/work-ghy/ghcloud/prod/cube/apps/auth/service/src/auth.service.ts
 * （`getTokenByAuthCode` / `casLogin`）与旧仓 `views/verify-auth/verify-auth.vue`：
 * - `code`（三方授权码）：经 `authClient.exchangeToken`，`grant_type=ms_accesstoken_code`。
 * - `ticket`（CAS 回调票据）：GET `/third-auth/getLoginToken?key=<ticket>`（非 auth 服务面门面）。
 * 响应体 `AuthVo` 携带的是 `tenants: string[]`（租户列表），不是单个 `tenant` 字段——
 * 选择默认租户是 Shell 侧鉴权状态机的职责（ADR-0028），这里只取列表第一项作为兜底值。
 */
function firstTenant(tenants: unknown): string {
  return Array.isArray(tenants) && typeof tenants[0] === "string" ? tenants[0] : "";
}

function currentLocation(): string {
  return globalThis.location === undefined ? "" : globalThis.location.origin + globalThis.location.pathname;
}

export function createCasSsoStrategy(deps: { auth: Pick<AuthClient, "exchangeToken">; http: Pick<HttpClient, "get"> }): AuthStrategy {
  return {
    id: "cas-sso",
    async tryLogin({ query }) {
      const code = query.get("code");
      const ticket = query.get("ticket");
      if (!code && !ticket) {
        return null;
      }
      const body = code
        ? await deps.auth.exchangeToken({
            grant_type: "ms_accesstoken_code",
            code,
            redirect_uri: currentLocation(),
          })
        : await deps.http.get(`/third-auth/getLoginToken?key=${encodeURIComponent(ticket as string)}`);
      const result = body as { access_token: string; refresh_token?: string; tenants?: string[] };
      const refreshToken = typeof result.refresh_token === "string" ? result.refresh_token : undefined;
      return { token: result.access_token, tenant: firstTenant(result.tenants), refreshToken };
    },
  };
}
