/**
 * pc-ai-assistant 经 ctx.loadPlatform("resourcePlatform","api") 绑定（ADR-0056）。
 */
import type { PlatformContext } from "@g2-composition/contract";

type ResourceApi = {
  resolveStaticResourceUrl: (pathOrUrl: string) => string;
  BIMOPS_AI_ENTRY_ICON: string;
};

let resourceApi: ResourceApi | undefined;
export let BIMOPS_AI_ENTRY_ICON = "";

export function bindResourceApiFromModule(api: ResourceApi): void {
  resourceApi = api;
  BIMOPS_AI_ENTRY_ICON = api.BIMOPS_AI_ENTRY_ICON;
}

export async function bindResourceApi(ctx: PlatformContext): Promise<void> {
  bindResourceApiFromModule((await ctx.loadPlatform("resourcePlatform", "api")) as ResourceApi);
}

export function resolveStaticResourceUrl(pathOrUrl: string): string {
  if (!resourceApi) {
    throw new Error("resourcePlatform API not bound; call bindResourceApi in platform install (ADR-0056)");
  }
  return resourceApi.resolveStaticResourceUrl(pathOrUrl);
}
