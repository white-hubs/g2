import type { KeyValueStorage } from "./remember-me";
/**
 * 登录页/壳层系统标题本地缓存。
 *
 * TODO(ops-platform): 后续由 BFF 或运维管理平台（线上部署、版本等）下发 systemTitle；
 * 当前环境可由 nginx 注入固定值（见 `resolveSystemTitle` 的 `configured`），并回写缓存。
 */
export declare const SYSTEM_TITLE_STORAGE_KEY = "g2-pc-auth:system-title";
export declare function loadSystemTitle(storage: KeyValueStorage): string | null;
export declare function saveSystemTitle(storage: KeyValueStorage, title: string): void;
export declare function resolveSystemTitle(storage: KeyValueStorage, options: {
    configured?: string;
    fallback: string;
}): string;
//# sourceMappingURL=system-title-cache.d.ts.map