type RuntimeImporter = () => Promise<unknown>;
const WORKSPACE_ROOT_GLOBAL_KEY = "__G2_DEV_WORKSPACE_ROOT__";

export type LocalRuntimeMode = "legacy-compat" | "g2-profile";

export interface LocalRuntimeState {
  mode: LocalRuntimeMode;
  localRemoteNames: readonly string[];
}

function workspaceRoot(): string {
  const value = (globalThis as Record<string, unknown>)[WORKSPACE_ROOT_GLOBAL_KEY];
  return typeof value === "string" ? value : "";
}

const PLATFORM_DIRECTORIES: Record<string, string> = {
  datePlatform: "date",
  loggerPlatform: "logger",
  resourcePlatform: "resource",
  httpPlatform: "http",
  pcChrome: "pc-chrome",
  pcAuth: "pc-auth",
  pcUi: "pc-ui",
  pcChart: "pc-chart",
  pcIotSocket: "pc-iot-socket",
  pcMap: "pc-map",
  pcAlarmCharts: "pc-alarm-charts",
  pcVisualSdk: "pc-visual-sdk",
  pcPlayer: "pc-player",
  pcGraphEditor: "pc-graph-editor",
  pcScada: "pc-scada",
  pcMessaging: "pc-messaging",
  pcRtc: "pc-rtc",
  pcAlarmPopup: "pc-alarm-popup",
  pcAiAssistant: "pc-ai-assistant",
};
const PLATFORM_MODULE_FILES = new Set(["pcChrome", "pcAuth", "pcMessaging", "pcRtc", "pcAlarmPopup", "pcAiAssistant"]);
const PLATFORM_CLIENT_FILES: Record<string, string> = { httpPlatform: "platform.ts" };
const CLIENT_DIRECTORIES: Record<string, string> = {
  assetManagementClient: "asset-management",
  workReportClient: "work-report",
  meetRoomClient: "meet-room",
  governmentManagementClient: "government-management",
  consumptionManagementClient: "consumption-management",
  personManagementClient: "person-management",
  factoryManagementClient: "factory-management",
  knowledgeDocumentClient: "knowledge-document",
  technicalBulletinClient: "technical-bulletin",
  electronicPatrolClient: "electronic-patrol",
  workOrderCenterClient: "work-order-center",
  formAuditClient: "form-audit",
  commandDispatchClient: "command-dispatch",
  userCenterClient: "user-center",
  resourceManagementClient: "resource-management",
  businessConfigClient: "business-config",
  linkageControlClient: "linkage-control",
  secureEduClient: "secure-edu",
  accessControlClient: "access-control",
  dailyTaskClient: "daily-task",
  securityMonitorClient: "security-monitor",
  fireManagementClient: "fire-management",
  emergencyManagementClient: "emergency-management",
  emergencyDispatchClient: "emergency-dispatch",
  hazardGovernanceClient: "hazard-governance",
  attendanceClient: "attendance",
  problemsClient: "problems",
  faultRepairClient: "fault-repair",
  maintenanceClient: "maintenance",
  outsourceRepairClient: "outsource-repair",
  renovationClient: "renovation",
  smallEngineeringClient: "small-engineering",
  streamEngineClient: "stream-engine",
  riskGradedControlClient: "risk-graded-control",
  // riskManagement 日常按需开发只启动 Domain，Client 由 Shell 从工作区源码加载。
  riskManagementClient: "risk-management",
  dailyInspectionClient: "daily-inspection",
  energyConsumptionClient: "energy-consumption",
  lineLossManagementClient: "line-loss-management",
  workbenchClient: "workbench",
  broadcastCenterClient: "broadcast-center",
  messageClient: "message",
  authClient: "auth",
  ouaaClient: "ouaa",
  fileClient: "file",
  mdataClient: "mdata",
  deviceCenterClient: "device-center",
  alarmCenterClient: "alarm-center",
  headquartersMarketClient: "headquarters-market",
  coldStorageClient: "cold-storage",
  dictionaryClient: "dictionary",
  safetyCreditClient: "safety-credit",
  electricalSafetyClient: "electrical-safety",
  emergencySuppliesClient: "emergency-supplies",
  fumigationOperationClient: "fumigation-operation",
  inspectionAiClient: "inspection-ai",
  intelligentGrainClient: "intelligent-grain",
  metadataClient: "metadata",
  processEngineClient: "process-engine",
  safetyPersonnelClient: "safety-personnel",
  securityOpinionClient: "security-opinion",
  templateDemoClient: "template-demo",
  videoMonitorClient: "video-monitor",
  warehouseSafetyClient: "warehouse-safety",
  workPermitClient: "work-permit",
};
const DOMAIN_CLIENTS: Record<string, string> = {
  assetManagement: "assetManagementClient",
  workReport: "workReportClient",
  meetRoom: "meetRoomClient",
  governmentManagement: "governmentManagementClient",
  consumptionManagement: "consumptionManagementClient",
  personManagement: "personManagementClient",
  factoryManagement: "factoryManagementClient",
  knowledgeDocument: "knowledgeDocumentClient",
  technicalBulletin: "technicalBulletinClient",
  electronicPatrol: "electronicPatrolClient",
  workOrderCenter: "workOrderCenterClient",
  formAudit: "formAuditClient",
  commandDispatch: "commandDispatchClient",
  userCenter: "userCenterClient",
  logManagement: "mdataClient",
  resourceManagement: "resourceManagementClient",
  businessConfig: "businessConfigClient",
  linkageControl: "linkageControlClient",
  secureEduHead: "secureEduClient",
  secureEdu: "secureEduClient",
  accessControl: "accessControlClient",
  dailyTask: "dailyTaskClient",
  securityMonitor: "securityMonitorClient",
  safetyPersonnelManagement: "safetyPersonnelClient",
  fireManagement: "fireManagementClient",
  emergencyManagement: "emergencyManagementClient",
  emergencyDispatch: "emergencyDispatchClient",
  safetyCredit: "safetyCreditClient",
  electricalSafety: "electricalSafetyClient",
  emergencySupplies: "emergencySuppliesClient",
  fumigationOperation: "fumigationOperationClient",
  hazardGovernance: "hazardGovernanceClient",
  attendance: "attendanceClient",
  problems: "problemsClient",
  faultRepair: "faultRepairClient",
  complaint: "faultRepairClient",
  maintenance: "maintenanceClient",
  outsourceRepair: "outsourceRepairClient",
  renovation: "renovationClient",
  smallEngineering: "smallEngineeringClient",
  streamEngine: "streamEngineClient",
  riskGradedControl: "riskGradedControlClient",
  warehouseSafety: "warehouseSafetyClient",
  riskManagement: "riskManagementClient",
  dailyInspection: "dailyInspectionClient",
  energyConsumption: "energyConsumptionClient",
  lineLossManagement: "lineLossManagementClient",
  workbench: "workbenchClient",
  broadcastCenter: "broadcastCenterClient",
};

