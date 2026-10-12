/**
 * 认证代理元数据键
 */
export const CUBE_AUTH_PROXY_METADATA_KEY = Symbol("cube:auth:proxy");

/**
 * 在 bun-server 的 Context 上挂载“处理后的透传 headers”的 key（请求级）
 */
export const CUBE_AUTH_PROXY_HEADERS_KEY = Symbol("cube:auth:proxy-headers");

/**
 * 认证代理配置选项
 */
export interface CubeAuthProxyOptions {
  /**
   * 自定义 Authorization header 的值
   * 可以是字符串，或返回字符串的函数
   */
  authorization?: string | ((headers: Record<string, string>) => string);

  /**
   * 需要额外添加或修改的 headers
   */
  extraHeaders?: Record<string, string | ((headers: Record<string, string>) => string)>;

  /**
   * 是否跳过默认的认证透传
   */
  skipDefaultAuth?: boolean;

  /**
   * 需要透传的认证相关 headers（默认：authorization, tenant, terminal）
   */
  authHeaders?: string[];
}

/**
 * 认证代理装饰器
 * 用于标记需要透传认证信息的控制器或服务方法
 *
 * @param options - 配置选项
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * // 在 Controller 上使用
 * @Controller('/api/video-monitor')
 * @CubeAuthProxy() // 默认透传 authorization、tenant、terminal
 * export class VideoMonitorAuthController {
 *   // ...
 * }
 *
 * // 在 Service 方法上使用
 * @Injectable()
 * export class VideoMonitorProxyService {
 *   @CubeAuthProxy() // 该方法调用后端时会自动透传认证信息
 *   async createCameraAuth(data: any): Promise<any> {
 *     // ...
 *   }
 * }
 * ```
 */
export function CubeAuthProxy(options?: CubeAuthProxyOptions): ClassDecorator & MethodDecorator {
  return function (target: object, propertyKey?: string | symbol) {
    // 存储元数据
    if (propertyKey !== undefined) {
      Reflect.defineMetadata(CUBE_AUTH_PROXY_METADATA_KEY, options || {}, target, propertyKey);
    } else {
      Reflect.defineMetadata(CUBE_AUTH_PROXY_METADATA_KEY, options || {}, target);
    }
  };
}

/**
 * 获取认证代理元数据
 */
export function getCubeAuthProxyMetadata(target: unknown, propertyKey?: string | symbol): CubeAuthProxyOptions | undefined {
  if (typeof target !== "object" || target === null) {
    return undefined;
  }

  // 首先尝试直接从 target 获取（如果 target 是原型）
  let metadata = Reflect.getMetadata(CUBE_AUTH_PROXY_METADATA_KEY, target, propertyKey as string | symbol) as
    | CubeAuthProxyOptions
    | undefined;

  if (metadata !== undefined) {
    return metadata;
  }

  // 如果 target 是实例，尝试从原型获取
  const prototype = Object.getPrototypeOf(target);
  if (prototype && prototype !== Object.prototype) {
    metadata = Reflect.getMetadata(CUBE_AUTH_PROXY_METADATA_KEY, prototype, propertyKey as string | symbol) as
      | CubeAuthProxyOptions
      | undefined;
    if (metadata !== undefined) {
      return metadata;
    }
  }

  // 如果仍然找不到，尝试从构造函数原型获取
  if (propertyKey !== undefined) {
    const constructor = (target as any).constructor;
    if (constructor && typeof constructor === "function") {
      if (target !== constructor.prototype) {
        const key = propertyKey as string | symbol;
        metadata = Reflect.getMetadata(CUBE_AUTH_PROXY_METADATA_KEY, constructor.prototype, key) as CubeAuthProxyOptions | undefined;
        if (metadata !== undefined) {
          return metadata;
        }
      }
    }
  }

  return undefined;
}
