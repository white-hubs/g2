import type { LegacyMicroAppConfig } from "./qiankun-bridge";

/**
 * Legacy application identifiers are external deployment contracts, not names
 * that can be safely guessed by normalization. Keep every alias explicit so a
 * local Domain only suppresses the qiankun applications it actually replaces.
 */
export const LEGACY_QIANKUN_NAMES_BY_DOMAIN: Record<string, readonly string[]> = {
  assetManagement: ["asset-management"],
  workReport: ["work-report"],
  // 旧门户 config.js 的原始注册名，不能对名称做归一化推测。
  meetRoom: ["meet-room"],
  governmentManagement: ["governmentManagement"],
  // 旧门户 config.js 以 ConsumptionManagement 注册，大小写不可归一化推测。
  consumptionManagement: ["ConsumptionManagement"],
  personManagement: ["personalManagement"],
  factoryManagement: ["factorymanagement-migrate"],
  knowledgeDocument: ["cube-knowledge-document-app"],
  technicalBulletin: ["technicalBulletin"],
  electronicPatrol: ["electronic-patrol"],
  workOrderCenter: ["cube-work-order-center-app"],
  formAudit: ["cube-form-audit-app", "form-audit", "formAudit", "FormAudit"],
  commandDispatch: ["command-dispatch-config"],
  // user-center 同时承载 USER_CENTER 与 LOGMANAGEMENT；本地只在两域都覆盖时卸载旧宿主。
  userCenter: ["user-center"],
  logManagement: ["user-center"],
  secureEduHead: ["secure-edu"],
  secureEdu: ["secure-edu"],
  accessControl: ["access-control", "accesscontrol", "accessControl", "AccessControl"],
  intruderAlarm: ["intruder-alarm", "intruderAlarm", "IntruderAlarm"],
  dailyTask: ["daily-task", "dailyTask", "DailyTask"],
  dailyInspection: ["daily-inspection", "dailyInspection", "DailyInspection", "cube-daily-inspection", "cube-daily-inspection-app"],
  securityMonitor: [
    "security-monitor-migrate",
    "security-monitor",
    "securityMonitor",
    "SecurityMonitor",
    "video-monitor-auth",
    "videoMonitorAuth",
    "VideoMonitorAuth",
  ],
  safetyManagementHead: ["safety-manage-head", "safetyManagementHead", "SafetyManagementHead"],
  safetyManagement: ["safety-manage-market", "safetyManagement", "SafetyManagement"],
  safetyDuty: ["safety-duty", "safetyDuty", "SafetyDuty", "cube-safety-duty", "cube-safety-duty-app"],
  safetyPersonnelManagement: [
    "safety-personnel-management",
    "safetyPersonnelManagement",
    "SafetyPersonnelManagement",
    "cube-safety-personnel-management",
    "cube-safety-personnel-management-app",
  ],
  fireManagement: ["fire-management", "fireManagement", "FireManagement", "cube-fire-management", "cube-fire-management-app"],
  emergencyManagement: ["emergency-management-migrate", "emergency-management", "cube-emergency-management"],
  emergencyDispatch: ["emergency-dispatch", "emergencyDispatch", "EmergencyDispatch"],
  safetyCredit: ["safety-credit"],
  electricalSafety: ["electrical-safety"],
  emergencySupplies: ["emergency-supplies"],
  fumigationOperation: ["fumigation-operation", "fumigationOperation", "FumigationOperation", "cube-fumigation-operation-app"],
  hazardGovernance: ["hazard-governance", "hazardGovernance", "HazardGovernance"],
  // 旧门户以 problems 注册隐患排查，流程渲染器由独立 page-library 承接。
  attendance: ["attendance"],
  problems: ["problems", "problems-migrate"],
  faultRepair: ["legacy-fault", "fault", "fault-migrate"],
  maintenance: ["legacy-maintenance", "maintenance", "maintenance-migrate"],
  // 旧门户以 outsourcing 注册委外维修，vite projectName 为 outsource-migrate。
  outsourceRepair: ["outsourcing", "outsource-migrate", "outsource"],
  // 旧门户 vite projectName 为 renovation-migrate。
  renovation: ["renovation-migrate", "renovation", "retrofit"],
  smallEngineering: ["small-engineering"],
  // 现网 FRONTEND_CONFIG 以 complaint 注册名挂同一套 fault 前端。
  complaint: ["complaint"],
  streamEngine: ["flow-engine", "stream-engine-config", "streamEngine", "stream-engine"],
  streamEnginePages: ["stream-engine-render", "streamEngineRender", "streamengine-pc"],
  riskGradedControl: ["risk-graded-control", "riskGradedControl", "RiskGradedControl"],
  warehouseSafety: ["warehouse-safety", "warehouseSafety", "WarehouseSafety", "cube-warehouse-safety-app"],
  // 旧应用 vite 的 projectName 明确为 risk-management，按需启动时仅过滤这一应用，禁止名称猜测。
  riskManagement: ["risk-management"],
  genericEquipmentMonitorPages: ["genericEquipmentMonitor", "generic-equipment-monitor", "genericEquipmentMonitorPages"],
  energyConsumption: [
    "energy-consumption",
    "energy-consumption-migrate",
    "energyConsumption",
    "EnergyConsumption",
    "energymanagement",
    "energy",
  ],
  rotatingManagement: ["rotating-management", "rotatingManagement", "RotatingManagement"],
  // 线上「线损管理」菜单指向 graphEditor/lineLoss；采集等页在 line-loss-management。本地 Domain 同时替换这两类旧应用。
  lineLossManagement: ["line-loss-management", "graph-editor", "graphEditor", "cube-graph-editor-app"],
  broadcastCenter: [
    "broadcast-center",
    "broadcastCenter",
    "BroadcastCenter",
    "broadcast-migrate",
    "cube-broadcast-center",
    "cube-broadcast-center-app",
  ],
};