const PAGE_LIBRARY_SOURCES: Record<string, { path: string; owners: readonly string[] }> = {
  secureEduPages: { path: "apps/page-libraries/secure-edu/src/index.ts", owners: ["secureEdu", "secureEduHead"] },
};

function importWorkspaceSource(relativePath: string): RuntimeImporter {
  return () => import(/* @vite-ignore */ `/@fs${workspaceRoot()}/${relativePath}`);
}

/** 用局域网 IP 打开 Shell 时，跨端口拉 Platform/Client remoteEntry 会踩 CORS；改走同壳 /@fs。 */
export function isLanBrowserHost(hostname = globalThis.location?.hostname): boolean {
  return Boolean(hostname && hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "[::1]");
}

/** 已注册 Remote 是否仍走 MF；局域网下的 Platform/Client 返回 false（改走 workspace）。 */
export function shouldLoadRegisteredRemote(
  remoteName: string,
  state: LocalRuntimeState,
  hostname = globalThis.location?.hostname,
): boolean {
  if (!state.localRemoteNames.includes(remoteName)) {
    return false;
  }
  const isPlatformOrClient = Boolean(PLATFORM_DIRECTORIES[remoteName] || CLIENT_DIRECTORIES[remoteName]);
  return !(isLanBrowserHost(hostname) && isPlatformOrClient);
}

/**
 * Resolve workspace modules only after the dev server has decided their source.
 * A registered Remote always wins: returning undefined lets Module Federation use
 * its registered local manifest and preserves the actual Remote/HMR boundary.
 */
export function loadLocalDevRuntimeModule(remoteName: string, exposed: string, state: LocalRuntimeState): Promise<unknown> | undefined {
  // 局域网访问：已注册的 Platform/Client 仍优先 workspace，避免跨端口 CORS；Domain Remote 继续走 MF。
  if (shouldLoadRegisteredRemote(remoteName, state)) {
    return undefined;
  }
  const platformDirectory = PLATFORM_DIRECTORIES[remoteName];
  if (platformDirectory && state.mode === "legacy-compat") {
    const root = `apps/platforms/${platformDirectory}/src`;
    const file =
      exposed === "client"
        ? (PLATFORM_CLIENT_FILES[remoteName] ?? "platform-module.ts")
        : exposed === "platform"
          ? PLATFORM_MODULE_FILES.has(remoteName)
            ? "platform.ts"
            : "platform-module.ts"
          : exposed === "api" || exposed === "index"
            ? "index.ts"
            : `${exposed}.ts`;
    return importWorkspaceSource(`${root}/${file}`)();
  }
  const clientPath = workspaceClientSourcePath(remoteName, exposed, state);
  if (clientPath) {
    return importWorkspaceSource(clientPath)();
  }
  const pageLibraryPath = workspacePageLibrarySourcePath(remoteName, exposed, state);
  if (pageLibraryPath) {
    return importWorkspaceSource(pageLibraryPath)();
  }
  return undefined;
}

/** 开发期仅随本地所属 Domain 加载正式页面库源码；已注册的页面库仍保留 MF/HMR 边界。 */
export function workspacePageLibrarySourcePath(remoteName: string, exposed: string, state: LocalRuntimeState): string | undefined {
  const library = PAGE_LIBRARY_SOURCES[remoteName];
  return library && exposed === "pages" && library.owners.some((owner) => state.localRemoteNames.includes(owner))
    ? library.path
    : undefined;
}

/** 仅在 Client Remote 未启动时启用源码回退，避免吞掉真实 MF 与 HMR 边界。 */
export function workspaceClientSourcePath(remoteName: string, exposed: string, state: LocalRuntimeState): string | undefined {
  const clientDirectory = CLIENT_DIRECTORIES[remoteName];
  const owner = Object.entries(DOMAIN_CLIENTS).find(([, client]) => client === remoteName)?.[0];
  const shouldUseWorkspaceClient = state.mode === "legacy-compat" || (owner !== undefined && state.localRemoteNames.includes(owner));
  return clientDirectory && shouldUseWorkspaceClient && exposed === "client" ? `apps/clients/${clientDirectory}/src/client.ts` : undefined;
}
