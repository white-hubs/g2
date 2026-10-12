import type { KnowledgeFile, KnowledgeTypeNode, ReferenceOption } from "@g2-contract/knowledge-document";

export interface SelectOption {
  label: string;
  value: string;
}

export interface TreeOption extends SelectOption {
  children?: TreeOption[];
}

export interface NavigationTreeNode {
  key: string;
  title: string;
  children?: NavigationTreeNode[];
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
  const rawValue = String(value);
  const numericValue = Number(rawValue);
  const date =
    /^\d{10}(?:\d{3})?$/u.test(rawValue) && Number.isFinite(numericValue)
      ? new Date(rawValue.length === 10 ? numericValue * 1000 : numericValue)
      : new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const pad = (part: number): string => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}`;
}

export function productOptions(rows: ReferenceOption[]): SelectOption[] {
  return rows.map((item) => ({ label: item.prodName ?? item.name ?? "未知", value: String(item.id) }));
}

export function referenceTree(rows: ReferenceOption[]): TreeOption[] {
  return rows.map((item) => {
    const children = Array.isArray(item.children) ? referenceTree(item.children) : undefined;
    return {
      label: item.name ?? "未命名部门",
      value: String(item.id),
      ...(children?.length ? { children } : {}),
    };
  });
}

export function typeTree(rows: KnowledgeTypeNode[]): TreeOption[] {
  return rows.map((item) => {
    const children = Array.isArray(item.children) ? typeTree(item.children) : undefined;
    return {
      label: item.name,
      value: String(item.id),
      ...(children?.length ? { children } : {}),
    };
  });
}

export function navigationTree(rows: KnowledgeTypeNode[]): NavigationTreeNode[] {
  return rows.map((item) => {
    const children = Array.isArray(item.children) ? navigationTree(item.children) : undefined;
    return {
      key: String(item.id),
      title: item.name,
      ...(children?.length ? { children } : {}),
    };
  });
}

export function fileExtension(file: KnowledgeFile): string {
  const fromName = file.name.split(".").pop();
  return String(file.type ?? file.suffix ?? fromName ?? "")
    .replace(/^\./u, "")
    .toLowerCase();
}

export function isImageFile(file: KnowledgeFile): boolean {
  return ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(fileExtension(file));
}

export function previewUrl(file: KnowledgeFile): string {
  const absolute = file.path.startsWith("http") ? file.path : `${globalThis.location.origin}${file.path}`;
  const encoded = globalThis.btoa(unescape(encodeURIComponent(absolute)));
  const suffix = fileExtension(file);
  return `${globalThis.location.origin}/tools/kkfileview/onlinePreview?url=${encodeURIComponent(encoded)}&fileName=${encodeURIComponent(file.name)}${
    ["xls", "xlsx"].includes(suffix) ? "&officePreviewType=html" : ""
  }`;
}
