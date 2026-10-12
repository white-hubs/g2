/** Ant 组件的 `update:value` 回调值类型较宽（SelectValue / Dayjs 等），统一在此收敛。 */
export function toText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

export function toTextArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

/** 数字输入框：空串按 `null` 提交，保留 0。 */
export function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
