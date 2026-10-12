import { GEM_ACTION_KEYS, GEM_PAGE_KEYS, type GemCapabilityCodes } from "@g2-pages/generic-equipment-monitor/contract";

export const ROTATING_MANAGEMENT_GEM_CAPABILITY_CODES: GemCapabilityCodes = {
  page: {
    [GEM_PAGE_KEYS.overView]: "GEM_OVERVIEW",
    [GEM_PAGE_KEYS.equipmentMonitorList]: "GEM_EQUIPMENT_LIST",
    [GEM_PAGE_KEYS.equipmentMonitorDetail]: "GEM_EQUIPMENT_DETAIL",
    [GEM_PAGE_KEYS.alarmRecord]: "GEM_ALARM",
    [GEM_PAGE_KEYS.alarmDetail]: "GEM_ALARM_DETAIL",
    [GEM_PAGE_KEYS.alarmConfigList]: "GEM_ALARM_CONFIG",
    [GEM_PAGE_KEYS.alarmConfigureAdd]: "GEM_ALARM_CONFIG_EDIT",
    [GEM_PAGE_KEYS.alarmStatistic]: "GEM_ALARM_STAT",
    [GEM_PAGE_KEYS.alarmHandelStatistics]: "GEM_ALARM_HANDLE_STAT",
    [GEM_PAGE_KEYS.alarmAnalysis]: "GEM_ALARM_ANALYSIS",
    [GEM_PAGE_KEYS.applicationEquipment]: "GEM_ALARM_DEVICE",
    [GEM_PAGE_KEYS.configuration]: "GEM_CONFIGURATION",
  },
  action: {
    [GEM_ACTION_KEYS.exportAlarm]: "GEM_ALARM_EXPORT",
    [GEM_ACTION_KEYS.ackAlarm]: "GEM_ALARM_ACK",
    [GEM_ACTION_KEYS.alarmRecordDelete]: "GEM_ALARM_DELETE",
    [GEM_ACTION_KEYS.alarmConfigCreate]: "GEM_ALARM_CONFIG_CREATE",
    [GEM_ACTION_KEYS.alarmConfigDetail]: "GEM_ALARM_CONFIG_DETAIL",
    [GEM_ACTION_KEYS.alarmConfigEdit]: "GEM_ALARM_CONFIG_EDIT",
    [GEM_ACTION_KEYS.alarmConfigCopy]: "GEM_ALARM_CONFIG_COPY",
    [GEM_ACTION_KEYS.alarmConfigEnable]: "GEM_ALARM_CONFIG_ENABLE",
    [GEM_ACTION_KEYS.alarmConfigDelete]: "GEM_ALARM_CONFIG_DELETE",
  },
};
