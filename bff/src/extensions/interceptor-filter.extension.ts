import { type Container, INTERCEPTOR_REGISTRY_TOKEN, type InterceptorRegistry, ExceptionFilterRegistry } from "@dangao/bun-server";

import { CUBE_AUTH_PROXY_METADATA_KEY } from "../decorators/cube-auth-proxy.decorator";
import { ResponsePassthroughFilter } from "../filters/response-passthrough.filter";
import { AuthProxyInterceptor } from "../interceptors/auth-proxy.interceptor";

/**
 * 应用扩展接口（与 bun-server 的 ApplicationExtension 保持一致）
 */
interface ApplicationExtension {
  register(container: Container): void;
}

/**
 * 拦截器和过滤器扩展
 * 统一注册拦截器和异常过滤器
 */
export class InterceptorFilterExtension implements ApplicationExtension {
  public register(container: Container): void {
    // 注册拦截器
    const interceptorRegistry = container.resolve<InterceptorRegistry>(INTERCEPTOR_REGISTRY_TOKEN);
    interceptorRegistry.register(
      CUBE_AUTH_PROXY_METADATA_KEY,
      new AuthProxyInterceptor(),
      100, // 高优先级，确保在其他拦截器之前执行
    );

    // 注册异常过滤器
    // 用于处理透明代理场景：当 ProxyClient 抛出 Response 对象时，原样返回给客户端
    const exceptionFilterRegistry = ExceptionFilterRegistry.getInstance();
    exceptionFilterRegistry.register(new ResponsePassthroughFilter());
  }
}
