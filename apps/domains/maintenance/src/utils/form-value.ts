/** Ant 组件的 `update:value` 回调值类型较宽（SelectValue / Dayjs 等），统一在此收敛。 */
export function toText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

export function toTextArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export function toNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}
