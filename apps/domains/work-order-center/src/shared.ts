import { formatTimestamp } from "./date-runtime";

export const flowStatusLabels: Record<string, string> = {
  SUBMIT: "提交",
  UNDO: "撤销",
  REPEAT: "重新提交",
  APPROVAL: "审批",
  BACK: "撤回",
  COPY: "抄送",
  REJECT: "驳回",
  FINISHED: "完成",
};

export function flowStatusLabel(value?: string): string {
  return flowStatusLabels[value ?? ""] ?? (value ? "处理中" : "--");
}

export function formatDateTime(value?: string | number): string {
  if (value === undefined || value === "" || value === 0 || value === "0") {
    return "--";
  }
  const normalized = typeof value === "string" && /^\d+$/u.test(value) ? Number(value) : value;
  const date = new Date(typeof normalized === "string" ? normalized.replace(" ", "T") : normalized);
  return Number.isNaN(date.getTime()) ? "--" : formatTimestamp(date);
}

export function rangePeriod(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length !== 2) {
    return undefined;
  }
  return `${String(value[0])} 00:00:00,${String(value[1])} 23:59:59`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
