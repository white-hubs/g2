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
export function attendanceUrl(path: string, params?: unknown): string {
  const url = path.startsWith("/api/") ? path : `/api/${path.replace(/^\//u, "")}`;
  if (!params || typeof params !== "object") {
    return url;
  }
  const search = new URLSearchParams();
  const append = (key: string, value: unknown): void => {
    if (value === undefined || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => append(`${key}[]`, item));
    } else if (value instanceof Date) {
      search.append(key, value.toISOString());
    } else if (typeof value === "object") {
      Object.entries(value).forEach(([childKey, childValue]) => append(`${key}[${childKey}]`, childValue));
    } else {
      search.append(key, String(value));
    }
  };
  Object.entries(params).forEach(([key, value]) => append(key, value));
  return search.size > 0 ? `${url}${url.includes("?") ? "&" : "?"}${search}` : url;
}

/** 领域保留旧 {code, data} 协议，Blob 下载也保持通过 data 读取。 */
function envelope<T>(response: unknown): BaseAPIResult<T> {
  if (response !== null && typeof response === "object" && "code" in response && "data" in response) {
    return response as BaseAPIResult<T>;
  }
  return { code: 200, data: response as T, message: "success", error: null, timestamp: Date.now() };
}

function requestInit(options?: RequestOptions): RequestInit | undefined {
  if (!options?.headers) {
    return undefined;
  }
  // FormData 的 boundary 必须交由浏览器生成，不能沿用 Axios 的自动序列化请求头。
  const headers = Object.fromEntries(Object.entries(options.headers).filter(([key]) => key.toLowerCase() !== "content-type"));
  return Object.keys(headers).length > 0 ? { headers } : undefined;
}

function requestBody(body: unknown, options?: RequestOptions): unknown {
  const multipart = Object.entries(options?.headers ?? {}).some(
    ([key, value]) => key.toLowerCase() === "content-type" && value.includes("multipart/form-data"),
  );
  if (!multipart || body instanceof FormData || !body || typeof body !== "object") {
    return body;
  }
  const form = new FormData();
  Object.entries(body).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }
    form.append(key, value instanceof Blob ? value : String(value));
  });
  return form;
}

export function createAttendanceTransport(http: AttendanceHttpClient) {
  const Get = async <T = unknown>(path: string, options?: RequestOptions): Promise<BaseAPIResult<T>> =>
    envelope<T>(await http.get(attendanceUrl(path, options?.params), requestInit(options)));
  const Post = async <T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<BaseAPIResult<T>> =>
    envelope<T>(await http.post(attendanceUrl(path, options?.params), requestBody(body, options), requestInit(options)));
  const Put = async <T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<BaseAPIResult<T>> =>
    envelope<T>(await http.put(attendanceUrl(path, options?.params), requestBody(body, options), requestInit(options)));
  const Delete = async <T = unknown>(path: string, options?: RequestOptions): Promise<BaseAPIResult<T>> =>
    envelope<T>(await http.delete(attendanceUrl(path, options?.params), requestInit(options)));
  const assertDownload = (result: BaseAPIResult<unknown>): BaseAPIResult<Blob> => {
    if (!(result.data instanceof Blob)) {
      throw new Error(result.message || "导出失败：响应不是文件流");
    }
    return { ...result, data: result.data };
  };
  const service = {
    get: async (path: string, options?: RequestOptions) => assertDownload(await Get(path, options)),
    post: async (path: string, body?: unknown, options?: RequestOptions) => assertDownload(await Post(path, body, options)),
  };
  return { Get, Post, Put, Delete, service };
}

export type AttendanceTransport = ReturnType<typeof createAttendanceTransport>;
