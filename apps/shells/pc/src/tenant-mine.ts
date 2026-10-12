/**
 * 对齐旧仓 `api.tenant()` → `GET /api/mdata/tenant/mine`。
 * 供顶栏「选择企业」列表与切换。
 */

export interface TenantMineItem {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
  webSiteUrl?: string;
  mainEnterprise?: boolean;
}

export interface OutsideTenantItem {
  id: string;
  name: string;
  path?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asNonEmptyString(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

/** OUAA/mdata 的 tenant.code / id 常为 number（如 58197260），须转成字符串。 */
function asCodeString(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return asNonEmptyString(value);
}

function unwrapList(body: unknown): unknown[] {
  if (Array.isArray(body)) {
    return body;
  }
  const top = asRecord(body);
  const data = top?.data;
  return Array.isArray(data) ? data : [];
}

export function parseTenantMineList(body: unknown): TenantMineItem[] {
  const result: TenantMineItem[] = [];
  for (const raw of unwrapList(body)) {
    const item = asRecord(raw);
    if (!item) {
      continue;
    }
    const code = asCodeString(item.code);
    const name = asNonEmptyString(item.name);
    if (!code || !name) {
      continue;
    }
    const id = asCodeString(item.id) || code;
    const mapped: TenantMineItem = {
      id,
      code,
      name,
      enabled: item.enabled !== false && item.enabled !== "false",
    };
    const webSiteUrl = asNonEmptyString(item.webSiteUrl);
    if (webSiteUrl) {
      mapped.webSiteUrl = webSiteUrl;
    }
    if (item.mainEnterprise === true) {
      mapped.mainEnterprise = true;
    }
    result.push(mapped);
  }
  return result;
}

/** `window.config.feature.outsideTenants`（旧仓外链租户）。 */
export function parseOutsideTenants(feature: unknown): OutsideTenantItem[] {
  const record = asRecord(feature);
  const raw = record?.outsideTenants;
  if (!Array.isArray(raw)) {
    return [];
  }
  const result: OutsideTenantItem[] = [];
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) {
      continue;
    }
    const name = asNonEmptyString(row.name);
    if (!name) {
      continue;
    }
    const id = asNonEmptyString(row.id) || name;
    const path = asNonEmptyString(row.path) || undefined;
    result.push(path ? { id, name, path } : { id, name });
  }
  return result;
}

/** 对齐旧仓：多于 1 个内部或外部租户时才显示「组织切换」。 */
export function shouldShowTenantSwitch(tenants: TenantMineItem[], outsideTenants: OutsideTenantItem[]): boolean {
  return tenants.length > 1 || outsideTenants.length > 1;
}
