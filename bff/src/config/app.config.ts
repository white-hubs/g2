/**
 * 应用配置
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const GATEWAY_PACKAGE_NAME = "@g2-server/bff";
const GATEWAY_ROOT_DIR = findGatewayRootDir(dirname(fileURLToPath(import.meta.url)));

export interface AppConfig {
  /**
   * 服务端口
   * @default 3000
   */
  port: number;

  /**
   * 主机名
   * @default '0.0.0.0'
   */
  hostname?: string;

  /**
   * 日志级别
   * @default 'info'
   */
  logLevel?: "debug" | "info" | "warn" | "error";

  /**
   * 视频监控后端服务地址
   */
  videoMonitorUrl?: string;

  /**
   * 设备中心后端服务地址
   */
  deviceCenterUrl?: string;

  /**
   * 人员后端服务地址
   */
  personnelUrl?: string;

  /**
   * 物资/风险源后端服务地址
   */
  propertyUrl?: string;

  /**
   * 元数据后端服务地址
   */
  metadataUrl?: string;

  /**
   * Ouaa后端服务地址
   */
  ouaaUrl?: string;

  /**
   * 字典后端服务地址
   */
  dictionaryUrl?: string;

  /** 指挥调度服务根地址（含 /dispatch）。 */
  dispatchUrl?: string;
  /** 融合通信服务根地址（含 /fusion-communicate）。 */
  fusionCommunicateUrl?: string;

  /**
   * 默认 OAuth client_id（登录 / refresh BFF 注入）
   */
  oauthClientId?: string;

  /**
   * 默认 OAuth client_secret
   */
  oauthClientSecret?: string;

  /**
   * 按 terminal / x-oauth-client 映射的 OAuth 凭证 JSON
   */
  oauthClientMap?: string;

  /**
   * 安全人员管理后端服务地址（开河 safety-personnel）
   */
  safetyPersonnelUrl?: string;

  /**
   * 门禁管理后端服务地址
   */
  accessControlUrl?: string;

  /** 安全管理后端服务地址（开河 securitymanagement，含舆情监测 /public-opinion）
   */
  securityManagementUrl?: string;

  /** 风险分级管控后端服务地址（开河 /risk-control） */
  riskControlUrl?: string;

  /**
   * 文件服务地址
   */
  fileServiceUrl?: string;

  /**
   * 日常巡检后端服务地址
   */
  dailyInspectionUrl?: string;

  /** 日常任务及其迁移期相邻服务的统一上游网关地址。 */
  dailyTaskUrl?: string;

  /** 安全教育历史服务网关地址（根地址，BFF 会显式拼接 `/api/...`）。 */
  secureEduUrl?: string;

  /** 安防监控（vmonitor）后端服务地址。 */
  securityMonitorUrl?: string;

  /**
   * AI Application 服务地址
   */
  aiApplicationUrl?: string;

  /**
   * 应急预案后端服务地址
   */
  emergencyUrl?: string;

  /**
   * 作业许可后端服务地址
   */
  workPermitUrl?: string;

  /**
   * 流程引擎后端服务地址
   */
  flowUrl?: string;
}

/**
 * 从环境变量加载配置
 */
function getCliArg(name: string): string | undefined {
  // 兼容 Bun / Node，并统一转为字符串，避免 number/undefined 触发类型问题
  const argv = (typeof Bun !== "undefined" ? Bun.argv : process.argv).slice(2).map((v) => String(v ?? ""));

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) {
      continue;
    }
    if (arg.startsWith(`--${name}=`)) {
      return arg.substring(name.length + 3);
    }
    if (arg === `--${name}` && i + 1 < argv.length) {
      return argv[i + 1];
    }
  }
  return undefined;
}

