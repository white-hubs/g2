/**
 * OUAA 安防监控菜单仍保存旧 qiankun `/portal/*` 地址；G2 只注册 `/d/security-monitor/*`。
 * 这里是两套路由之间唯一、可审计的映射，禁止再按页面名称猜测或复用相似页面。
 */
export const SECURITY_MONITOR_OUAA_ROUTE_MAP = {
  "/portal/video-monitor-auth/ai-inspection/plans": "/d/security-monitor/ai-inspection/plans",
  "/portal/video-monitor-auth/ai-inspection/tasks": "/d/security-monitor/ai-inspection/tasks",
  "/portal/securityMonitoring/overView": "/d/security-monitor/overView",
  "/portal/video-monitor-auth/permissions": "/d/security-monitor/permissions",
  "/portal/securityMonitoring/multipleVideo": "/d/security-monitor/multipleVideo",
  "/portal/securityMonitoring/patrolLine": "/d/security-monitor/patrolLine",
  "/portal/securityMonitoring/patrolRecord": "/d/security-monitor/patrolRecord",
  "/portal/genericEquipmentMonitor/alarmRecord": "/d/security-monitor/alarmRecord",
  "/portal/securityMonitoring/alarmRulesList": "/d/security-monitor/alarmRulesList",
  "/portal/securityMonitoring/alarmStatistics": "/d/security-monitor/alarmStatistics",
  "/portal/securityMonitoring/alarmHandelStatistics": "/d/security-monitor/alarmHandelStatistics",
  "/portal/securityMonitoring/patrolStatistics": "/d/security-monitor/patrolStatistics",
  "/portal/securityMonitoring/safetyAnalysis": "/d/security-monitor/safetyAnalysis",
  "/portal/legacy-business-config/newMessageNotice": "/d/security-monitor/message-notice",
  "/portal/generic-equipment/equipment-association": "/d/security-monitor/equipment-association",
} as const;

export type MigratedSecurityMonitorOuaaPath = keyof typeof SECURITY_MONITOR_OUAA_ROUTE_MAP;

/** 尚未迁入任何 G2 Domain；在完成真实页面迁移前不进入安防 Domain 菜单。 */
export const SECURITY_MONITOR_DEFERRED_OUAA_ROUTES = [
  "/portal/alarm-center/alarm-handler-sub-config",
  "/portal/alarm-center/alarm-event-record",
  "/portal/security-management/monitoring-group",
] as const;

export function securityMonitorRouteFor(path: MigratedSecurityMonitorOuaaPath): string {
  return SECURITY_MONITOR_OUAA_ROUTE_MAP[path];
}
