import { type Middleware } from "./middleware";
export interface HttpClient {
    get: (url: string, init?: RequestInit) => Promise<unknown>;
    post: (url: string, body?: unknown, init?: RequestInit) => Promise<unknown>;
    put: (url: string, body?: unknown, init?: RequestInit) => Promise<unknown>;
    patch: (url: string, body?: unknown, init?: RequestInit) => Promise<unknown>;
    delete: (url: string, init?: RequestInit) => Promise<unknown>;
}
export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export interface CreateHttpClientOptions {
    fetchImpl?: FetchLike;
    getAuthHeaders: () => Record<string, string>;
    baseUrl?: string;
    middlewares?: Middleware[];
}
/**
 * 鉴权头注入不走 Web 标准 Headers/Request 往返——`Headers` 在读取时会把 header 名统一小写，
 * 会破坏调用方约定的大小写（如 `Authorization`）。这里直接维护一份 plain object，
 * 在每次请求时重新调用 `getAuthHeaders()`（不缓存，ADR-0046），再交给 `fetchImpl` 派发。
 */
export declare function createHttpClient(options: CreateHttpClientOptions): HttpClient;
//# sourceMappingURL=create-http-client.d.ts.map