export function loadAppConfig(): AppConfig {
  const appJsonConfig = loadAppJsonConfig();
  const cliPort = getCliArg("port");
  const cliHostname = getCliArg("hostname");
  const cliLogLevel = getCliArg("log-level");
  const cliVideoMonitorUrl = getCliArg("video-monitor-url");
  const cliDeviceCenterUrl = getCliArg("device-center-url");
  const cliPersonnelUrl = getCliArg("personnel-url");
  const cliPropertyUrl = getCliArg("property-url");
  const cliMetadataUrl = getCliArg("metadata-url");
  const cliOuaaUrl = getCliArg("ouaa-url");
  const cliDictionaryUrl = getCliArg("dictionary-url");
  const cliDispatchUrl = getCliArg("dispatch-url");
  const cliFusionCommunicateUrl = getCliArg("fusion-communicate-url");
  const cliOauthClientId = getCliArg("oauth-client-id");
  const cliOauthClientSecret = getCliArg("oauth-client-secret");
  const cliOauthClientMap = getCliArg("oauth-client-map");
  const cliSafetyPersonnelUrl = getCliArg("safety-personnel-url");
  const cliAccessControlUrl = getCliArg("access-control-url");
  const cliSecurityManagementUrl = getCliArg("security-management-url");
  const cliRiskControlUrl = getCliArg("risk-control-url");
  const cliFileServiceUrl = getCliArg("file-service-url");
  const cliDailyInspectionUrl = getCliArg("daily-inspection-url");
  const cliDailyTaskUrl = getCliArg("daily-task-url");
  const cliSecureEduUrl = getCliArg("secure-edu-url");
  const cliSecurityMonitorUrl = getCliArg("security-monitor-url");
  const cliAiApplicationUrl = getCliArg("ai-application-url");
  const cliEmergencyUrl = getCliArg("emergency-url");
  const cliWorkPermitUrl = getCliArg("work-permit-url");
  const cliFlowUrl = getCliArg("flow-url");
  return {
    port: parseInt(cliPort ?? process.env.PORT ?? String(appJsonConfig.port ?? "3000"), 10),
    hostname: cliHostname ?? process.env.HOSTNAME ?? appJsonConfig.hostname ?? "0.0.0.0",
    logLevel: (cliLogLevel as any) ?? (process.env.LOG_LEVEL as any) ?? appJsonConfig.logLevel ?? "info",
    videoMonitorUrl: cliVideoMonitorUrl ?? process.env.VIDEO_MONITOR_URL ?? appJsonConfig.videoMonitorUrl ?? "http://192.168.0.243:3200",
    deviceCenterUrl: cliDeviceCenterUrl ?? process.env.DEVICE_CENTER_URL ?? appJsonConfig.deviceCenterUrl ?? "http://localhost:3200",
    personnelUrl: cliPersonnelUrl ?? process.env.PERSONNEL_URL ?? appJsonConfig.personnelUrl ?? "http://192.168.0.243:3200/personnel",
    propertyUrl: cliPropertyUrl ?? process.env.PROPERTY_URL ?? appJsonConfig.propertyUrl ?? "http://192.168.0.243:3200/property",
    metadataUrl: cliMetadataUrl ?? process.env.METADATA_URL ?? appJsonConfig.metadataUrl ?? "http://192.168.0.243:3200",
    ouaaUrl: cliOuaaUrl ?? process.env.OUAA_URL ?? appJsonConfig.ouaaUrl ?? "http://192.168.0.243:3200",
    dictionaryUrl: cliDictionaryUrl ?? process.env.DICTIONARY_URL ?? appJsonConfig.dictionaryUrl ?? "http://192.168.0.243:3200",
    dispatchUrl: cliDispatchUrl ?? process.env.DISPATCH_URL ?? appJsonConfig.dispatchUrl ?? "",
    fusionCommunicateUrl: cliFusionCommunicateUrl ?? process.env.FUSION_COMMUNICATE_URL ?? appJsonConfig.fusionCommunicateUrl ?? "",
    oauthClientId: cliOauthClientId ?? process.env.OAUTH_CLIENT_ID ?? appJsonConfig.oauthClientId ?? "client_2",
    oauthClientSecret: cliOauthClientSecret ?? process.env.OAUTH_CLIENT_SECRET ?? appJsonConfig.oauthClientSecret,
    oauthClientMap: cliOauthClientMap ?? process.env.OAUTH_CLIENT_MAP ?? appJsonConfig.oauthClientMap,
    safetyPersonnelUrl:
      cliSafetyPersonnelUrl ?? process.env.SAFETY_PERSONNEL_URL ?? appJsonConfig.safetyPersonnelUrl ?? "https://cube.guhecloud.com:3000/",
    accessControlUrl:
      cliAccessControlUrl ?? process.env.ACCESS_CONTROL_URL ?? appJsonConfig.accessControlUrl ?? "http://192.168.0.243:3200",
    securityManagementUrl: cliSecurityManagementUrl ?? process.env.SECURITY_MANAGEMENT_URL ?? appJsonConfig.securityManagementUrl ?? "",
    riskControlUrl: cliRiskControlUrl ?? process.env.RISK_CONTROL_URL ?? appJsonConfig.riskControlUrl ?? "",
    fileServiceUrl: cliFileServiceUrl ?? process.env.FILE_SERVICE_URL ?? appJsonConfig.fileServiceUrl ?? "http://192.168.0.243:3200/file",
    dailyInspectionUrl:
      cliDailyInspectionUrl ?? process.env.DAILY_INSPECTION_URL ?? appJsonConfig.dailyInspectionUrl ?? "http://192.168.0.243:3200/maintain",
    dailyTaskUrl: cliDailyTaskUrl ?? process.env.DAILY_TASK_URL ?? appJsonConfig.dailyTaskUrl ?? "http://192.168.0.243:3200",
    secureEduUrl: cliSecureEduUrl ?? process.env.SECURE_EDU_URL ?? appJsonConfig.secureEduUrl ?? "http://192.168.0.243:3200",
    securityMonitorUrl:
      cliSecurityMonitorUrl ?? process.env.SECURITY_MONITOR_URL ?? appJsonConfig.securityMonitorUrl ?? "http://192.168.0.243:3200",
    aiApplicationUrl:
      cliAiApplicationUrl ?? process.env.AI_APPLICATION_URL ?? appJsonConfig.aiApplicationUrl ?? "http://192.168.0.243:13145/",
    emergencyUrl: cliEmergencyUrl ?? process.env.EMERGENCY_URL ?? appJsonConfig.emergencyUrl ?? "http://192.168.0.243:3200/emergency",
    workPermitUrl:
      cliWorkPermitUrl ?? process.env.WORK_PERMIT_URL ?? appJsonConfig.workPermitUrl ?? "http://192.168.0.243:3200/work-permit",
    flowUrl: cliFlowUrl ?? process.env.FLOW_URL ?? appJsonConfig.flowUrl ?? "http://192.168.0.243:3200/ai-center",
  };
}

