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
/** 绑定后填充；组件 import 的是 live binding。 */
export declare let BIMOPS_CUBE_ICON: string;
export declare let BIMOPS_ICON_SEARCH: string;
export declare let BIMOPS_ICON_SKIN: string;
export declare function bindResourceApiFromModule(api: ResourceApi): void;
export declare function bindResourceApi(ctx: PlatformContext): Promise<void>;
export declare function resolveStaticResourceUrl(pathOrUrl: string): string;
export declare function configureStaticResourceBase(baseUrl: string | undefined): void;
export {};
//# sourceMappingURL=resource-api.d.ts.map