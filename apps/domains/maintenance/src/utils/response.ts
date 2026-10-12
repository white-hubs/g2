/** 公共 Client 返回 `unknown`，这里统一剥掉 `{ code, data }` 信封。 */
export function unwrapData(response: unknown): unknown {
  let value = response;
  for (let i = 0; i < 4 && value && typeof value === "object"; i++) {
    const record = value as Record<string, unknown>;
    if (!("data" in record)) {
      break;
    }
    value = record.data;
  }
  return value;
}

export function asArray<T>(response: unknown): T[] {
  const value = unwrapData(response);
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (value && typeof value === "object" && Array.isArray((value as { records?: unknown }).records)) {
    return (value as { records: T[] }).records;
  }
  return [];
}

export function asPageResult<T>(response: unknown): { records: T[]; total: number; pages: number } {
  const value = unwrapData(response) as { records?: T[]; total?: number; pages?: number } | undefined;
  return {
    records: Array.isArray(value?.records) ? value.records : [],
    total: Number(value?.total ?? 0),
    pages: Number(value?.pages ?? 0),
  };
}