function loadAppJsonConfig(): Partial<AppConfig> {
  const configPath = getCliArg("config") ?? process.env.APP_CONFIG_PATH ?? "app.json";
  const resolvedPath = resolveAppConfigPath(configPath);

  if (!existsSync(resolvedPath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(readFileSync(resolvedPath, "utf8")) as Record<string, unknown>;
    const nestedApp = isPlainObject(parsed.app) ? parsed.app : {};
    const source = { ...parsed, ...nestedApp };
    return {
      port: readNumber(source.port),
      hostname: readString(source.hostname),
      logLevel: readLogLevel(source.logLevel),
      videoMonitorUrl: readString(source.videoMonitorUrl),
      deviceCenterUrl: readString(source.deviceCenterUrl),
      personnelUrl: readString(source.personnelUrl),
      propertyUrl: readString(source.propertyUrl),
      metadataUrl: readString(source.metadataUrl),
      ouaaUrl: readString(source.ouaaUrl),
      dictionaryUrl: readString(source.dictionaryUrl),
      dispatchUrl: readString(source.dispatchUrl),
      fusionCommunicateUrl: readString(source.fusionCommunicateUrl),
      oauthClientId: readString(source.oauthClientId),
      oauthClientSecret: readString(source.oauthClientSecret),
      oauthClientMap: readJsonString(source.oauthClientMap),
      safetyPersonnelUrl: readString(source.safetyPersonnelUrl),
      accessControlUrl: readString(source.accessControlUrl),
      securityManagementUrl: readString(source.securityManagementUrl),
      riskControlUrl: readString(source.riskControlUrl),
      fileServiceUrl: readString(source.fileServiceUrl),
      dailyInspectionUrl: readString(source.dailyInspectionUrl),
      dailyTaskUrl: readString(source.dailyTaskUrl),
      secureEduUrl: readString(source.secureEduUrl),
      securityMonitorUrl: readString(source.securityMonitorUrl),
      aiApplicationUrl: readString(source.aiApplicationUrl),
      emergencyUrl: readString(source.emergencyUrl),
      workPermitUrl: readString(source.workPermitUrl),
      flowUrl: readString(source.flowUrl),
    };
  } catch {
    return {};
  }
}

function resolveAppConfigPath(configPath: string): string {
  if (isAbsolute(configPath)) {
    return configPath;
  }

  const cwdPath = resolve(process.cwd(), configPath);
  if (!GATEWAY_ROOT_DIR) {
    return cwdPath;
  }

  const gatewayPath = resolve(GATEWAY_ROOT_DIR, configPath);
  return existsSync(gatewayPath) || !existsSync(cwdPath) ? gatewayPath : cwdPath;
}

function findGatewayRootDir(startDir: string): string | undefined {
  let currentDir = startDir;

  while (true) {
    const packageJsonPath = resolve(currentDir, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { name?: unknown };
        if (parsed.name === GATEWAY_PACKAGE_NAME) {
          return currentDir;
        }
      } catch {
        return undefined;
      }
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return undefined;
    }
    currentDir = parentDir;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function readJsonString(value: unknown): string | undefined {
  if (typeof value === "string" && value !== "") {
    return value;
  }
  if (isPlainObject(value)) {
    return JSON.stringify(value);
  }
  return undefined;
}

function readLogLevel(value: unknown): AppConfig["logLevel"] | undefined {
  return value === "debug" || value === "info" || value === "warn" || value === "error" ? value : undefined;
}
