/**
 * HTTP 业务错误：本包只规范化并抛出，**不**负责 UI。
 *
 * TODO(migration · UX)：旧仓 axios 拦截器常对网关 503（如
 * `Unable to find instance for todoCenter`）直接 `message.error` 弹窗——那是子应用/旧基建，
 * 非 Shell / `@g2-platform/http`。迁相关域时勿复刻全局 toast；可选由壳或 pc-chrome
 * 顶部轻量横幅提示「部分服务重连中」等，避免叠多条侵入式弹窗。
 */
export declare class HttpServiceError extends Error {
    readonly httpStatus: number;
    readonly errorCode: string;
    readonly errorMessage: string;
    readonly errorDetail: unknown;
    constructor(httpStatus: number, errorCode: string, errorMessage: string, errorDetail: unknown);
}
export declare function normalizeErrorResponse(httpStatus: number, body: unknown): HttpServiceError;
//# sourceMappingURL=errors.d.ts.map