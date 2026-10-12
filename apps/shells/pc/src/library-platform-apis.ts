/**
 * 壳侧库型 Platform API 绑定（ADR-0056）：经 MF loadPlatform 取得实现，禁止 workspace 静态依赖 @g2-shared/*。
 */

export type Logger = {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
};

export type CreateLoggerOptions = {
  console?: {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
};

type LoggerApi = {
  createLogger: (scope: string, options?: CreateLoggerOptions) => Logger;
};

type ResourceApi = {
  configureStaticResourceBase: (baseUrl: string | undefined) => void;
  resolveStaticResourceUrl: (pathOrUrl: string) => string;
  BIMOPS_AI_ENTRY_ICON: string;
  BIMOPS_CUBE_ICON: string;
  BIMOPS_ICON_SEARCH: string;
  BIMOPS_ICON_SKIN: string;
  bimopsAppIconPath: (appCode: string) => string;
};

let loggerApi: LoggerApi | undefined;
let resourceApi: ResourceApi | undefined;

/** 绑定后填充；shell 组件 import 的是 live binding。 */
export let BIMOPS_AI_ENTRY_ICON = "";
export let BIMOPS_CUBE_ICON = "";
export let BIMOPS_ICON_SEARCH = "";
export let BIMOPS_ICON_SKIN = "";

function requireLoggerApi(): LoggerApi {
  if (!loggerApi) {
    throw new Error("loggerPlatform API not bound; call bindLibraryPlatformApis after compose (ADR-0056)");
  }
  return loggerApi;
}

function requireResourceApi(): ResourceApi {
  if (!resourceApi) {
    throw new Error("resourcePlatform API not bound; call bindLibraryPlatformApis after compose (ADR-0056)");
  }
  return resourceApi;
}

export function bindLibraryPlatformApisFromModules(logger: LoggerApi, resource: ResourceApi): void {
  loggerApi = logger;
  resourceApi = resource;
  BIMOPS_AI_ENTRY_ICON = resource.BIMOPS_AI_ENTRY_ICON;
  BIMOPS_CUBE_ICON = resource.BIMOPS_CUBE_ICON;
  BIMOPS_ICON_SEARCH = resource.BIMOPS_ICON_SEARCH;
  BIMOPS_ICON_SKIN = resource.BIMOPS_ICON_SKIN;
}

export async function bindLibraryPlatformApis(
  loadPlatform: (platformName: string, exposedPath: string) => Promise<unknown>,
): Promise<void> {
  // 串行：与 runPlatformInstalls 同因，避免 dev:full 并行拉 remote 卡死。
  const logger = (await loadPlatform("loggerPlatform", "api")) as LoggerApi;
  const resource = (await loadPlatform("resourcePlatform", "api")) as ResourceApi;
  bindLibraryPlatformApisFromModules(logger, resource);
}

export function createLogger(scope: string, options?: CreateLoggerOptions): Logger {
  return requireLoggerApi().createLogger(scope, options);
}

export function configureStaticResourceBase(baseUrl: string | undefined): void {
  requireResourceApi().configureStaticResourceBase(baseUrl);
}

export function resolveStaticResourceUrl(pathOrUrl: string): string {
  return requireResourceApi().resolveStaticResourceUrl(pathOrUrl);
}

export function bimopsAppIconPath(appCode: string): string {
  return requireResourceApi().bimopsAppIconPath(appCode);
}
