import { dayjs } from "@g2-platform/pc-ui";

import { getGovernmentContext } from "../domain-context";

export const FLOW_VIEWS = [
  { value: "ALL", label: "全部" },
  { value: "WAITING", label: "待我处理" },
  { value: "SUBMIT", label: "我发起的" },
  { value: "SERVED", label: "抄送给我" },
  { value: "PROCESSED", label: "已处理" },
];
export const FLOW_STATUSES = [
  { value: "ACTIVE", label: "处理中" },
  { value: "REJECT", label: "驳回" },
  { value: "UNDO", label: "撤销" },
  { value: "FINISHED", label: "完成" },
];
export const STATUS_VIEWS = new Set(["ALL", "SUBMIT", "SERVED"]);

export function display(value: unknown): string {
  return value === undefined || value === null || value === "" || value === "null" ? "--" : String(value);
}

export function dateTime(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  const parsed = dayjs(value as string | number);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : display(value);
}

export function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function flowStatus(value: unknown): string {
  const map: Record<string, string> = {
    SUBMIT: "提交",
    UNDO: "撤销",
    REPEAT: "重新提交",
    APPROVAL: "审批",
    BACK: "撤回",
    COPY: "抄送",
    REJECT: "驳回",
    FINISHED: "完成",
  };
  return typeof value === "string" ? (map[value] ?? "处理中") : "--";
}

export function can(action: string): boolean {
  const codes = getGovernmentContext().getFunctionCodes();
  return codes.size === 0 || codes.has(action);
}

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  queueMicrotask(() => URL.revokeObjectURL(url));
}

export function positiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
