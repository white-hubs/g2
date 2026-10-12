import * as NodeFs from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

export interface SourceProfileLike {
  platform: { logicalName?: string }[];
  client?: { logicalName?: string }[];
  pageLibrary?: { logicalName?: string }[];
  inline: { package: string }[];
  remotes: { logicalName?: string }[];
}

/** Profile logicalName → workspace package；与 cli 输出保持同一张表。 */
export const logicalNameToPackage: Record<string, string> = {
  assetManagement: "@g2-domain/asset-management",
  assetManagementClient: "@g2-client/asset-management",
  workReport: "@g2-domain/work-report",
  workReportClient: "@g2-client/work-report",
  meetRoom: "@g2-domain/meet-room",
  meetRoomClient: "@g2-client/meet-room",
  governmentManagement: "@g2-domain/government-management",
  governmentManagementClient: "@g2-client/government-management",
  consumptionManagement: "@g2-domain/consumption-management",
  consumptionManagementClient: "@g2-client/consumption-management",
  personManagement: "@g2-domain/person-management",
  personManagementClient: "@g2-client/person-management",
  factoryManagement: "@g2-domain/factory-management",
  factoryManagementClient: "@g2-client/factory-management",
  knowledgeDocument: "@g2-domain/knowledge-document",
  knowledgeDocumentClient: "@g2-client/knowledge-document",
  technicalBulletin: "@g2-domain/technical-bulletin",
  technicalBulletinClient: "@g2-client/technical-bulletin",
  electronicPatrol: "@g2-domain/electronic-patrol",
  electronicPatrolClient: "@g2-client/electronic-patrol",
  workOrderCenter: "@g2-domain/work-order-center",
  workOrderCenterClient: "@g2-client/work-order-center",
  formAudit: "@g2-domain/form-audit",
  formAuditClient: "@g2-client/form-audit",
  commandDispatch: "@g2-domain/command-dispatch",
  commandDispatchClient: "@g2-client/command-dispatch",
  userCenter: "@g2-domain/user-center",
  userCenterClient: "@g2-client/user-center",
  logManagement: "@g2-domain/log-management",
  resourceManagement: "@g2-domain/resource-management",
  resourceManagementClient: "@g2-client/resource-management",
  businessConfig: "@g2-domain/business-config",
  businessConfigClient: "@g2-client/business-config",
  linkageControl: "@g2-domain/linkage-control",
  linkageControlClient: "@g2-client/linkage-control",
  todoCenter: "@g2-domain/todo-center",
  todoCenterClient: "@g2-client/todo-center",
  secureEduHead: "@g2-domain/secure-edu",
  secureEdu: "@g2-domain/secure-edu-market",
  secureEduPages: "@g2-pages/secure-edu",
  secureEduClient: "@g2-client/secure-edu",
  datePlatform: "@g2-platform/date",
  loggerPlatform: "@g2-platform/logger",
  resourcePlatform: "@g2-platform/resource",
  httpPlatform: "@g2-platform/http",
  messageClient: "@g2-client/message",
  authClient: "@g2-client/auth",
  ouaaClient: "@g2-client/ouaa",
  fileClient: "@g2-client/file",
  mdataClient: "@g2-client/mdata",
  deviceCenterClient: "@g2-client/device-center",
  alarmCenterClient: "@g2-client/alarm-center",
  dictionaryClient: "@g2-client/dictionary",
  pcChrome: "@g2-platform/pc-chrome",
  pcAuth: "@g2-platform/pc-auth",
  pcUi: "@g2-platform/pc-ui",
  pcChart: "@g2-platform/pc-chart",
  pcIotSocket: "@g2-platform/pc-iot-socket",
  pcMap: "@g2-platform/pc-map",
  pcAlarmCharts: "@g2-platform/pc-alarm-charts",
  pcVisualSdk: "@g2-platform/pc-visual-sdk",
  pcPlayer: "@g2-platform/pc-player",
  pcGraphEditor: "@g2-platform/pc-graph-editor",
  pcScada: "@g2-platform/pc-scada",
  pcMessaging: "@g2-platform/pc-messaging",
  pcRtc: "@g2-platform/pc-rtc",
  pcAlarmPopup: "@g2-platform/pc-alarm-popup",
  pcAiAssistant: "@g2-platform/pc-ai-assistant",
  pocRemotePc: "@g2-domain/poc-remote-pc",
  accessControl: "@g2-domain/access-control",
  intruderAlarm: "@g2-domain/intruder-alarm",
  gasManagement: "@g2-domain/gas-management",
  riskManagement: "@g2-domain/risk-management",
  dailyTaskClient: "@g2-client/daily-task",
  dailyTask: "@g2-domain/daily-task",
  securityMonitor: "@g2-domain/security-monitor",
  securityMonitorClient: "@g2-client/security-monitor",
  securityOpinionMonitoring: "@g2-domain/security-opinion-monitoring",
  securityOpinionClient: "@g2-client/security-opinion",
  fireManagement: "@g2-domain/fire-management",
  emergencyManagement: "@g2-domain/emergency-management",
  emergencyDispatch: "@g2-domain/emergency-dispatch",
  safetyCredit: "@g2-domain/safety-credit",
  safetyCreditClient: "@g2-client/safety-credit",
  electricalSafety: "@g2-domain/electrical-safety",
  electricalSafetyClient: "@g2-client/electrical-safety",
  emergencySupplies: "@g2-domain/emergency-supplies",
  fumigationOperation: "@g2-domain/fumigation-operation",
  energyConsumption: "@g2-domain/energy-consumption",
  lineLossManagement: "@g2-domain/line-loss-management",
  hazardGovernance: "@g2-domain/hazard-governance",
  attendance: "@g2-domain/attendance",
  attendanceClient: "@g2-client/attendance",
  problems: "@g2-domain/problems",
  faultRepair: "@g2-domain/fault-repair",
  maintenance: "@g2-domain/maintenance",
  outsourceRepair: "@g2-domain/outsource-repair",
  renovation: "@g2-domain/renovation",
  smallEngineering: "@g2-domain/small-engineering",
  complaint: "@g2-domain/complaint",
  streamEngine: "@g2-domain/stream-engine",
  riskGradedControl: "@g2-domain/risk-graded-control",
  warehouseSafety: "@g2-domain/warehouse-safety",
  fireManagementClient: "@g2-client/fire-management",
  emergencyManagementClient: "@g2-client/emergency-management",
  emergencyDispatchClient: "@g2-client/emergency-dispatch",
  emergencySuppliesClient: "@g2-client/emergency-supplies",
  fumigationOperationClient: "@g2-client/fumigation-operation",
  energyConsumptionClient: "@g2-client/energy-consumption",
  lineLossManagementClient: "@g2-client/line-loss-management",
  workbench: "@g2-domain/workbench",
  workbenchClient: "@g2-client/workbench",
  broadcastCenter: "@g2-domain/broadcast-center",
  broadcastCenterClient: "@g2-client/broadcast-center",
  hazardGovernanceClient: "@g2-client/hazard-governance",
  problemsClient: "@g2-client/problems",
  faultRepairClient: "@g2-client/fault-repair",
  maintenanceClient: "@g2-client/maintenance",
  outsourceRepairClient: "@g2-client/outsource-repair",
  renovationClient: "@g2-client/renovation",
  smallEngineeringClient: "@g2-client/small-engineering",
  streamEngineClient: "@g2-client/stream-engine",
  riskGradedControlClient: "@g2-client/risk-graded-control",
  warehouseSafetyClient: "@g2-client/warehouse-safety",
  riskManagementClient: "@g2-client/risk-management",
  dailyInspection: "@g2-domain/daily-inspection",
  dailyInspectionClient: "@g2-client/daily-inspection",
  accessControlClient: "@g2-client/access-control",
  genericEquipmentMonitorPages: "@g2-pages/generic-equipment-monitor",
  streamEnginePages: "@g2-pages/stream-engine",
};