const MIGRATED_QIANKUN_APP_NAMES = new Set(Object.values(LEGACY_QIANKUN_NAMES_BY_DOMAIN).flat());

const WORKBENCH_QIANKUN_APP_NAMES = new Set(["cube-workbench-app", "cube-workbench", "workbench", "workbench-migrate", "Workbench"]);

/**
 * 从运行时 `window.config.microApps` 清单中摘掉已迁入 MF 的应用，避免与 `/d/{appRegistryCode}` 双轨。
 */
export function filterMigratedQiankunApps(microApps: LegacyMicroAppConfig[]): LegacyMicroAppConfig[] {
  return microApps.filter((app) => !MIGRATED_QIANKUN_APP_NAMES.has(app.name) && !WORKBENCH_QIANKUN_APP_NAMES.has(app.name));
}

/**
 * 本地兼容模式下，目标环境仍通过 qiankun 提供未启动的业务应用。
 * 仅过滤已经由本地 MF 覆盖的同名应用；工作台始终由专用容器注册，不能重复注册到 #appContainer。
 */
export function filterLocallyOverriddenQiankunApps(
  microApps: LegacyMicroAppConfig[],
  localRemoteNames: Iterable<string>,
): LegacyMicroAppConfig[] {
  const localNames = new Set(Array.from(localRemoteNames));
  const overriddenQiankunNames = new Set(Array.from(localNames, (logicalName) => LEGACY_QIANKUN_NAMES_BY_DOMAIN[logicalName] ?? []).flat());
  if (!localNames.has("userCenter") || !localNames.has("logManagement")) {
    overriddenQiankunNames.delete("user-center");
  }
  if (!localNames.has("secureEdu") || !localNames.has("secureEduHead")) {
    overriddenQiankunNames.delete("secure-edu");
  }
  return microApps.filter((app) => !WORKBENCH_QIANKUN_APP_NAMES.has(app.name) && !overriddenQiankunNames.has(app.name));
}
