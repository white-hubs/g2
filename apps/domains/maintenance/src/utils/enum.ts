/** 规则触发的条件类型，对齐旧 `src/utils/enum.ts`。 */
export const ATTRIBUTE_TYPE_OPTIONS = [
  { value: "DEVICE_EVENT_CONDITION", label: "设备事件" },
  { value: "CUSTOM_RULE_CONDITION", label: "属性判断" },
  { value: "BASIC_INFORMATION", label: "基本信息" },
];

/** 规则触发的比较操作符。 */
export const COMPARATOR_OPTIONS = [
  { value: "EQ", label: "等于" },
  { value: "NE", label: "不等于" },
  { value: "IN", label: "包含" },
  { value: "GT", label: "大于" },
  { value: "GE", label: "大于等于" },
  { value: "LT", label: "小于" },
  { value: "LE", label: "小于等于" },
  { value: "NOT_IN", label: "不包含" },
];

/** 计划状态筛选项（旧页硬编码，「全部」用 undefined 以保留 placeholder）。 */
export const PLAN_STATUS_OPTIONS = [
  { label: "已启用", value: "ENABLED" },
  { label: "已过期", value: "EXPIRED" },
  { label: "已停用", value: "DEACTIVATED" },
];

const PLAN_STATUS_LABELS: Record<string, string> = {
  ENABLED: "已启用",
  EXPIRED: "已过期",
  DEACTIVATED: "已停用",
};

export function planStatusLabel(value?: string): string {
  return value ? (PLAN_STATUS_LABELS[value] ?? "--") : "--";
}

/** 任务生成周期单位。 */
export const TIME_UNIT_OPTIONS = [
  { label: "天", value: "p-day" },
  { label: "周", value: "p-week" },
  { label: "月", value: "p-month" },
];

const TIME_UNIT_LABELS: Record<string, string> = { "p-day": "天", "p-week": "周", "p-month": "月" };

export function timeUnitLabel(value?: string): string {
  return value ? (TIME_UNIT_LABELS[value] ?? "") : "";
}

/** 任务状态：待维保 / 已完成 / 已终止（旧页 STOP 直接显示 `--`）。 */
export function taskStatusLabel(value?: string): string {
  if (value === "BE_MAINTAINED") {
    return "待维保";
  }
  if (value === "COMPLETED") {
    return "已完成";
  }
  return "--";
}

/** 维保通知场景编码（旧 messageNotice 仅配置「待维保」一个场景）。 */
export const MAINTENANCE_NOTICE_SCENE = "MAINTAIN_MAINTANCE_RECEIPT_CONFIRM";

/** 旧页把模板占位符替换为中文说明后展示。 */
export function renderNoticeTemplate(content?: string): string {
  return (content ?? "").replace("${maintenaceEvent}", "【维保作业】").replace("${maintenaceName}", "【维保设备名称】");
}
