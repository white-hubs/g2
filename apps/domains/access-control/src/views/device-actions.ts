export interface DoorTypeOption {
  label: string;
  value: string;
}

export function mapDoorTypeOptions(items: Array<Record<string, unknown>>): DoorTypeOption[] {
  return items.map((item) => ({
    value: String(item.value ?? item.id ?? ""),
    label: String(item.doorTypeName ?? item.label ?? "--"),
  }));
}

export function normalizeDevicePage(result: unknown): { total: number; pages: number; records: unknown[] } {
  if (Array.isArray(result)) {
    return { total: result.length, pages: 1, records: result };
  }
  const page = (result ?? {}) as { total?: number; pages?: number; records?: unknown[] };
  const records = page.records ?? [];
  return {
    total: Number(page.total ?? records.length),
    pages: Number(page.pages ?? 1),
    records,
  };
}

export function buildAssociatePayload(
  type: string,
  list: Array<{ id?: string | number; doorCode?: string; code?: string }>,
): Array<{ deviceId: string; type: string; doorCode: string }> {
  return list.map((item) => ({
    deviceId: String(item.id || ""),
    type,
    doorCode: String(item.doorCode || item.code || ""),
  }));
}

export function resolveControlStatus(result: unknown): number {
  if (result == null) return 4;
  if (typeof result === "number" || typeof result === "string") {
    const n = Number(result);
    return Number.isFinite(n) ? n : 4;
  }
  const obj = result as { status?: unknown; value?: unknown };
  const n = Number(obj.status ?? obj.value ?? 4);
  return Number.isFinite(n) ? n : 4;
}
