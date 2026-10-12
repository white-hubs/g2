export type StatisticsRecord = Record<string, unknown>;

function isRecord(value: unknown): value is StatisticsRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function unwrapStatisticsData(raw: unknown): unknown {
  let value = raw;
  for (let index = 0; index < 4; index += 1) {
    if (!isRecord(value) || value.data === undefined) return value;
    value = value.data;
  }
  return value;
}

export function statisticsRecord(raw: unknown): StatisticsRecord {
  const value = unwrapStatisticsData(raw);
  return isRecord(value) ? value : {};
}

export function statisticsRows(raw: unknown, fields: string[] = ["records", "list"]): StatisticsRecord[] {
  const value = unwrapStatisticsData(raw);
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];

  for (const field of fields) {
    if (Array.isArray(value[field])) return value[field].filter(isRecord);
  }
  if (Array.isArray(value.data)) return value.data.filter(isRecord);
  return [];
}

export function statisticsPage(raw: unknown): { records: StatisticsRecord[]; total: number } {
  const value = statisticsRecord(raw);
  const nested = statisticsRecord(value.data);
  const records = statisticsRows(raw, ["records", "list", "data"]);
  const total = Number(value.total ?? nested.total ?? records.length);
  return { records, total: Number.isFinite(total) ? total : records.length };
}

export function numberValue(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export function rowLabel(row: StatisticsRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return String(value);
  }
  return "--";
}

export function rowNumber(row: StatisticsRecord, ...keys: string[]): number {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return numberValue(row[key]);
  }
  return 0;
}
