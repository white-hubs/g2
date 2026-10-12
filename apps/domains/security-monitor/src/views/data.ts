export type SecurityRecord = Record<string, unknown>;

function objectValue(raw: unknown): SecurityRecord {
  return raw && typeof raw === "object" ? (raw as SecurityRecord) : {};
}

export function unwrapData(raw: unknown): unknown {
  const root = objectValue(raw);
  return root.data === undefined ? raw : root.data;
}

export function normalizePage(raw: unknown): { records: SecurityRecord[]; total: number } {
  const first = unwrapData(raw);
  const root = objectValue(first);
  const nested = objectValue(root.data);
  const records = [root.records, root.list, nested.records, nested.list, Array.isArray(first) ? first : undefined].find(Array.isArray) as
    | SecurityRecord[]
    | undefined;
  const list = records ?? [];
  const total = Number(root.total ?? nested.total ?? list.length);
  return { records: list, total: Number.isFinite(total) ? total : list.length };
}

export function normalizeRecord(raw: unknown): SecurityRecord {
  const value = unwrapData(raw);
  const root = objectValue(value);
  return objectValue(root.data === undefined ? root : root.data);
}

export function text(row: SecurityRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return String(value);
  }
  return "--";
}

export function recordId(row: SecurityRecord): string {
  return text(row, "id", "deviceId", "cameraPatrolLineId").replace(/^--$/, "");
}
