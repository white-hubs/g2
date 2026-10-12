/**
 * 静态资源 URL：接口与代码里写相对 `/resource/*`，部署时按可配置前缀改写到 CDN。
 *
 * 改写规则（与现网 CDN 一致）：`/resource/v1/foo` → `{base}/v1/foo`（剥掉 `/resource`）。
 * base 来自版本注册表逻辑名 `staticResourceBase`（ADR-0043/0048），经 Shell 启动时
 * `configureStaticResourceBase` 写入 `globalThis`，供各 MF remote 同读。
 */

export const STATIC_RESOURCE_PATH_PREFIX = "/resource";

const GLOBAL_BASE_KEY = "__G2_STATIC_RESOURCE_BASE__";

type GlobalWithResourceBase = typeof globalThis & {
  [GLOBAL_BASE_KEY]?: string;
};

function normalizeBase(baseUrl: string | undefined): string | undefined {
  if (baseUrl === undefined || baseUrl === "") {
    return undefined;
  }
  return baseUrl.replace(/\/+$/u, "");
}

/** Shell 启动时调用；空串/undefined 表示同源，不改写。 */
export function configureStaticResourceBase(baseUrl: string | undefined): void {
  const normalized = normalizeBase(baseUrl);
  const g = globalThis as GlobalWithResourceBase;
  if (normalized === undefined) {
    delete g[GLOBAL_BASE_KEY];
  } else {
    g[GLOBAL_BASE_KEY] = normalized;
  }
}

export function getConfiguredStaticResourceBase(): string | undefined {
  return (globalThis as GlobalWithResourceBase)[GLOBAL_BASE_KEY];
}

/**
 * 把 `/resource/...` 解析成最终可请求的 URL。
 * @param path 接口返回或代码中的资源路径
 * @param baseUrl 可选覆盖；省略则读 `configureStaticResourceBase` 的全局配置
 */
export function resolveStaticResourceUrl(path: string, baseUrl?: string): string {
  if (!path) {
    return path;
  }
  if (/^(?:https?:|data:|blob:)/iu.test(path)) {
    return path;
  }
  if (!path.startsWith(`${STATIC_RESOURCE_PATH_PREFIX}/`) && path !== STATIC_RESOURCE_PATH_PREFIX) {
    return path;
  }

  const base = baseUrl !== undefined ? normalizeBase(baseUrl) : getConfiguredStaticResourceBase();
  if (!base) {
    return path;
  }

  const suffix = path === STATIC_RESOURCE_PATH_PREFIX ? "" : path.slice(STATIC_RESOURCE_PATH_PREFIX.length);
  return `${base}${suffix}`;
}
