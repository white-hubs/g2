/**
 * ADR-0053：Platform 装载时机由 Shell 持有；Composition Profile 只声明成员。
 * 登录跳转临界区只装 chrome 壳；Messaging/RTC 走 deferred preload。
 * ADR-0056：库型 Platform 由壳 URL 动态预装（非 workspace 静态依赖），再进同一 ensure 集合。
 */

/** 壳启动序硬依赖的库型 Platform（date→logger；resource 可并行，名单内固定次序）。 */
export const LIBRARY_BOOTSTRAP_PLATFORM_NAMES = ["datePlatform", "loggerPlatform", "resourcePlatform"] as const;

export const UNAUTHENTICATED_PLATFORM_NAMES = [...LIBRARY_BOOTSTRAP_PLATFORM_NAMES, "httpPlatform", "pcAuth"] as const;

/** 跳转前 / 主壳可见所需：顶栏侧栏。已登录用户的鉴权平台在后台预加载，不阻塞业务首屏。 */
export const AUTHENTICATED_CHROME_PLATFORM_NAMES = [...LIBRARY_BOOTSTRAP_PLATFORM_NAMES, "httpPlatform", "pcChrome"] as const;

/** 登录后可后置，不挡 `/index`。 */
export const AUTHENTICATED_DEFERRED_PLATFORM_NAMES = ["pcAuth", "pcMessaging", "pcRtc", "pcAlarmPopup"] as const;

/** 已登录全量必装（chrome + deferred）。 */
export const AUTHENTICATED_PLATFORM_NAMES = [...AUTHENTICATED_CHROME_PLATFORM_NAMES, ...AUTHENTICATED_DEFERRED_PLATFORM_NAMES] as const;

export const AI_ASSISTANT_PLATFORM_NAME = "pcAiAssistant";

export interface DeferredPreloadConfig {
  delayMs: number;
  names: readonly string[];
}

/** 登录成功或会话恢复后，稍后装 Messaging/RTC。 */
export const DEFERRED_PRELOAD: DeferredPreloadConfig = {
  delayMs: 0,
  names: AUTHENTICATED_DEFERRED_PLATFORM_NAMES,
};

export function platformsForAuthState(hasToken: boolean): readonly string[] {
  return hasToken ? AUTHENTICATED_PLATFORM_NAMES : UNAUTHENTICATED_PLATFORM_NAMES;
}

/** 登录跳转临界区 / 主壳首屏：只装 chrome 相关 Platform。 */
export function platformsForChromeShell(initialPathname = ""): readonly string[] {
  // 恢复会话时若仍停在鉴权全页，首屏会立即渲染 pcAuth slot；必须先完成 install，
  // 否则 LoginPage setup 会早于 bindLoggerApi 执行。普通业务首屏仍保持 pcAuth 后置。
  if (initialPathname === "/login" || initialPathname === "/verify-auth") {
    return [...AUTHENTICATED_CHROME_PLATFORM_NAMES, "pcAuth"];
  }
  return AUTHENTICATED_CHROME_PLATFORM_NAMES;
}

export function scheduleDeferredPreload(
  config: DeferredPreloadConfig,
  ensure: (platformName: string) => Promise<void>,
  options?: {
    schedule?: (fn: () => void, ms: number) => unknown;
    onError?: (platformName: string, error: unknown) => void;
  },
): unknown {
  if (config.names.length === 0) {
    return undefined;
  }
  const schedule = options?.schedule ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  return schedule(() => {
    void (async () => {
      for (const name of config.names) {
        try {
          await ensure(name);
        } catch (error) {
          options?.onError?.(name, error);
        }
      }
    })();
  }, config.delayMs);
}