/**
 * 已登录冷启动首屏硬依赖（shell + chrome 壳 + 库型 Platform + pc-ui + authClient）。
 * 必须先于 domain/client 起 Vite，否则几十个 optimizeDeps 会饿死 pcChrome，
 * 浏览器会卡在 runPlatformInstalls(authenticated chrome) 直至超时。
 * authClient：pcAuth.install 内 `ensureClient("authClient")` 硬依赖，不进 stage-1 会 RUNTIME-003。
 */
export const CHROME_BOOTSTRAP_PACKAGES = [
  "@g2-shell/pc",
  "@g2-platform/date",
  "@g2-platform/logger",
  "@g2-platform/resource",
  "@g2-platform/http",
  "@g2-platform/pc-ui",
  "@g2-platform/pc-chrome",
  "@g2-platform/pc-auth",
  "@g2-client/auth",
] as const;

/** 与 vite.config server.port 对齐；stage-1 轮询这些端口 ready。优先 remoteEntry（mf-manifest 可能被 DTS 拖住）。 */
export const CHROME_BOOTSTRAP_PORTS: readonly { packageName: string; port: number; probePath: string }[] = [
  { packageName: "@g2-shell/pc", port: 5100, probePath: "/" },
  { packageName: "@g2-platform/pc-auth", port: 5010, probePath: "/remoteEntry.js" },
  { packageName: "@g2-platform/pc-chrome", port: 5011, probePath: "/remoteEntry.js" },
  { packageName: "@g2-platform/http", port: 5015, probePath: "/remoteEntry.js" },
  { packageName: "@g2-platform/pc-ui", port: 5016, probePath: "/remoteEntry.js" },
  { packageName: "@g2-platform/logger", port: 5017, probePath: "/remoteEntry.js" },
  { packageName: "@g2-platform/resource", port: 5018, probePath: "/remoteEntry.js" },
  { packageName: "@g2-platform/date", port: 5019, probePath: "/remoteEntry.js" },
  { packageName: "@g2-client/auth", port: 5021, probePath: "/remoteEntry.js" },
];

