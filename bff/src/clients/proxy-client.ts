import { CONTEXT_SERVICE_TOKEN, type ContextService, Inject, Injectable } from "@dangao/bun-server";

import { CUBE_AUTH_PROXY_HEADERS_KEY } from "../decorators/cube-auth-proxy.decorator";

/**
 * HTTP 请求选项
 */
export interface ProxyRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  /**
   * 请求体。普通对象会在 request 内按 JSON 统一序列化。
   */
  body?: unknown;

  /**
   * 请求超时时间（毫秒）
   * @default 5000
   */
  timeout?: number;

  /**
   * 是否自动解析 JSON 响应
   * @default true
   */
  parseJson?: boolean;

  /**
   * 响应解析类型
   * @default 'json'
   */
  responseType?: "json" | "text" | "arrayBuffer";

  /**
   * 当上游返回非 2xx 时，是否直接把上游 Response 作为异常抛出
   * 以便被 bun-server 的全局错误处理中间件捕获并原样返回给前端（status/headers/body 不变）。
   *
   * 注意：
   * - 这不同于 `proxy()`：`proxy()` 是“成功返回 Response”，而这里是“抛出 Response”走全局异常链路。
   * - 仅对上游 4xx/5xx 生效；网络异常/超时没有 Response 仍会抛出 Error。
   *
   * @default false
   */
  passthroughError?: boolean;

  /**
   * 是否自动添加认证 headers
   * @default true
   */
  useAuth?: boolean;

  /**
   * 额外的 headers（会与认证 headers 合并）
   */
  headers?: Record<string, string> | Headers;
}

/**
 * HTTP 响应结果
 */
export interface ProxyResponse<T = unknown> {
  /**
   * 响应数据
   */
  data: T;

  /**
   * HTTP 状态码
   */
  status: number;

  /**
   * HTTP 状态文本
   */
  statusText: string;

  /**
   * 响应头
   */
  headers: Headers;
}

/**
 * 代理客户端
 * 封装 Bun 的 fetch API，提供统一的 HTTP 请求能力
 * - 自动透传认证信息（仅在 @CubeAuthProxy 命中时写入 Context）
 * - 支持请求/响应拦截
 * - 统一的错误处理
 * - 自动 JSON 解析
 */
@Injectable()
export class ProxyClient {
  /**
   * 默认请求超时时间（毫秒）
   */
  private readonly defaultTimeout = 1000 * 60;

  public constructor(@Inject(CONTEXT_SERVICE_TOKEN) private readonly contextService: ContextService) {}

