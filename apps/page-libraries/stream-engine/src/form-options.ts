export type SelectOption = { label: string; value: string };

/**
 * 旧流引擎表单设计器把下拉 options 存成字符串数组（如 `["已修复"]`），
 * ant-design-vue Select 的 flattenOptions 会对每项做 `'options' in data`，
 * 遇到原始字符串会直接 TypeError，导致页面白屏。
 */
export function normalizeSelectOptions(raw: unknown): SelectOption[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((item) => {
    if (item == null) {
      return [];
    }
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      const value = String(item);
      return [{ label: value, value }];
    }
    if (typeof item === "object") {
      const record = item as Record<string, unknown>;
      const value = record.value ?? record.id ?? record.key ?? record.label ?? record.name;
      if (value == null) {
        return [];
      }
      const label = record.label ?? record.name ?? record.title ?? value;
      return [{ label: String(label), value: String(value) }];
    }
    return [];
  });
}
