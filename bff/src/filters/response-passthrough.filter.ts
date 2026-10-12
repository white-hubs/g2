import { ExceptionFilterRegistry, type ExceptionFilter, type Context } from "@dangao/bun-server";

/**
 * Response 透传异常过滤器
 *
 * 当上游服务返回非 2xx 响应时，ProxyClient 会抛出 Response 对象。
 * 此过滤器捕获 Response 类型的错误，并原样返回给客户端（status/headers/body 不变）。
 */
export class ResponsePassthroughFilter implements ExceptionFilter {
  public catch(error: unknown, _context: Context): Response | undefined {
    // 如果错误是 Response 对象（上游服务返回的非 2xx 响应），直接原样返回
    if (error instanceof Response) {
      return error as Response;
    }
    // 返回 undefined 表示不处理，交给后续过滤器或默认处理
    return undefined;
  }
}

/**
 * 注册 Response 透传过滤器
 * 应该在应用启动时调用，确保透明代理功能正常工作
 */
export function registerResponsePassthroughFilter(): void {
  const registry = ExceptionFilterRegistry.getInstance();
  registry.register(new ResponsePassthroughFilter());
}
