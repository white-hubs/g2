import type { DomainContext } from "@g2-composition/contract";

/**
 * 经 ctx.loadPlatform("resourcePlatform","api") 绑定（ADR-0056）。
 * 用于解析应用图标等 `/resource/*` 静态资源 CDN 地址（图片类）。
 * Cube iconfont 精灵由壳托管，不走此改写。
 */
type ResourceApi = {
  resolveStaticResourceUrl: (pathOrUrl: string) => string;
};

let resourceApi: ResourceApi | undefined;

export async function bindWorkbenchResourceApi(ctx: DomainContext): Promise<void> {
  resourceApi = (await ctx.loadPlatform("resourcePlatform", "api")) as ResourceApi;
}

/**
 * 未绑定时原样返回（同源 /resource）；壳层已 configureStaticResourceBase 时由 platform 改写 CDN。
 */
export function resolveStaticResourceUrl(pathOrUrl: string): string {
  if (!pathOrUrl) {
    return pathOrUrl;
  }
  if (!resourceApi) {
    return pathOrUrl;
  }
  return resourceApi.resolveStaticResourceUrl(pathOrUrl);
}
