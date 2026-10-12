/**
 * 用户资料显示名：对齐旧仓 user-dropdown（`userInfo.name || userInfo.username`）。
 * 接口：`GET /api/ouaa/context/user`（见旧仓多处 `userInfo(..., "get")`；axios 拦截器在 code===200 时解包 data）。
 * JWT 亦含 `name`（展示名）与 `user_name`（多为手机号）——顶栏应优先 `name`。
 */

export interface UserProfileInfo {
  id?: unknown;
  name?: unknown;
  username?: unknown;
  nickName?: unknown;
  realName?: unknown;
  data?: unknown;
  code?: unknown;
}

function firstNonEmptyString(...candidates: unknown[]): string {
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** 从资料接口响应取出展示名；兼容 `{ code:200, data:{...} }` 包一层。无有效字段时返回空串。 */
export function displayNameFromUserInfo(info: UserProfileInfo | null | undefined): string {
  if (!info || typeof info !== "object") {
    return "";
  }

  const nested = asRecord(info.data);
  const fromTop = firstNonEmptyString(info.name, info.nickName, info.realName, info.username);
  if (fromTop) {
    return fromTop;
  }
  if (nested) {
    return firstNonEmptyString(nested.name, nested.nickName, nested.realName, nested.username);
  }
  return "";
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payloadPart = token.split(".")[1] ?? "";
    if (!payloadPart) {
      return null;
    }
    const padded = payloadPart + "=".repeat((4 - (payloadPart.length % 4)) % 4);
    const binary = atob(padded.replace(/-/gu, "+").replace(/_/gu, "/"));
    // JWT JSON 可能含中文 name；atob 得到的是 binary string，需按 UTF-8 解码
    const bytes = Uint8Array.from(binary, (ch) => ch.codePointAt(0) ?? 0);
    const json = new TextDecoder().decode(bytes);
    const parsed: unknown = JSON.parse(json);
    return asRecord(parsed);
  } catch {
    return null;
  }
}

/**
 * 从 access_token JWT payload 取顶栏展示名。
 * 优先 `name`（如「超级管理员3」），再 `user_name`（常为手机号），最后 `sub`。
 */
export function displayNameFromAccessToken(token: string): string {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return "";
  }
  return firstNonEmptyString(payload.name, payload.user_name, payload.sub);
}

/**
 * 从 JWT payload 取用户 id，供 GH-UserInfo 竞态兜底。
 * 雪花 id 常以 JSON 数字写出，超过 Number.MAX_SAFE_INTEGER；必须从原文截取十进制串，禁止经 Number 中转。
 */
export function userIdFromAccessToken(token: string): string {
  try {
    const payloadPart = token.split(".")[1] ?? "";
    if (!payloadPart) {
      return "";
    }
    const padded = payloadPart + "=".repeat((4 - (payloadPart.length % 4)) % 4);
    const binary = atob(padded.replace(/-/gu, "+").replace(/_/gu, "/"));
    const bytes = Uint8Array.from(binary, (ch) => ch.codePointAt(0) ?? 0);
    const json = new TextDecoder().decode(bytes);
    const asString = /"id"\s*:\s*"([^"]+)"/u.exec(json)?.[1]?.trim();
    if (asString) {
      return asString;
    }
    const asDigits = /"id"\s*:\s*(-?\d+)/u.exec(json)?.[1];
    return asDigits ?? "";
  } catch {
    return "";
  }
}

/**
 * 把资料接口响应整理成可写入 `GH-UserInfo` 的对象（须含 id）。
 * 兼容 `{ code:200, data:{...} }` 包一层；无有效 id 时返回 null。
 */
export function legacyUserInfoFromProfile(info: UserProfileInfo | null | undefined): Record<string, unknown> | null {
  if (!info || typeof info !== "object") {
    return null;
  }
  const nested = asRecord(info.data);
  const candidate = nested && hasUserId(nested) ? nested : asRecord(info);
  if (!candidate || !hasUserId(candidate)) {
    return null;
  }
  return candidate;
}

function hasUserId(record: Record<string, unknown>): boolean {
  const id = record.id;
  return (typeof id === "string" && id.trim().length > 0) || (typeof id === "number" && Number.isFinite(id));
}
