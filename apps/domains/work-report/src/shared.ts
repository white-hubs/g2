import type { OptionItem } from "@g2-contract/work-report";
import { dayjs } from "@g2-platform/pc-ui";

import { getContext } from "./domain-context";
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
export const display = (value: unknown): string => (value === undefined || value === null || value === "" ? "--" : String(value));
export const errorText = (error: unknown, fallback: string): string => (error instanceof Error ? error.message : fallback);
export function dateTime(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  const parsed = dayjs(value as string | number);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : display(value);
}
export function flowStatus(value: unknown): string {
  const statuses: Record<string, string> = {
    SUBMIT: "提交",
    UNDO: "撤销",
    REPEAT: "重新提交",
    APPROVAL: "审批",
    BACK: "撤回",
    COPY: "抄送",
    REJECT: "驳回",
    FINISHED: "完成",
  };
  return typeof value === "string" ? (statuses[value] ?? "处理中") : "--";
}
export function departmentTree(items: OptionItem[]): { title: string; value: string; children?: ReturnType<typeof departmentTree> }[] {
  return items.map((item) => ({
    title: item.name,
    value: item.id,
    children: item.children?.length ? departmentTree(item.children) : undefined,
  }));
}
export function canDeleteArrangement(): boolean {
  const codes = getContext().getFunctionCodes();
  return codes.has("workReport:arrange:delete");
}
export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  queueMicrotask(() => URL.revokeObjectURL(url));
}
export function positiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
