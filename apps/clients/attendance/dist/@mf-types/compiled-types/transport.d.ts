import type { PlatformContext } from "@g2-composition/contract";
import type { BaseAPIResult } from "@g2-contract/attendance";
export interface AttendanceHttpClient {
    get(url: string, init?: RequestInit): Promise<unknown>;
    post(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
    put(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
    delete(url: string, init?: RequestInit): Promise<unknown>;
}
export interface HttpClientModule {
    createHttpClientForPlatform(ctx: PlatformContext, baseUrl?: string): AttendanceHttpClient;
}
interface RequestOptions {
    params?: unknown;
    headers?: Record<string, string>;
}
/** 保留旧 Axios 查询语义：空串发送，空值忽略，数组以 key[] 重复传递。 */
export declare function attendanceUrl(path: string, params?: unknown): string;
export declare function createAttendanceTransport(http: AttendanceHttpClient): {
    Get: <T = unknown>(path: string, options?: RequestOptions) => Promise<BaseAPIResult<T>>;
    Post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) => Promise<BaseAPIResult<T>>;
    Put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) => Promise<BaseAPIResult<T>>;
    Delete: <T = unknown>(path: string, options?: RequestOptions) => Promise<BaseAPIResult<T>>;
    service: {
        get: (path: string, options?: RequestOptions) => Promise<BaseAPIResult<Blob>>;
        post: (path: string, body?: unknown, options?: RequestOptions) => Promise<BaseAPIResult<Blob>>;
    };
};
export type AttendanceTransport = ReturnType<typeof createAttendanceTransport>;
export {};
//# sourceMappingURL=transport.d.ts.map