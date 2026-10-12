import { getWorkbenchContext } from "../domain-context";

export type NavigateIntentParams = {
  appCode?: string;
  entry?: string;
  query?: Record<string, string>;
};

/**
 * 跨应用跳转：对齐旧仓 MF_ROOT_TO_APPLICATION，改走门面 navigate-intent。
 *
 * ADR-0059：有 code 时壳忽略 path。遗留 `/portal/...` 深链（带 query 或子路径）
 * 若仍带 code，筛选/详情会丢；此时改发纯 path，保留目标页。
 */
export function navigateToApplication(payload: { code?: string; path?: string; params?: NavigateIntentParams }): void {
  const code = payload.code?.trim();
  const path = payload.path?.trim();
  const params = payload.params;

  if (path?.startsWith("/portal/") && isLegacyPortalDeepLink(path)) {
    getWorkbenchContext().bus.publish("navigate-intent", { path });
    return;
  }

  getWorkbenchContext().bus.publish("navigate-intent", {
    ...(code ? { code } : {}),
    ...(path ? { path } : {}),
    ...(params ? { params } : {}),
  });
}

/** `/portal/app` 根入口不算深链；带 `?` 或更深路径才需要保留 path。 */
function isLegacyPortalDeepLink(path: string): boolean {
  if (path.includes("?")) {
    return true;
  }
  const segments = path.split("/").filter(Boolean);
  // portal / appCode / page... → 至少 3 段
  return segments.length >= 3;
}
