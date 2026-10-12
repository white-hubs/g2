import { GEM_PAGE_KEYS, type GemPageKey, type PageNavigatePayload } from "@g2-pages/generic-equipment-monitor/contract";

const BASE = "/d/security-monitor";

export const SECURITY_MONITOR_GEM_PAGE_ENTRY: Record<GemPageKey, string> = {
  [GEM_PAGE_KEYS.overView]: "overView",
  [GEM_PAGE_KEYS.equipmentMonitorList]: "monitoring",
  [GEM_PAGE_KEYS.equipmentMonitorDetail]: "monitoring",
  [GEM_PAGE_KEYS.alarmRecord]: "alarmRecord",
  [GEM_PAGE_KEYS.alarmDetail]: "alarmDetail",
  [GEM_PAGE_KEYS.alarmRecordSafety]: "alarmRecord",
  [GEM_PAGE_KEYS.alarmSafetyDetail]: "alarmDetail",
  [GEM_PAGE_KEYS.alarmConfigList]: "alarmRulesList",
  [GEM_PAGE_KEYS.alarmConfigEnergyList]: "alarmRulesList",
  [GEM_PAGE_KEYS.alarmConfigureAdd]: "alarmRulesConfig",
  [GEM_PAGE_KEYS.alarmStatistic]: "alarmStatistics",
  [GEM_PAGE_KEYS.alarmDrillRecord]: "alarm/record",
  [GEM_PAGE_KEYS.alarmHandelStatistics]: "alarmHandelStatistics",
  [GEM_PAGE_KEYS.alarmAnalysis]: "safetyAnalysis",
  [GEM_PAGE_KEYS.applicationEquipment]: "applicationEquipment",
  [GEM_PAGE_KEYS.configuration]: "overView",
};

export function resolveSecurityMonitorGemHostPath(payload: PageNavigatePayload): string {
  const path = `${BASE}/${SECURITY_MONITOR_GEM_PAGE_ENTRY[payload.page]}`;
  if (!payload.params || Object.keys(payload.params).length === 0) {
    return path;
  }
  const query = Object.entries(payload.params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return query ? `${path}?${query}` : path;
}
