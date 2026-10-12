import { dayjs } from "@g2-platform/pc-ui";

export type WorkflowKind = "recruit" | "induction" | "appraise" | "regular" | "drill" | "depart" | "depart-procedures" | "work-shift";
export type StatisticsKind = "recruit" | "induction" | "appraise" | "regular" | "depart" | "work-shift";

export interface WorkflowConfig {
  kind: WorkflowKind;
  title: string;
  businessType: string;
  prefix: string;
  tableCode: string;
}

export const WORKFLOWS: Record<WorkflowKind, WorkflowConfig> = {
  recruit: { kind: "recruit", title: "招聘申请", businessType: "PERSONNEL_RECRUIT", prefix: "ZP", tableCode: "RECRUIT_APPROVAL" },
  induction: { kind: "induction", title: "入职申请", businessType: "PERSONNEL_INDUCTION", prefix: "RZ", tableCode: "PERSONNEL_INDUCTION" },
  appraise: {
    kind: "appraise",
    title: "考核申请",
    businessType: "PERSONNEL_PROBATION_ASSESS",
    prefix: "SY",
    tableCode: "APPRAISE_APPROVAL",
  },
  regular: {
    kind: "regular",
    title: "转正申请",
    businessType: "PERSONNEL_REGULAR_WORKER",
    prefix: "ZZ",
    tableCode: "PERSONNEL_REGULAR_WORKER",
  },
  drill: { kind: "drill", title: "培训申请", businessType: "PERSONNEL_TRAIN", prefix: "PX", tableCode: "PERSONNEL_TRAIN" },
  depart: {
    kind: "depart",
    title: "离职申请",
    businessType: "PERSONNEL_LEAVE_OFFICE",
    prefix: "LZSP",
    tableCode: "PERSONNEL_LEAVE_OFFICE",
  },
  "depart-procedures": {
    kind: "depart-procedures",
    title: "离职手续",
    businessType: "PERSONNEL_LEAVE_OFFICE_PROCEDURES",
    prefix: "LZSX",
    tableCode: "PERSONNEL_LEAVE_OFFICE_PROCEDURES",
  },
  "work-shift": {
    kind: "work-shift",
    title: "轮岗申请",
    businessType: "PERSONNEL_ROTATION_POST",
    prefix: "LGSQ",
    tableCode: "PERSONNEL_ROTATION_POST",
  },
};

// 审批记录页使用旧流引擎的业务名称，部分名称与本应用菜单标题不同。
export const BUSINESS_NAMES: Record<string, string> = {
  PERSONNEL_RECRUIT: "招聘申请",
  PERSONNEL_INDUCTION: "入职审批",
  PERSONNEL_PROBATION_ASSESS: "试用考核",
  PERSONNEL_REGULAR_WORKER: "转正申请",
  PERSONNEL_TRAIN: "培训申请",
  PERSONNEL_LEAVE_OFFICE: "离职申请",
  PERSONNEL_LEAVE_OFFICE_PROCEDURES: "离职手续",
  PERSONNEL_ROTATION_POST: "轮岗申请",
};

export function display(value: unknown): string {
  if (value === null || value === undefined || value === "" || value === "null") {
    return "--";
  }
  return String(value);
}

export function dateTime(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  const parsed = dayjs(value as string | number);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : display(value);
}

export function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function statusText(value: unknown): string {
  const labels: Record<string, string> = {
    SUBMIT: "提交",
    UNDO: "撤销",
    REPEAT: "重新提交",
    APPROVAL: "审批",
    BACK: "撤回",
    COPY: "抄送",
    REJECT: "驳回",
    FINISHED: "完成",
  };
  return typeof value === "string" ? (labels[value] ?? "处理中") : "--";
}

export function downloadWorkbook(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  queueMicrotask(() => URL.revokeObjectURL(url));
}
