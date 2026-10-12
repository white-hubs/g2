import type { NamedOption } from "@g2-contract/meet-room";

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function text(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  return String(value);
}

export function formatDateTime(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  const date = new Date(value as string | number);
  if (Number.isNaN(date.getTime())) {
    return text(value);
  }
  const pad = (part: number): string => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function optionTree(rows: unknown): NamedOption[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows
    .map((item): NamedOption | undefined => {
      if (!item || typeof item !== "object") {
        return undefined;
      }
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? row.value ?? "");
      if (!id) {
        return undefined;
      }
      const children = optionTree(row.children);
      return {
        id,
        name: String(row.name ?? row.label ?? id),
        parentId: row.parentId === undefined || row.parentId === null ? null : String(row.parentId),
        ...(children.length > 0 ? { children } : {}),
      };
    })
    .filter((item): item is NamedOption => Boolean(item));
}

export interface TreeSelectOption {
  children?: TreeSelectOption[];
  label: string;
  value: string;
}

export interface AreaCascaderOption {
  children?: AreaCascaderOption[];
  id: string;
  name: string;
}

export function treeSelectData(rows: NamedOption[]): TreeSelectOption[] {
  return rows.map((row) => ({
    label: row.name,
    value: row.id,
    ...(row.children?.length ? { children: treeSelectData(row.children) } : {}),
  }));
}

export function cascaderData(rows: NamedOption[]): AreaCascaderOption[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    ...(row.children?.length ? { children: cascaderData(row.children) } : {}),
  }));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

export function generateTimes(step = 30): string[] {
  return Array.from({ length: Math.floor((24 * 60) / step) }, (_, index) => {
    const start = index * step;
    const end = (index + 1) * step;
    const stamp = (minutes: number): string => {
      const hour = Math.floor(minutes / 60) % 24;
      return `${String(hour).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    };
    return `${stamp(start)} - ${stamp(end)}`;
  });
}
