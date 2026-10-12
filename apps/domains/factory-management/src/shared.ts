import type { ParkFile, SelectRecord } from "@g2-contract/factory-management";

export interface SelectOption {
  label: string;
  value: string;
}

export interface CascaderOption extends SelectOption {
  children?: CascaderOption[];
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function text(value: unknown): string {
  return value === undefined || value === null || value === "" ? "--" : String(value);
}

export function formatDateTime(value: unknown): string {
  if (!value) {
    return "--";
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const pad = (part: number): string => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}`;
}

export function options(rows: SelectRecord[]): SelectOption[] {
  return rows
    .filter((item) => item.deleted !== true)
    .map((item) => ({
      label: String(item.label ?? item.name ?? "未命名"),
      value: String(item.value ?? item.id ?? item.code ?? ""),
    }))
    .filter((item) => item.value);
}

export function cascaderOptions(rows: SelectRecord[]): CascaderOption[] {
  return rows.map((item) => {
    const children = Array.isArray(item.children) ? cascaderOptions(item.children) : undefined;
    return {
      label: String(item.label ?? item.name ?? "未命名区域"),
      value: String(item.value ?? item.id ?? ""),
      ...(children?.length ? { children } : {}),
    };
  });
}

export function fileIds(files: ParkFile[] | undefined): string[] {
  return (files ?? []).map((file) => String(file.id)).filter(Boolean);
}
