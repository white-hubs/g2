/**
 * auth 服务面契约：BFF token 交换门面（纯类型；ADR-0057）。
 */

export type AuthTokenRequest = Record<string, unknown>;

/** `@g2-client/auth` 经 `ensureClient` 返回的业务 API。 */
export interface AuthClient {
  /** `POST /gw-bff/auth/token` */
  exchangeToken: (body: AuthTokenRequest) => Promise<unknown>;
}

/** cube-services Gateway / DTO（与壳侧 /api 双轨并存；TODO(dual-track) 收敛） */
export * from "./gateway-surface";
