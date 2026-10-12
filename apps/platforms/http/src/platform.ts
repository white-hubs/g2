import type { PlatformContext } from "@g2-composition/contract";

import { type HttpClient, createHttpClient } from "./create-http-client";
import { HttpServiceError } from "./errors";

export type { HttpClient };
/**
 * 消费方（如 `@g2-platform/pc-auth` 的手机号/微信登录 409"账号未绑定"判定，见 `bind-error.ts`）
 * 需要在拿到 `http.post()` 抛出的异常后判断 `instanceof HttpServiceError` 并读 `httpStatus`，
 * 这里把类本身（不只是类型）也从 `./client` 这个唯一对外入口重新导出，与本文件已有的
 * `HttpClient` 类型导出保持同一个入口，不需要消费方绕过 package.json `exports` 字段直接
 * import 内部的 `./errors` 模块。
 */
export { HttpServiceError };

export const AUTH_LOGOUT_REQUESTED = "auth:logout-requested";

/**
 * 供业务 client 模块使用的辅助：当捕获到 401 且业务判定这次确实代表会话失效时，
 * 调用本函数广播登出事件；http 客户端自身不做这个判断（ADR-0047）。
 */
export function requestLogoutIfSessionExpired(ctx: PlatformContext, error: unknown): void {
  if (error instanceof HttpServiceError && error.httpStatus === 401) {
    ctx.bus.publish(AUTH_LOGOUT_REQUESTED, { errorCode: error.errorCode });
  }
}

export function createHttpClientForPlatform(ctx: PlatformContext, baseUrl?: string): HttpClient {
  return createHttpClient({ getAuthHeaders: ctx.getAuthHeaders, baseUrl });
}

/**
 * 消费方（`@g2-platform/pc-auth`、`@g2-shell/pc` 等）通过 `ctx.loadPlatform("httpPlatform", "client")`
 * 拿到的模块形状（即本文件通过 MF `./client` expose 出去的公开接口）。此前这个形状在两个消费方各自
 * 手写了一份完全相同的内联接口，两边独立维护，任一方改动都可能悄悄失配——审计已指出这个重复。
 * 现在统一从这里（唯一定义 `createHttpClientForPlatform` 的地方）用 `import type` 导出，消费方直接
 * `import type { HttpClientModule } from "@g2-platform/http/client"`。`import type` 编译期会被
 * 完全擦除，不产生任何运行时依赖，因此不违反"消费方不应对独立发版的 MF remote 产生构建期耦合"这条
 * 约束（该约束针对的是运行时值依赖，不是纯类型引用）。
 */
export interface HttpClientModule {
  createHttpClientForPlatform: typeof createHttpClientForPlatform;
}
