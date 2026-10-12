import { normalizeErrorResponse } from "./errors";
import { type Middleware, type NextFn, composeMiddleware } from "./middleware";

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

function resolveUrl(baseUrl: string | undefined, url: string): string {
  if (!baseUrl || /^https?:\/\//u.test(url)) {
    return url;
  }
  return `${baseUrl}${url}`;
}

function toPlainHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  return Array.isArray(headers) ? Object.fromEntries(headers) : { ...headers };
}

/**
 * 鉴权头注入不走 Web 标准 Headers/Request 往返——`Headers` 在读取时会把 header 名统一小写，
 * 会破坏调用方约定的大小写（如 `Authorization`）。这里直接维护一份 plain object，
 * 在每次请求时重新调用 `getAuthHeaders()`（不缓存，ADR-0046），再交给 `fetchImpl` 派发。
 */
export function createHttpClient(options: CreateHttpClientOptions): HttpClient {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request(method: string, url: string, body?: unknown, init?: RequestInit): Promise<unknown> {
    const requestHeaders = toPlainHeaders(init?.headers);
    const headers: Record<string, string> = { ...requestHeaders, ...options.getAuthHeaders() };
    // 跨医院业务查询以用户在页面选择的租户为准；令牌仍由全局鉴权上下文提供。
    if (requestHeaders.tenant !== undefined) headers.tenant = requestHeaders.tenant;
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    if (body !== undefined && !isFormData) {
      headers["content-type"] = "application/json";
    }
    const requestBody = body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body);
    const resolvedUrl = resolveUrl(options.baseUrl, url);

    const finalHandler: NextFn = async (finalRequest) =>
      fetchImpl(finalRequest.url, { method: finalRequest.method, headers, body: requestBody });

    const pipeline = composeMiddleware(options.middlewares ?? [], finalHandler);
    const req = new Request(resolvedUrl, { ...init, method, headers, body: requestBody });
    const response = await pipeline(req);

    const contentType = response.headers.get("content-type") ?? "";
    const contentDisposition = response.headers.get("content-disposition") ?? "";
    const binary =
      contentDisposition.toLowerCase().includes("attachment") ||
      contentType.includes("application/octet-stream") ||
      contentType.includes("application/vnd.ms-excel") ||
      contentType.includes("application/vnd.openxmlformats-officedocument");
    const parsed = contentType.includes("application/json")
      ? await response.json()
      : binary
        ? await response.blob()
        : await response.text();
    if (!response.ok) {
      throw normalizeErrorResponse(response.status, parsed);
    }
    return parsed;
  }

  return {
    get: (url, init) => request("GET", url, undefined, init),
    post: (url, body, init) => request("POST", url, body, init),
    put: (url, body, init) => request("PUT", url, body, init),
    patch: (url, body, init) => request("PATCH", url, body, init),
    delete: (url, init) => {
      // 兼容「DELETE + JSON body」（如 securitymanagement 条件清空）；body 走 request 序列化。
      if (init?.body != null) {
        const raw = init.body;
        const parsed =
          typeof raw === "string"
            ? (() => {
                try {
                  return JSON.parse(raw) as unknown;
                } catch {
                  return raw;
                }
              })()
            : raw;
        const { body: _ignored, ...rest } = init;
        return request("DELETE", url, parsed, rest);
      }
      return request("DELETE", url, undefined, init);
    },
  };
}
