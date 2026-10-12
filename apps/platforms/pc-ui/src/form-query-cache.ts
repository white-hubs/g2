export type FormQueryValue = string | number | boolean | null | undefined | Array<string | number | boolean | null | undefined>;

const hasWindow = (): boolean => typeof window !== "undefined" && typeof window.location !== "undefined";

function serialize(value: FormQueryValue): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    const serialized = value.filter((item) => item !== undefined && item !== null && item !== "").join(",");
    return serialized || undefined;
  }
  return String(value);
}

export function readFormQuery(key: string): string | undefined {
  if (!hasWindow()) return undefined;
  return new URLSearchParams(window.location.search).get(key) || undefined;
}

export function writeFormQuery(values: Record<string, FormQueryValue>): void {
  if (!hasWindow()) return;
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(values)) {
    const serialized = serialize(value);
    if (serialized === undefined) url.searchParams.delete(key);
    else url.searchParams.set(key, serialized);
  }
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
