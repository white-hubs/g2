import { type FormSchemaItem, fieldKey, flattenFormItems } from "./form-schema";

export interface AttendanceFieldValues {
  formValues?: Record<string, unknown>;
  rootFormValues?: Record<string, unknown>;
  rowChain?: Record<string, unknown>[];
  schemaItems?: FormSchemaItem[];
}

export function attendanceLinkedValue(configured: unknown, data: AttendanceFieldValues, fallbackName = ""): unknown {
  const fallback = fallbackName ? flattenFormItems(data.schemaItems ?? []).find((item) => item.name === fallbackName) : undefined;
  const saved = configured ? String(configured) : fallback ? fieldKey(fallback) : "";
  if (!saved) {
    return undefined;
  }
  const path = saved.split(",");
  const field = path.at(-1)!;
  for (let index = (data.rowChain?.length ?? 0) - 1; index >= 0; index--) {
    const row = data.rowChain![index]!;
    if (Object.hasOwn(row, field)) {
      return row[field];
    }
  }
  if (Object.hasOwn(data.formValues ?? {}, saved)) {
    return data.formValues![saved];
  }
  let value: unknown = data.rootFormValues ?? data.formValues ?? {};
  for (const key of path) {
    if (Array.isArray(value)) {
      value = value.at(-1);
    }
    if (!value || typeof value !== "object") {
      return undefined;
    }
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}
