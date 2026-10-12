/**
 * pc-ai-assistant 经 ctx.loadPlatform("resourcePlatform","api") 绑定（ADR-0056）。
 */
import type { PlatformContext } from "@g2-composition/contract";
type ResourceApi = {
    resolveStaticResourceUrl: (pathOrUrl: string) => string;
    BIMOPS_AI_ENTRY_ICON: string;
};
export declare let BIMOPS_AI_ENTRY_ICON: string;
export declare function bindResourceApiFromModule(api: ResourceApi): void;
export declare function bindResourceApi(ctx: PlatformContext): Promise<void>;
export declare function resolveStaticResourceUrl(pathOrUrl: string): string;
export {};
//# sourceMappingURL=resource-api.d.ts.map