import { BaseInterceptor, type Container, type Context } from "@dangao/bun-server";

import {
  CUBE_AUTH_PROXY_METADATA_KEY,
  CUBE_AUTH_PROXY_HEADERS_KEY,
  type CubeAuthProxyOptions,
  getCubeAuthProxyMetadata,
} from "../decorators/cube-auth-proxy.decorator";

/**
 * 认证代理拦截器
 * 在方法执行前从 Context 提取认证信息并存储到请求上下文中
 */
export class AuthProxyInterceptor extends BaseInterceptor {
  public override async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    // 获取装饰器元数据（先检查方法级别，再检查类级别）
    let options = this.getMetadata<CubeAuthProxyOptions>(target, propertyKey, CUBE_AUTH_PROXY_METADATA_KEY);

    // 如果方法级别没有，尝试从类级别获取
    if (options === undefined) {
      options = getCubeAuthProxyMetadata(target);
    }

    // 如果有装饰器，从 Context 提取认证信息并存储到本次请求的 Context 上
    if (options !== undefined && context) {
      // 从 Context 提取认证信息
      const authHeaders = this.extractAuthHeaders(context, options);

      // bun-server@1.2.x 会把 Context 放入 contextStore（AsyncLocalStorage），天然请求隔离
      (context as any)[CUBE_AUTH_PROXY_HEADERS_KEY] = authHeaders;
    }

    // 执行原方法
    return await Promise.resolve(originalMethod.apply(target, args));
  }

  /**
   * 从 Context 提取认证信息
   */
  private extractAuthHeaders(context: Context | undefined, options: CubeAuthProxyOptions): Record<string, string> {
    if (!context) {
      return {};
    }

    const headers: Record<string, string> = {};
    const defaultAuthHeaders = options.authHeaders || ["authorization", "tenant", "terminal"];

    // 提取默认认证 headers
    if (!options.skipDefaultAuth) {
      for (const headerName of defaultAuthHeaders) {
        const value = this.getHeader(context, headerName);
        if (value) {
          headers[headerName.toLowerCase()] = value;
        }
      }
    }

    // 处理自定义 authorization
    if (options.authorization) {
      const authValue = typeof options.authorization === "function" ? options.authorization(headers) : options.authorization;
      headers["authorization"] = authValue;
    }

    // 处理额外 headers
    if (options.extraHeaders) {
      for (const [key, value] of Object.entries(options.extraHeaders)) {
        headers[key.toLowerCase()] = typeof value === "function" ? value(headers) : value;
      }
    }

    return headers;
  }
}
