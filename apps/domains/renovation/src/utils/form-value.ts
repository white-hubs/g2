export function toText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

export function toTextArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}
