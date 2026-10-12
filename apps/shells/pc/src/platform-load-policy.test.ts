import { describe, expect, test } from "bun:test";

import {
  AUTHENTICATED_CHROME_PLATFORM_NAMES,
  AUTHENTICATED_DEFERRED_PLATFORM_NAMES,
  AUTHENTICATED_PLATFORM_NAMES,
  DEFERRED_PRELOAD,
  LIBRARY_BOOTSTRAP_PLATFORM_NAMES,
  UNAUTHENTICATED_PLATFORM_NAMES,
  platformsForAuthState,
  platformsForChromeShell,
  scheduleDeferredPreload,
} from "./platform-load-policy";

describe("platformsForAuthState", () => {
  test("无 token 只返回未登录必装集", () => {
    expect(platformsForAuthState(false)).toEqual([...UNAUTHENTICATED_PLATFORM_NAMES]);
  });

  test("有 token 返回已登录全量必装集（含可后置成员）", () => {
    expect(platformsForAuthState(true)).toEqual([...AUTHENTICATED_PLATFORM_NAMES]);
  });

  test("业务首屏只要 chrome 壳成员，不含 auth/messaging/rtc", () => {
    expect(platformsForChromeShell("/index")).toEqual([...AUTHENTICATED_CHROME_PLATFORM_NAMES]);
    expect(platformsForChromeShell("/index")).not.toContain("pcAuth");
    expect(platformsForChromeShell("/index")).not.toContain("pcMessaging");
    expect(platformsForChromeShell("/index")).not.toContain("pcRtc");
    expect([...AUTHENTICATED_DEFERRED_PLATFORM_NAMES]).toEqual(["pcAuth", "pcMessaging", "pcRtc", "pcAlarmPopup"]);
  });

  test("恢复会话但停在鉴权全页时先安装 pcAuth，避免 slot 早于日志 API 绑定", () => {
    expect(platformsForChromeShell("/login")).toEqual([...AUTHENTICATED_CHROME_PLATFORM_NAMES, "pcAuth"]);
    expect(platformsForChromeShell("/verify-auth")).toEqual([...AUTHENTICATED_CHROME_PLATFORM_NAMES, "pcAuth"]);
  });
});

describe("library Platform bootstrap preload (ADR-0056)", () => {
  test("壳启动硬依赖库型 Platform：date → logger，且含 resource；未登录必装集前置它们", () => {
    expect([...LIBRARY_BOOTSTRAP_PLATFORM_NAMES]).toEqual(["datePlatform", "loggerPlatform", "resourcePlatform"]);
    expect(UNAUTHENTICATED_PLATFORM_NAMES.slice(0, 3)).toEqual([...LIBRARY_BOOTSTRAP_PLATFORM_NAMES]);
    expect(platformsForAuthState(false)[0]).toBe("datePlatform");
    expect(platformsForAuthState(false)).toContain("httpPlatform");
    expect(platformsForAuthState(false)).toContain("pcAuth");
  });
});

describe("scheduleDeferredPreload", () => {
  test("名单为空时不调度", () => {
    const ensured: string[] = [];
    const handle = scheduleDeferredPreload(
      { delayMs: 10, names: [] },
      async (name) => {
        ensured.push(name);
      },
      {
        schedule: () => {
          throw new Error("should not schedule");
        },
      },
    );
    expect(handle).toBeUndefined();
    expect(ensured).toEqual([]);
  });

  test("延迟后非阻塞 ensure 名单内 platform", async () => {
    const ensured: string[] = [];
    let queued: (() => void) | undefined;
    scheduleDeferredPreload(
      { delayMs: 1, names: ["pcAiAssistant"] },
      async (name) => {
        ensured.push(name);
      },
      {
        schedule: (fn) => {
          queued = fn;
          return 0 as unknown as ReturnType<typeof setTimeout>;
        },
      },
    );
    expect(ensured).toEqual([]);
    queued?.();
    await Promise.resolve();
    expect(ensured).toEqual(["pcAiAssistant"]);
  });

  test("默认 DEFERRED_PRELOAD 包含登录后可后置的 auth/messaging/rtc/alarm-popup", () => {
    expect([...DEFERRED_PRELOAD.names]).toEqual(["pcAuth", "pcMessaging", "pcRtc", "pcAlarmPopup"]);
  });
});
