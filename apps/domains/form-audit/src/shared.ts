import type { AppraisalPeriodType, Department, FormGroup } from "@g2-contract/form-audit";

import { formatTimestamp } from "./date-runtime";
import { getFormAuditClient } from "./domain-context";

export const APPLICATION_CODE = "FORM_ASSESSMENT";

export const periodOptions: { label: string; value: AppraisalPeriodType }[] = [
  { label: "月度", value: "MONTHLY" },
  { label: "季度", value: "QUARTERLY" },
  { label: "半年度", value: "HALF_YEAR" },
];

export const flowStatusOptions = [
  { label: "处理中", value: "ACTIVE" },
  { label: "驳回", value: "REJECT" },
  { label: "撤销", value: "UNDO" },
  { label: "完成", value: "FINISHED" },
];

export function flowStatusLabel(value?: string): string {
  const actionLabels: Record<string, string> = {
    SUBMIT: "提交",
    UNDO: "撤销",
    REPEAT: "重新提交",
    APPROVAL: "审批",
    BACK: "撤回",
    COPY: "抄送",
    REJECT: "驳回",
    FINISHED: "完成",
  };
  return flowStatusOptions.find((item) => item.value === value)?.label ?? actionLabels[value ?? ""] ?? (value ? "处理中" : "--");
}

export function periodLabel(value?: AppraisalPeriodType): string {
  return periodOptions.find((item) => item.value === value)?.label ?? value ?? "--";
}

export function formatDateTime(value?: string | number): string {
  if (value === undefined || value === "" || value === 0 || value === "0") {
    return "--";
  }
  const normalized = typeof value === "string" && /^\d+$/u.test(value) ? Number(value) : value;
  const date = new Date(typeof normalized === "string" ? normalized.replace(" ", "T") : normalized);
  return Number.isNaN(date.getTime()) ? "--" : formatTimestamp(date);
}

export function displayText(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  if (typeof value === "object") {
    return (
      Object.values(value as Record<string, unknown>)
        .filter(Boolean)
        .map(String)
        .join("-") || "--"
    );
  }
  return String(value);
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

export function flattenDepartments(items: Department[]): { label: string; value: string }[] {
  return items.flatMap((item) => [{ label: item.name, value: String(item.id) }, ...flattenDepartments(item.children ?? [])]);
}

export function flattenFormGroups(items: FormGroup[], depth = 0): { label: string; value: string }[] {
  return items.flatMap((item) => [
    { label: `${"　".repeat(depth)}${item.name}`, value: String(item.id) },
    ...flattenFormGroups(item.children ?? [], depth + 1),
  ]);
}

export async function loadCommonOptions(): Promise<{
  businessTypes: { label: string; value: string }[];
  departments: { label: string; value: string }[];
  formGroups: { label: string; value: string }[];
}> {
  const client = getFormAuditClient();
  const [businessTypes, departments, formGroups] = await Promise.all([
    client.listBusinessTypes({ application: APPLICATION_CODE }),
    client.listDepartments(),
    client.listFormGroups({ application: APPLICATION_CODE }),
  ]);
  return {
    businessTypes: businessTypes.map((item) => ({ label: item.name, value: item.code })),
    departments: flattenDepartments(departments),
    formGroups: flattenFormGroups(formGroups),
  };
}
