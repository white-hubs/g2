import type { Router } from "vue-router";

/**
 * 登录成功跳转逃生门，迁移自旧仓
 * `legacy/bimops-fe-web-migrate/src/views/login/utils/login-success-redirect.js`。
 *
 * **不迁移的部分（有意排除，不是遗漏）**：旧仓的 `appendCubeSecretToUrlIfPossible` 会在跳转到完整
 * http(s) URL（跨端口子应用）前，动态 import `@ghcloud/cube-auth-service`/`@ghcloud/cube-protocol`/
 * `@ghcloud/cube-mf-root` 换取一个 `cube-secret` 拼进目标 URL，供旧仓多端口 qiankun 子应用架构
 * 恢复会话。ADR-0001 明确禁止 g2 仓库任何代码依赖 `@ghcloud/*`；同时 g2 本身是单页应用
 * （没有旧仓那种"每个子应用独立端口、需要通过 URL 参数传递鉴权态"的架构问题），本来就不需要
 * 这个机制的等价物，不是"少做了一步"。
 *
 * **迁移的部分**：同应用内路径跳转（`router.replace`）+ 粮仓全屏路由自动补 `isFullWindow=1` 查询
 * 参数（`isGranaryPortalFullWindowPath`/`searchParamsImplyFullWindow` 两个纯函数，逻辑与旧仓
 * 100% 一致，因为它们本身不依赖任何 `@ghcloud/*` 包）。
 *
 * 签名调整为同步 `void`（旧仓是 `async`，因为要等 `appendCubeSecretToUrlIfPossible` 的动态
 * import+接口调用）——去掉那部分逻辑后，剩下的分支都不需要 `await`。
 *
 * `assignLocation` 默认指向真实的 `window.location.assign`，允许测试注入替身——`bun:test`
 * 环境没有 `window`（不是 jsdom），如果直接硬编码调用全局 `window.location.assign` 会导致这条分支
 * 完全没法用 `bun test` 覆盖，只能退化成"看起来测了但其实没测到"。
 */
export function redirectAfterLogin(
  pathOrUrl: string,
  router: Router,
  assignLocation: (url: string) => void = (url) => {
    window.location.assign(url);
  },
): void {
  if (pathOrUrl === "") {
    return;
  }
  if (/^https?:\/\//i.test(pathOrUrl)) {
    assignLocation(ensureGranaryPortalFullWindowQueryOnUrl(pathOrUrl));
    return;
  }
  const normalized = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  void router.replace(toSpaReplaceLocation(normalized));
}

/**
 * 与粮仓子应用 `meta.isFullWindow` 约定一致的路径（仅 portal 粮仓），原样迁移自旧仓同名函数。
 */
export function isGranaryPortalFullWindowPath(pathname: string): boolean {
  if (!pathname.includes("/portal/granary-management")) {
    return false;
  }
  if (pathname.includes("/main-management/warehouse-detail")) {
    return true;
  }
  if (pathname.endsWith("/statistical-panel")) {
    return true;
  }
  if (pathname.endsWith("/granary-platform-hub")) {
    return true;
  }
  return false;
}

export function searchParamsImplyFullWindow(params: URLSearchParams): boolean {
  const raw = params.get("isFullWindow");
  if (raw === null) {
    return false;
  }
  return raw === "1" || raw === "true";
}

function toSpaReplaceLocation(pathWithOptionalQuery: string): { path: string; query?: Record<string, string> } {
  const queryIndex = pathWithOptionalQuery.indexOf("?");
  const pathOnly = queryIndex !== -1 ? pathWithOptionalQuery.slice(0, queryIndex) : pathWithOptionalQuery;
  const search = queryIndex !== -1 ? pathWithOptionalQuery.slice(queryIndex + 1) : "";
  const params = search === "" ? new URLSearchParams() : new URLSearchParams(search);
  if (isGranaryPortalFullWindowPath(pathOnly) && !searchParamsImplyFullWindow(params)) {
    params.set("isFullWindow", "1");
  }
  const query = Object.fromEntries(params);
  if (Object.keys(query).length === 0) {
    return { path: pathOnly };
  }
  return { path: pathOnly, query };
}

function ensureGranaryPortalFullWindowQueryOnUrl(href: string): string {
  try {
    const url = new URL(href);
    if (!isGranaryPortalFullWindowPath(url.pathname)) {
      return href;
    }
    if (searchParamsImplyFullWindow(url.searchParams)) {
      return href;
    }
    url.searchParams.set("isFullWindow", "1");
    return url.toString();
  } catch {
    return href;
  }
}
