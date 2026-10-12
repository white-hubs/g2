function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/** 解包常见 `{ data }` / `{ data: { data } }` 响应壳；兼容旧仓 `{ code, data, mes }` */
export function unwrapData<T = unknown>(raw: unknown): T {
  const root = asRecord(raw);
  if ("data" in root) {
    const data = root.data;
    if (data && typeof data === "object" && "data" in (data as object) && !Array.isArray(data)) {
      return (data as Record<string, unknown>).data as T;
    }
    return data as T;
  }
  return raw as T;
}

export function unwrapList<T = unknown>(raw: unknown): T[] {
  const data = unwrapData(raw);
  if (Array.isArray(data)) return data as T[];
  const record = asRecord(data);
  const list = record.records ?? record.list ?? record.rows ?? record.children;
  return Array.isArray(list) ? (list as T[]) : [];
}

export function unwrapPage<T = unknown>(raw: unknown): { records: T[]; total: number; pages?: number } {
  const data = unwrapData(raw);
  if (Array.isArray(data)) {
    return { records: data as T[], total: data.length };
  }
  const record = asRecord(data);
  const nested = record.data && typeof record.data === "object" ? asRecord(record.data) : record;
  const records = (nested.records ?? nested.list ?? nested.rows ?? record.records ?? []) as unknown;
  return {
    records: Array.isArray(records) ? (records as T[]) : [],
    total: Number(nested.total ?? record.total ?? (Array.isArray(records) ? records.length : 0)),
    pages: Number(nested.pages ?? record.pages ?? 0) || undefined,
  };
}

/**
 * 兼容旧页面 `const { data } = await xxx()` 写法：
 * httpPlatform 可能已解包为 data，也可能仍返回整包。
 */
export function asLegacyResult<T = unknown>(raw: unknown): { data: T; code?: number; mes?: string } {
  const root = asRecord(raw);
  if ("data" in root || "code" in root) {
    return {
      data: root.data as T,
      code: root.code as number | undefined,
      mes: (root.mes ?? root.message) as string | undefined,
    };
  }
  return { data: raw as T };
}
