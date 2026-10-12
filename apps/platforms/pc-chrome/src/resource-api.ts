/**
 * pc-chrome 经 ctx.loadPlatform("resourcePlatform","api") 绑定（ADR-0056）。
 */
import type { PlatformContext } from "@g2-composition/contract";

type ResourceApi = {
  configureStaticResourceBase: (baseUrl: string | undefined) => void;
  resolveStaticResourceUrl: (pathOrUrl: string) => string;
  BIMOPS_CUBE_ICON: string;
  BIMOPS_ICON_SEARCH: string;
  BIMOPS_ICON_SKIN: string;
};

let resourceApi: ResourceApi | undefined;

/** 绑定后填充；组件 import 的是 live binding。 */
export let BIMOPS_CUBE_ICON = "";
export let BIMOPS_ICON_SEARCH = "";
export let BIMOPS_ICON_SKIN = "";

export function bindResourceApiFromModule(api: ResourceApi): void {
  resourceApi = api;
  BIMOPS_CUBE_ICON = api.BIMOPS_CUBE_ICON;
  BIMOPS_ICON_SEARCH = api.BIMOPS_ICON_SEARCH;
  BIMOPS_ICON_SKIN = api.BIMOPS_ICON_SKIN;
}

export async function bindResourceApi(ctx: PlatformContext): Promise<void> {
  bindResourceApiFromModule((await ctx.loadPlatform("resourcePlatform", "api")) as ResourceApi);
}

function requireApi(): ResourceApi {
  if (!resourceApi) {
    throw new Error("resourcePlatform API not bound; call bindResourceApi in platform install (ADR-0056)");
  }
  return resourceApi;
}

export function resolveStaticResourceUrl(pathOrUrl: string): string {
  return requireApi().resolveStaticResourceUrl(pathOrUrl);
}

export function configureStaticResourceBase(baseUrl: string | undefined): void {
  requireApi().configureStaticResourceBase(baseUrl);
}
