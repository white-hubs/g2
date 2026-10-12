import { dayjs } from "@g2-platform/pc-ui";

const operationNames: Record<string, string> = {
  SUBMIT: "提交",
  UNDO: "撤销",
  WITHDRAW: "撤回",
  REPEAT: "重新提交",
  APPROVAL: "审批",
  BACK: "退回",
  COPY: "抄送",
  REJECT: "拒绝",
  FINISHED: "完成",
  TRANSFER: "转交",
  PASS: "审批通过",
};

export function processOperationName(type: unknown): string {
  return operationNames[String(type ?? "")] ?? "处理中";
}

export function formatProcessTime(value: unknown): string {
  if (value == null || value === "") return "--";
  const timestamp = typeof value === "string" && /^\d{13}$/.test(value) ? Number(value) : value;
  const parsed = dayjs(timestamp as string | number | Date);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : "--";
}
