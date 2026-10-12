/** 页面库稳定逻辑页名（非 URL、非 functionCode）。ADR-0059 */
export const GEM_PAGE_KEYS = {
  overView: "overView",
  equipmentMonitorList: "equipmentMonitorList",
  equipmentMonitorDetail: "equipmentMonitorDetail",
  alarmRecord: "alarmRecord",
  alarmDetail: "alarmDetail",
  alarmRecordSafety: "alarmRecordSafety",
  alarmSafetyDetail: "alarmSafetyDetail",
  alarmConfigList: "alarmConfigList",
  alarmConfigEnergyList: "alarmConfigEnergyList",
  alarmConfigureAdd: "alarmConfigureAdd",
  alarmStatistic: "alarmStatistic",
  alarmDrillRecord: "alarmDrillRecord",
  alarmHandelStatistics: "alarmHandelStatistics",
  alarmAnalysis: "alarmAnalysis",
  applicationEquipment: "applicationEquipment",
  configuration: "configuration",
} as const;

export type GemPageKey = (typeof GEM_PAGE_KEYS)[keyof typeof GEM_PAGE_KEYS];

export const GEM_ACTION_KEYS = {
  exportAlarm: "exportAlarm",
  ackAlarm: "ackAlarm",
  alarmRecordDelete: "alarmRecordDelete",
  alarmConfigCreate: "alarmConfigCreate",
  alarmConfigDetail: "alarmConfigDetail",
  alarmConfigEdit: "alarmConfigEdit",
  alarmConfigCopy: "alarmConfigCopy",
  alarmConfigEnable: "alarmConfigEnable",
  alarmConfigDelete: "alarmConfigDelete",
} as const;

export type GemActionKey = (typeof GEM_ACTION_KEYS)[keyof typeof GEM_ACTION_KEYS];
