import type { InspectionPlan } from "./video-monitor-types";
import { displayDateTime } from "./video-monitor-types";

const EXECUTION_MODE_LABEL: Record<string, string> = {
  ONCE: "单次",
  CYCLE: "循环",
};

const CYCLE_LABEL: Record<string, string> = {
  EVERY_DAY: "每日",
  EVERY_WEEK: "每周",
  EVERY_MONTH: "每月",
};

const WEEK_LABEL: Record<string, string> = {
  SUN: "周日",
  MON: "周一",
  TUE: "周二",
  WED: "周三",
  THU: "周四",
  FRI: "周五",
  SAT: "周六",
};

export function formatInspectionExecutionPlan(record: InspectionPlan): string {
  const mode = EXECUTION_MODE_LABEL[record.executionMode ?? ""] ?? "--";
  if (record.executionMode === "ONCE") {
    return `${mode} ${displayDateTime(record.startTime)}`;
  }
  const cycle = CYCLE_LABEL[record.cycleType ?? ""] ?? "";
  const values = (record.cycleValues ?? "")
    .split(",")
    .filter(Boolean)
    .map((value) =>
      record.cycleType === "EVERY_WEEK" ? (WEEK_LABEL[value] ?? value) : record.cycleType === "EVERY_MONTH" ? `${value}日` : "",
    )
    .filter(Boolean)
    .join("、");
  return [mode, cycle, values, record.executeTime].filter(Boolean).join(" ");
}
