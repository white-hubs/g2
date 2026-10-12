import type { AuthIssueTokenRequest } from "./request";
import type { AuthTokenResponse } from "./response";

export interface AuthGateway {
  /**
   * 用户登录 / refresh 等换票（BFF 注入 OAuth client 凭证）
   */
  issueToken: (body: AuthIssueTokenRequest) => Promise<AuthTokenResponse>;
}
