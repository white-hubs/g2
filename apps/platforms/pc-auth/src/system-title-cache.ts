import type { KeyValueStorage } from "./remember-me";

/**
 * 登录页/壳层系统标题本地缓存。
 *
 * TODO(ops-platform): 后续由 BFF 或运维管理平台（线上部署、版本等）下发 systemTitle；
 * 当前环境可由 nginx 注入固定值（见 `resolveSystemTitle` 的 `configured`），并回写缓存。
 */
export const SYSTEM_TITLE_STORAGE_KEY = "g2-pc-auth:system-title";

export function loadSystemTitle(storage: KeyValueStorage): string | null {
  const raw = storage.getItem(SYSTEM_TITLE_STORAGE_KEY);
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function saveSystemTitle(storage: KeyValueStorage, title: string): void {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return;
  }
  storage.setItem(SYSTEM_TITLE_STORAGE_KEY, trimmed);
}

export function resolveSystemTitle(storage: KeyValueStorage, options: { configured?: string; fallback: string }): string {
  const cached = loadSystemTitle(storage);
  if (cached) {
    return cached;
  }
  const configured = typeof options.configured === "string" ? options.configured.trim() : "";
  if (configured.length > 0) {
    return configured;
  }
  return options.fallback;
}
