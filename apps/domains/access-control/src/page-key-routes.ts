import { GEM_PAGE_KEYS, type GemPageKey, type PageNavigatePayload } from "@g2-pages/generic-equipment-monitor/contract";

const BASE = "/d/access-control";

/** pageKey → 本应用域 entry（正拼写优先）。 */
export const ACCESS_CONTROL_GEM_PAGE_ENTRY: Record<GemPageKey, string> = {
  [GEM_PAGE_KEYS.overView]: "overView",
  [GEM_PAGE_KEYS.equipmentMonitorList]: "equipmentMonitorList",
  [GEM_PAGE_KEYS.equipmentMonitorDetail]: "equipmentMonitorDetail",
  [GEM_PAGE_KEYS.alarmRecord]: "alarmRecord",
  [GEM_PAGE_KEYS.alarmDetail]: "alarmDetail",
  [GEM_PAGE_KEYS.alarmRecordSafety]: "alarmRecordSafety",
  [GEM_PAGE_KEYS.alarmSafetyDetail]: "alarmSafetyDetail",
  [GEM_PAGE_KEYS.alarmConfigList]: "alarmConfigList",
  [GEM_PAGE_KEYS.alarmConfigEnergyList]: "alarmConfigEnergyList",
  [GEM_PAGE_KEYS.alarmConfigureAdd]: "alarmConfigureAdd",
  [GEM_PAGE_KEYS.alarmStatistic]: "alarmStatistic",
  [GEM_PAGE_KEYS.alarmDrillRecord]: "alarm/record",
  [GEM_PAGE_KEYS.alarmHandelStatistics]: "alarmHandelStatistics",
  [GEM_PAGE_KEYS.alarmAnalysis]: "alarmAnalysis",
  [GEM_PAGE_KEYS.applicationEquipment]: "applicationEquipment",
  [GEM_PAGE_KEYS.configuration]: "configuration",
};

export function resolveAccessControlGemHostPath(payload: PageNavigatePayload): string {
  const entry = ACCESS_CONTROL_GEM_PAGE_ENTRY[payload.page];
  const path = `${BASE}/${entry}`;
  const params = payload.params;
  if (!params || Object.keys(params).length === 0) {
    return path;
  }
  const qs = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return qs ? `${path}?${qs}` : path;
}
