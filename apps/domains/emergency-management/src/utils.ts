import { useRoute } from "vue-router";

export const GLOBAL_SCENE_CODE = {
  emergencyFile: "EMERGENCY::FILE",
} as const;

export const TIME_UNIT = [
  { label: "月", value: "MONTH" },
  { label: "天", value: "DAY" },
  { label: "小时", value: "HOUR" },
  { label: "分钟", value: "MINUTE" },
  { label: "秒", value: "SECOND" },
] as const;

export function resolvePageTitle(meta: Record<string, unknown>): string {
  return String(meta.title ?? "预案管理");
}

export function usePageName(): { pageTitle: string } {
  const route = useRoute();
  return { pageTitle: resolvePageTitle(route.meta as Record<string, unknown>) };
}

export function unwrapPage(raw: unknown): { records: Record<string, unknown>[]; total: number } {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const nested = data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : data;
  const records = (nested.records ?? nested.list ?? nested.content ?? nested.rows ?? data.records ?? data.list ?? raw) as unknown;
  return {
    records: Array.isArray(records) ? (records as Record<string, unknown>[]) : [],
    total: Number(nested.total ?? nested.totalElements ?? data.total ?? (Array.isArray(records) ? records.length : 0)),
  };
}

export function asOptions(
  raw: unknown,
  labelKeys: string[] = ["label", "name"],
  valueKeys: string[] = ["value", "id", "code"],
): { label: string; value: string }[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else {
    const page = unwrapPage(raw);
    list = page.records.length ? page.records : [];
  }
  return list.map((item) => {
    const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const label = String(labelKeys.map((k) => row[k]).find((v) => v != null && v !== "") ?? "--");
    const value = String(valueKeys.map((k) => row[k]).find((v) => v != null && v !== "") ?? label);
    return { label, value };
  });
}

export function formatDate(value: unknown): string {
  if (!value) return "--";
  const text = String(value);
  return text.length >= 10 ? text.slice(0, 10) : text;
}

export function timeUnitLabel(unit: unknown): string {
  return TIME_UNIT.find((item) => item.value === unit)?.label ?? "";
}

export function navigateIotAlarm(query: Record<string, string>): void {
  const params = new URLSearchParams(query);
  const target = `/portal/iot-center/alarm?${params.toString()}`;
  history.pushState({ current: location.pathname + location.search }, "", target);
}
