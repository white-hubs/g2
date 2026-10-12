/**
 * 静态资源 URL：接口与代码里写相对 `/resource/*`，部署时按可配置前缀改写到 CDN。
 *
 * 改写规则（与现网 CDN 一致）：`/resource/v1/foo` → `{base}/v1/foo`（剥掉 `/resource`）。
 * base 来自版本注册表逻辑名 `staticResourceBase`（ADR-0043/0048），经 Shell 启动时
 * `configureStaticResourceBase` 写入 `globalThis`，供各 MF remote 同读。
 */
export declare const STATIC_RESOURCE_PATH_PREFIX = "/resource";
/** Shell 启动时调用；空串/undefined 表示同源，不改写。 */
export declare function configureStaticResourceBase(baseUrl: string | undefined): void;
export declare function getConfiguredStaticResourceBase(): string | undefined;
/**
 * 把 `/resource/...` 解析成最终可请求的 URL。
 * @param path 接口返回或代码中的资源路径
 * @param baseUrl 可选覆盖；省略则读 `configureStaticResourceBase` 的全局配置
 */
export declare function resolveStaticResourceUrl(path: string, baseUrl?: string): string;
//# sourceMappingURL=resolve-static-resource-url.d.ts.map