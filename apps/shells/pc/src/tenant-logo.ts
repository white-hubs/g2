import { resolveStaticResourceUrl } from "./library-platform-apis";

/**
 * 租户 Logo：对齐旧仓 tenant-logo.vue
 * - `GET /api/ouaa/tenant-under-tenant/{tenantCode}` → logoId
 * - `GET /api/file/file/{logoId}` → path（多为 `/resource/...` 或可解析的相对路径）
 */

export interface TenantUnderTenantInfo {
  logoId?: unknown;
  data?: unknown;
}

export interface FilePathInfo {
  path?: unknown;
  data?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** 兼容 `{ code:200, data }` 与直接对象。 */
export function unwrapBusinessPayload(body: unknown): Record<string, unknown> | null {
  const top = asRecord(body);
  if (!top) {
    return null;
  }
  const nested = asRecord(top.data);
  if (nested && (top.code === 200 || top.code === "200" || nested.logoId !== undefined || nested.path !== undefined)) {
    return nested;
  }
  return top;
}

export function logoIdFromTenantInfo(info: TenantUnderTenantInfo | null | undefined): string {
  const payload = unwrapBusinessPayload(info);
  const logoId = payload?.logoId;
  return typeof logoId === "string" && logoId.trim() ? logoId.trim() : typeof logoId === "number" ? String(logoId) : "";
}

/** 从文件接口取出 path，并改写为可请求的静态资源 URL；无效则空串。 */
export function logoUrlFromFileInfo(info: FilePathInfo | null | undefined): string {
  const payload = unwrapBusinessPayload(info);
  const raw = payload?.path;
  if (typeof raw !== "string" || !raw.trim()) {
    return "";
  }
  const cleaned = raw.replaceAll("null", "").trim();
  if (!cleaned) {
    return "";
  }
  const path = cleaned.startsWith("/") || /^(?:https?:|data:|blob:)/iu.test(cleaned) ? cleaned : `/${cleaned}`;
  return resolveStaticResourceUrl(path);
}