  /**
   * 通用请求方法
   * @param url - 请求 URL
   * @param options - 请求选项
   * @returns 响应结果
   */
  async request<T = unknown>(url: string, options: ProxyRequestOptions = {}): Promise<ProxyResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      parseJson = true,
      responseType,
      passthroughError = false,
      useAuth = true,
      headers: customHeaders = {},
      ...fetchOptions
    } = options;

    // 构建 headers
    const headers = new Headers();
    if (customHeaders instanceof Headers) {
      // 使用 entries() 方法遍历 Headers
      const entriesFn = (customHeaders as any).entries as () => IterableIterator<[string, string]>;
      const entries = entriesFn.call(customHeaders);
      for (const [key, value] of entries) {
        headers.set(key, value);
      }
    } else if (typeof customHeaders === "object" && customHeaders !== null) {
      for (const [key, value] of Object.entries(customHeaders)) {
        if (value) {
          headers.set(key, String(value));
        }
      }
    }

    // 自动添加认证 headers（仅在 @CubeAuthProxy 命中时，拦截器会写入 Context）

    if (useAuth) {
      const context = this.contextService.getContext();
      const authHeaders = context ? ((context as any)[CUBE_AUTH_PROXY_HEADERS_KEY] as Record<string, string> | undefined) : undefined;
      if (authHeaders) {
        for (const [key, value] of Object.entries(authHeaders)) {
          headers.set(key, value);
        }
      }
    }

    const isFormDataBody = typeof FormData !== "undefined" && fetchOptions.body instanceof FormData;

    // 设置 Content-Type（如果未设置且有 body）。FormData 需要保留运行时自动生成的 boundary。
    if (fetchOptions.body && !headers.has("Content-Type") && !isFormDataBody) {
      headers.set("Content-Type", "application/json");
    }

    if (
      fetchOptions.body &&
      headers.get("Content-Type") === "application/json" &&
      !isFormDataBody &&
      typeof fetchOptions.body !== "string"
    ) {
      fetchOptions.body = JSON.stringify(fetchOptions.body);
    }

    // 执行请求（带超时控制）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        body: fetchOptions.body as RequestInit["body"],
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 处理错误状态码
      if (!response.ok) {
        if (passthroughError) {
          // 抛出 Response 对象，由 ExceptionFilterRegistry 中的 ResponsePassthroughFilter 捕获
          // 并原样返回给客户端（status/headers/body 不变），实现透明代理
          throw response;
        }
        await this.handleErrorResponse(response);
      }

      // 解析响应
      let data: T;
      const resolvedResponseType = responseType ?? (parseJson ? "json" : "text");
      if (resolvedResponseType === "arrayBuffer") {
        data = (await response.arrayBuffer()) as T;
      } else if (resolvedResponseType === "json") {
        const contentType = response.headers.get("Content-Type");
        if (contentType?.includes("application/json")) {
          data = (await response.json()) as T;
        } else {
          data = (await response.text()) as T;
        }
      } else {
        data = (await response.text()) as T;
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      // 处理超时错误
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`[gw-bff] Request timeout after ${timeout}ms`, { cause: error });
      }

      throw error;
    }
  }

  /**
   * 原始 GET：成功时返回上游 Response（不解析 body），用于文件流透传
   */
  async fetchRaw(url: string, options: Omit<ProxyRequestOptions, "parseJson"> = {}): Promise<Response> {
    const {
      timeout = this.defaultTimeout,
      passthroughError = false,
      useAuth = true,
      headers: customHeaders = {},
      ...fetchOptions
    } = options;

    const headers = new Headers();
    if (customHeaders instanceof Headers) {
      const entriesFn = (customHeaders as Headers).entries.bind(customHeaders);
      for (const [key, value] of entriesFn()) {
        headers.set(key, value);
      }
    } else if (typeof customHeaders === "object" && customHeaders !== null) {
      for (const [key, value] of Object.entries(customHeaders)) {
        if (value) {
          headers.set(key, String(value));
        }
      }
    }

    if (useAuth) {
      const context = this.contextService.getContext();
      const authHeaders = context ? ((context as any)[CUBE_AUTH_PROXY_HEADERS_KEY] as Record<string, string> | undefined) : undefined;
      if (authHeaders) {
        for (const [key, value] of Object.entries(authHeaders)) {
          headers.set(key, value);
        }
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        body: fetchOptions.body as RequestInit["body"],
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (passthroughError) {
          throw response;
        }
        await this.handleErrorResponse(response);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`[gw-bff] Request timeout after ${timeout}ms`, { cause: error });
      }
      throw error;
    }
  }

  /**
   * GET 请求
   */
  async get<T = unknown>(url: string, options?: Omit<ProxyRequestOptions, "method" | "body">): Promise<ProxyResponse<T>> {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  /**
   * POST 请求
   */
  async post<T = unknown>(url: string, data?: unknown, options?: Omit<ProxyRequestOptions, "method" | "body">): Promise<ProxyResponse<T>> {
    const body = typeof data === "string" ? data : JSON.stringify(data ?? {});
    return this.request<T>(url, { ...options, method: "POST", body });
  }

  /**
   * PUT 请求
   */
  async put<T = unknown>(url: string, data?: unknown, options?: Omit<ProxyRequestOptions, "method" | "body">): Promise<ProxyResponse<T>> {
    const body = typeof data === "string" ? data : JSON.stringify(data ?? {});
    return this.request<T>(url, { ...options, method: "PUT", body });
  }

  /**
   * DELETE 请求
   */
  async delete<T = unknown>(url: string, options?: Omit<ProxyRequestOptions, "method" | "body">): Promise<ProxyResponse<T>> {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }

  /**
   * PATCH 请求
   */
  async patch<T = unknown>(url: string, data?: unknown, options?: Omit<ProxyRequestOptions, "method" | "body">): Promise<ProxyResponse<T>> {
    const body = typeof data === "string" ? data : JSON.stringify(data ?? {});
    return this.request<T>(url, { ...options, method: "PATCH", body });
  }

  /**
   * 处理错误响应
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;

    try {
      const contentType = response.headers.get("Content-Type");
      if (contentType?.includes("application/json")) {
        const errorData = (await response.json()) as {
          message?: string;
          error?: string;
        };
        errorMessage = errorData?.message || errorData?.error || errorMessage;
      } else {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      }
    } catch {
      // 忽略解析错误，使用默认错误消息
    }

    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    (error as any).response = response;
    throw error;
  }
}
