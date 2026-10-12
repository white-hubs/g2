import { GEM_ACTION_KEYS, GEM_PAGE_KEYS, type GemCapabilityCodes } from "@g2-pages/generic-equipment-monitor/contract";

export const SECURITY_MONITOR_GEM_CAPABILITY_CODES: GemCapabilityCodes = {
  page: {
    [GEM_PAGE_KEYS.overView]: "GEM_OVERVIEW",
    [GEM_PAGE_KEYS.equipmentMonitorList]: "GEM_EQUIPMENT_LIST",
    [GEM_PAGE_KEYS.equipmentMonitorDetail]: "GEM_EQUIPMENT_DETAIL",
    [GEM_PAGE_KEYS.alarmRecord]: "GEM_ALARM",
    [GEM_PAGE_KEYS.alarmDetail]: "GEM_ALARM_DETAIL",
    [GEM_PAGE_KEYS.alarmRecordSafety]: "GEM_ALARM_SAFETY",
    [GEM_PAGE_KEYS.alarmSafetyDetail]: "GEM_ALARM_SAFETY_DETAIL",
    [GEM_PAGE_KEYS.alarmConfigList]: "GEM_ALARM_CONFIG",
    [GEM_PAGE_KEYS.alarmConfigEnergyList]: "GEM_ALARM_CONFIG_ENERGY",
    [GEM_PAGE_KEYS.alarmConfigureAdd]: "GEM_ALARM_CONFIG_EDIT",
    [GEM_PAGE_KEYS.alarmStatistic]: "GEM_ALARM_STAT",
    [GEM_PAGE_KEYS.alarmDrillRecord]: "GEM_ALARM_DRILL",
    [GEM_PAGE_KEYS.alarmHandelStatistics]: "GEM_ALARM_HANDLE_STAT",
    [GEM_PAGE_KEYS.alarmAnalysis]: "GEM_ALARM_ANALYSIS",
    [GEM_PAGE_KEYS.applicationEquipment]: "GEM_ALARM_DEVICE",
    [GEM_PAGE_KEYS.configuration]: "GEM_CONFIGURATION",
  },
  action: {
    [GEM_ACTION_KEYS.exportAlarm]: "GEM_ALARM_EXPORT",
    // ghcloud 的报警记录菜单仅下发 GEM_ALARM 页面权限，处置动作（指派、挂起、处理）
    // 并没有独立的按钮权限码。迁移期间沿用该授权边界，避免页面可见但操作入口被隐藏。
    [GEM_ACTION_KEYS.ackAlarm]: "GEM_ALARM",
    [GEM_ACTION_KEYS.alarmRecordDelete]: "GEM_ALARM_DELETE",
    // ghcloud 的报警配置列表只按菜单权限控制；当前菜单授权中没有上述独立按钮码。
    // 复用页面码，保证已能进入“报警配置”的用户可看到与旧系统一致的操作列。
    [GEM_ACTION_KEYS.alarmConfigCreate]: "GEM_ALARM_CONFIG",
    [GEM_ACTION_KEYS.alarmConfigDetail]: "GEM_ALARM_CONFIG",
    [GEM_ACTION_KEYS.alarmConfigEdit]: "GEM_ALARM_CONFIG",
    [GEM_ACTION_KEYS.alarmConfigCopy]: "GEM_ALARM_CONFIG",
    [GEM_ACTION_KEYS.alarmConfigEnable]: "GEM_ALARM_CONFIG",
    [GEM_ACTION_KEYS.alarmConfigDelete]: "GEM_ALARM_CONFIG",
  },
};