export type DevFilterMode = "all" | "chrome" | "rest";

export function resolveRepoRoot(cwd = process.cwd()): string {
  return process.env.npm_config_local_prefix ?? cwd;
}

export function loadSourceProfile(inputPath: string, repoRoot = resolveRepoRoot()): SourceProfileLike {
  const profilePath = isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
  return parseYaml(NodeFs.readFileSync(profilePath, "utf8")) as SourceProfileLike;
}

export function collectProfilePackages(profile: SourceProfileLike): Set<string> {
  const packages = new Set<string>(["@g2-shell/pc"]);
  for (const item of profile.platform) {
    if (item.logicalName && logicalNameToPackage[item.logicalName]) {
      packages.add(logicalNameToPackage[item.logicalName]);
    }
  }
  for (const item of profile.client ?? []) {
    if (item.logicalName && logicalNameToPackage[item.logicalName]) {
      packages.add(logicalNameToPackage[item.logicalName]);
    }
  }
  for (const item of profile.inline) {
    packages.add(item.package);
  }
  for (const item of profile.pageLibrary ?? []) {
    if (item.logicalName && logicalNameToPackage[item.logicalName]) {
      packages.add(logicalNameToPackage[item.logicalName]);
    }
  }
  for (const item of profile.remotes) {
    if (item.logicalName && logicalNameToPackage[item.logicalName]) {
      packages.add(logicalNameToPackage[item.logicalName]);
    }
  }
  return packages;
}

export function selectPackages(all: Set<string>, mode: DevFilterMode): string[] {
  const chromeSet = new Set<string>(CHROME_BOOTSTRAP_PACKAGES);
  if (mode === "chrome") {
    // 固定首屏集合：不依赖 profile 是否漏写，避免 pcAuth 装载时缺 authClient。
    return [...CHROME_BOOTSTRAP_PACKAGES];
  }
  if (mode === "rest") {
    return Array.from(all)
      .filter((name) => !chromeSet.has(name))
      .toSorted();
  }
  return Array.from(all).toSorted();
}

export function toTurboFilters(packages: readonly string[]): string {
  return packages.map((name) => `--filter=${name}`).join(" ");
}
