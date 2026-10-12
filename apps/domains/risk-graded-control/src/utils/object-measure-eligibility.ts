import type { ObjectStatus, RiskObjectVO } from "@/types/risk";

const MEASURE_CONFIG_BLOCKED_STATUSES: readonly ObjectStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "INHERENT_EVAL",
  "INNATE_EVAL",
  "CONTROL_EVAL",
  "RE_EVAL",
];

/** 对象已完成评估，可配置/编辑管控措施 */
export function canConfigureObjectMeasures(object: RiskObjectVO): boolean {
  if (MEASURE_CONFIG_BLOCKED_STATUSES.includes(object.status)) return false;
  return Boolean(object.innateLevel && object.controlLevel);
}

export function measureConfigDisabledReason(object: RiskObjectVO): string | undefined {
  if (canConfigureObjectMeasures(object)) return undefined;
  if (object.status === "INHERENT_EVAL" || object.status === "INNATE_EVAL" || object.status === "RE_EVAL") {
    return "请先完成固有风险评估";
  }
  if (object.status === "CONTROL_EVAL") {
    return "请先完成控制风险评估";
  }
  if (!object.innateLevel || !object.controlLevel) {
    return "请先完成固有风险与控制风险评估";
  }
  return "当前对象暂不可配置管控措施";
}
