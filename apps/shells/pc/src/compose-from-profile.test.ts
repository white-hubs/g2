import {
  createFakeApp,
  createFakeDomainContext,
  createFakePlatformContext,
  createFakeRouter,
  type DomainContext,
} from "@g2-composition/contract";
import type { ResolvedProfile } from "@g2-composition/registry";
import { getRuntimeCommonDiagnostics } from "@g2-runtime/common-loader";
import { describe, expect, test } from "bun:test";
import { createMemoryHistory, createRouter } from "vue-router";

import { composeFromProfile } from "./compose-from-profile";
import { PageLibraryLoadError } from "./page-library-loader-error";

const demoProfile: ResolvedProfile = {
  facade: "pc",
  env: "demo",
  client: [],
  pageLibrary: [{ name: "genericEquipmentMonitorPages", entry: "http://localhost:5051/mf-manifest.json" }],
  platform: [{ name: "httpPlatform", entry: "http://localhost:5015/mf-manifest.json" }],
  inline: [{ name: "poc-inline-pc", package: "@g2-domain/poc-inline-pc", basePath: "/poc-inline", allowOverride: false }],
  remotes: [{ name: "pocRemotePc", entry: "http://localhost:5002/mf-manifest.json", basePath: "/poc-remote" }],
};

describe("composeFromProfile", () => {
  test("preloads a compatible core runtime before registering domain remotes", async () => {
    const profile = structuredClone(demoProfile);
    profile.coreRuntime = [
      { name: "datePlatform", entry: "http://localhost:5019/mf-manifest.json", apiVersion: "1.x" },
      { name: "loggerPlatform", entry: "http://localhost:5017/mf-manifest.json", apiVersion: "1.x" },
      { name: "resourcePlatform", entry: "http://localhost:5018/mf-manifest.json", apiVersion: "1.x" },
      { name: "httpPlatform", entry: "http://localhost:5015/mf-manifest.json", apiVersion: "1.x" },
      { name: "pcUi", entry: "http://localhost:5016/mf-manifest.json", apiVersion: "1.x" },
      { name: "pcChart", entry: "http://localhost:5045/mf-manifest.json", apiVersion: "1.x" },
      { name: "pcAlarmCharts", entry: "http://localhost:5055/mf-manifest.json", apiVersion: "1.x" },
    ];
    const events: string[] = [];
    const sharedPackages: string[] = [];
    let pcUiShareConfig: Record<string, unknown> | undefined;
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes(remotes: { name: string }[]) {
            events.push(`register:${remotes[0]?.name}`);
          },
          registerShared(shared: Record<string, unknown>) {
            sharedPackages.push(...Object.keys(shared));
            pcUiShareConfig = shared["@g2-platform/pc-ui"] as Record<string, unknown> | undefined;
          },
          loadRemote: async (id: string) => {
            events.push(`load:${id}`);
            if (id === "pcUi/index") {
              return { default: "pcUi" };
            }
            return { runtimeVersion: "2026.09.22.1", apiVersion: "1.0.0" };
          },
        }) as never,
    });
    expect(events.filter((event) => event.startsWith("load:")).slice(0, 7)).toEqual([
      "load:datePlatform/info",
      "load:loggerPlatform/info",
      "load:resourcePlatform/info",
      "load:httpPlatform/info",
      "load:pcUi/info",
      "load:pcChart/info",
      "load:pcAlarmCharts/info",
    ]);
    expect(events.indexOf("load:pcUi/info")).toBeLessThan(events.indexOf("register:pocRemotePc"));
    expect(result.runtimeCommonDiagnostics()).toHaveLength(7);
    expect(sharedPackages).toEqual(["@g2-platform/pc-ui"]);
    expect(pcUiShareConfig?.version).toBe("1.0.0");
    await expect(result.loadRuntimeCommon("pcUi", "index")).resolves.toEqual({ default: "pcUi" });
  });

  test("stops composition when a core runtime API is incompatible", async () => {
    const profile = structuredClone(demoProfile);
    profile.coreRuntime = [{ name: "pcUi", entry: "http://localhost:5016/mf-manifest.json", apiVersion: "1.x" }];
    await expect(
      composeFromProfile(profile, {
        createMf: () =>
          ({ registerRemotes() {}, loadRemote: async () => ({ runtimeVersion: "2026.09.22.1", apiVersion: "2.0.0" }) }) as never,
      }),
    ).rejects.toThrow(/incompatible/);
  });

  test("fails closed before registering domain remotes when a core runtime cannot load", async () => {
    const profile = structuredClone(demoProfile);
    profile.coreRuntime = [{ name: "pcUi", entry: "http://localhost:5016/mf-manifest.json", apiVersion: "1.x" }];
    const registeredRemotes: string[] = [];
    const loadCalls: string[] = [];

    await expect(
      composeFromProfile(profile, {
        createMf: () =>
          ({
            registerRemotes(remotes: { name: string }[]) {
              registeredRemotes.push(...remotes.map(({ name }) => name));
            },
            loadRemote: async (id: string) => {
              loadCalls.push(id);
              throw new Error("manifest unavailable");
            },
          }) as never,
      }),
    ).rejects.toThrow(/manifest unavailable/);

    expect(loadCalls).toEqual(["pcUi/info"]);
    expect(registeredRemotes).toEqual(["pcUi"]);
    expect(getRuntimeCommonDiagnostics()).toMatchObject([
      { name: "pcUi", state: "failed", error: expect.stringContaining("manifest unavailable") },
    ]);
  });

  test("registers remotes at compose time but does not load domain modules yet", async () => {
    const profile = structuredClone(demoProfile);
    const loadRemoteCalls: string[] = [];
    const registered: string[] = [];

    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes(remotes: { name: string }[]) {
            for (const remote of remotes) {
              registered.push(remote.name);
            }
          },
          loadRemote: async (id: string) => {
            loadRemoteCalls.push(id);
            throw new Error(`domain should not load during compose: ${id}`);
          },
        }) as never,
      loadInlineDomain: async () => {
        throw new Error("inline domain should not load during compose");
      },
    });

    expect(registered).toContain("httpPlatform");
    expect(registered).toContain("genericEquipmentMonitorPages");
    expect(registered).toContain("pocRemotePc");
    expect(loadRemoteCalls).toEqual([]);
    expect(result.plan.remotes.map((r) => r.name)).toContain("pocRemotePc");
  });

  test("loads a page-library expose through the registered profile slot", async () => {
    const loadedIds: string[] = [];
    const result = await composeFromProfile(structuredClone(demoProfile), {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async (id: string) => {
            loadedIds.push(id);
            return { default: { name: "AlarmRecord" } };
          },
        }) as never,
    });

    const loaded = await result.loadPageLibraryExposed<{ default: { name: string } }>("genericEquipmentMonitorPages", "AlarmRecord");
    expect(loaded.default.name).toBe("AlarmRecord");
    expect(loadedIds).toEqual(["genericEquipmentMonitorPages/AlarmRecord"]);
    await expect(result.loadPageLibraryExposed("missingPages", "AlarmRecord")).rejects.toThrow(
      'page library "missingPages" is not in the resolved profile',
    );
  });

  test("page-library loading errors include the library, expose and manifest entry", async () => {
    const result = await composeFromProfile(structuredClone(demoProfile), {
      loadRemoteDomain: async () => {
        throw new Error("manifest 404");
      },
    });
    try {
      await result.loadPageLibraryExposed("genericEquipmentMonitorPages", "MissingPage");
      throw new Error("expected page-library load to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(PageLibraryLoadError);
      expect((error as Error).message).toContain(
        'page library "genericEquipmentMonitorPages/MissingPage" failed to load from http://localhost:5051/mf-manifest.json',
      );
    }
  });

  test("rejects duplicated MF remote names across profile slots", async () => {
    const profile = structuredClone(demoProfile);
    profile.pageLibrary = [{ name: "httpPlatform", entry: "http://localhost:5051/mf-manifest.json" }];
    await expect(composeFromProfile(profile)).rejects.toThrow(
      'module federation remote name "httpPlatform" is duplicated across slots: platform, pageLibrary',
    );
  });

  test("loads a remote domain only when its basePath is navigated", async () => {
    const profile = structuredClone(demoProfile);
    const loadRemoteCalls: string[] = [];

    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async (id: string) => {
            loadRemoteCalls.push(id);
            if (id.endsWith("/info")) {
              return { getPlatformLabel: () => "http" };
            }
            if (id === "pocRemotePc/domain") {
              return {
                default: {
                  routes: [
                    {
                      path: "/poc-remote",
                      name: "poc-remote",
                      component: { name: "RemoteView", render: () => null },
                    },
                  ],
                },
              };
            }
            throw new Error(`unexpected remote ${id}`);
          },
        }) as never,
      loadInlineDomain: async () => ({
        domainModule: {
          routes: [
            {
              path: "/poc-inline",
              name: "poc-inline",
              component: { name: "InlineView", render: () => null },
            },
          ],
        },
      }),
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", name: "home", component: { render: () => null } }],
    });
    result.attachToRouter(router);
    await router.push("/");
    expect(loadRemoteCalls).toEqual([]);

    await router.push("/poc-remote");
    expect(loadRemoteCalls).toContain("pocRemotePc/domain");
    expect(router.currentRoute.value.name).toBe("poc-remote");
  });

  test("softReloadActiveRemoteDomains reloads the active remote without full navigation stack reset", async () => {
    const profile = structuredClone(demoProfile);
    const loadRemoteCalls: string[] = [];
    let domainVersion = 1;

    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async (id: string) => {
            loadRemoteCalls.push(id);
            if (id === "pocRemotePc/domain") {
              const version = domainVersion;
              return {
                default: {
                  routes: [
                    {
                      path: "/poc-remote",
                      name: "poc-remote",
                      component: { name: `RemoteViewV${version}`, render: () => null },
                    },
                  ],
                },
              };
            }
            throw new Error(`unexpected remote ${id}`);
          },
        }) as never,
      loadInlineDomain: async () => ({
        domainModule: {
          routes: [{ path: "/poc-inline", name: "poc-inline", component: { render: () => null } }],
        },
      }),
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", name: "home", component: { render: () => null } }],
    });
    result.attachToRouter(router);
    await router.push("/poc-remote");
    expect(loadRemoteCalls.filter((id) => id === "pocRemotePc/domain")).toHaveLength(1);

    domainVersion = 2;
    await result.softReloadActiveRemoteDomains();
    expect(loadRemoteCalls.filter((id) => id === "pocRemotePc/domain")).toHaveLength(2);
    expect(router.currentRoute.value.path).toBe("/poc-remote");
    expect(router.currentRoute.value.query["_g2hmr"]).toBeUndefined();
  });

  test("navigating to a remote domain calls install(app, domainCtx, config) with ensureClient", async () => {
    const profile = structuredClone(demoProfile);
    profile.remotes = [
      {
        name: "accessControl",
        entry: "http://localhost:5040/mf-manifest.json",
        basePath: "/d/access-control",
        config: { applicationCode: "ACCESS_CONTROL" },
      },
    ];
    const installCalls: { ctxKeys: string[]; config: unknown }[] = [];
    const ensuredClients: string[] = [];
    const domainCtx = createFakeDomainContext({
      ensureClient: async <T = unknown>(name: string): Promise<T> => {
        ensuredClients.push(name);
        return { ok: true } as T;
      },
    });
    const app = createFakeApp();

    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async (id: string) => {
            if (id === "accessControl/domain") {
              return {
                default: {
                  routes: [
                    {
                      path: "/d/access-control",
                      name: "access-control-home",
                      component: { name: "Home", render: () => null },
                    },
                  ],
                  install: async (_app: unknown, ctx: DomainContext, config?: Record<string, unknown>) => {
                    installCalls.push({
                      ctxKeys: Object.keys(ctx).toSorted(),
                      config,
                    });
                    await ctx.ensureClient("accessControlClient");
                  },
                },
              };
            }
            throw new Error(`unexpected remote ${id}`);
          },
        }) as never,
      loadInlineDomain: async () => ({ domainModule: { routes: [] } }),
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", name: "home", component: { render: () => null } }],
    });
    result.attachToRouter(router, {
      getApp: () => app,
      getDomainContext: () => domainCtx,
    });
    await router.push("/d/access-control");

    expect(installCalls).toEqual([
      {
        ctxKeys: ["bus", "ensureClient", "getAuthHeaders", "getFunctionCodes", "loadPageLibrary", "loadPlatform", "loadRuntimeCommon"],
        config: { applicationCode: "ACCESS_CONTROL" },
      },
    ]);
    expect(ensuredClients).toEqual(["accessControlClient"]);
    expect(router.currentRoute.value.name).toBe("access-control-home");
  });

  test("lazy-loading a remote domain preserves query (e.g. detail ?id=)", async () => {
    const profile = structuredClone(demoProfile);
    profile.remotes = [
      {
        name: "accessControl",
        entry: "http://localhost:5040/mf-manifest.json",
        basePath: "/d/access-control",
      },
    ];
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async (id: string) => {
            if (id === "accessControl/domain") {
              return {
                default: {
                  routes: [
                    {
                      path: "/d/access-control/equipmentMonitorDetail",
                      name: "access-control-gem-equipmentMonitorDetail",
                      component: { name: "Detail", render: () => null },
                    },
                  ],
                },
              };
            }
            throw new Error(`unexpected remote ${id}`);
          },
        }) as never,
      loadInlineDomain: async () => ({ domainModule: { routes: [] } }),
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", name: "home", component: { render: () => null } }],
    });
    result.attachToRouter(router);
    await router.push({ path: "/d/access-control/equipmentMonitorDetail", query: { id: "1938417072099852288" } });

    expect(router.currentRoute.value.path).toBe("/d/access-control/equipmentMonitorDetail");
    expect(router.currentRoute.value.query.id).toBe("1938417072099852288");
    expect(router.currentRoute.value.fullPath).toContain("id=1938417072099852288");
  });

  test("adding a remote does not require shell source changes", async () => {
    const profile = structuredClone(demoProfile);
    profile.remotes.push({
      name: "extraRemote",
      entry: "http://localhost:5003/mf-manifest.json",
      basePath: "/extra",
    });

    const registered: string[] = [];
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes(remotes: { name: string }[]) {
            for (const remote of remotes) {
              registered.push(remote.name);
            }
          },
          loadRemote: async () => ({
            default: { routes: [{ path: "/extra", name: "extra", component: {} }] },
          }),
        }) as never,
      loadInlineDomain: async () => ({
        domainModule: { routes: [{ path: "/poc-inline", name: "poc-inline", component: {} }] },
      }),
    });

    expect(registered).toContain("extraRemote");
    expect(result.plan.remotes.map((r) => r.name)).toContain("extraRemote");
  });
});

describe("attachToRouter inline override polling", () => {
  // 注意：两个用例都启动了真实 setInterval（`startOverridePolling` 的返回值/停止函数被丢弃，
  // 与计划文档 Task 7.6 Step 5 示例代码一致——单页应用场景下轮询本就该活到页面卸载为止）。
  // 这里让"不该轮询"的用例先跑，避免"应该轮询"用例遗留的 interval 污染后面用例的 fetch 断言。
  test("inline 未声明 allowOverride（默认 false）时不启动轮询", async () => {
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [],
      platform: [],
      inline: [{ name: "poc-inline-pc", package: "@g2-domain/poc-inline-pc", basePath: "/poc-inline", allowOverride: false }],
      remotes: [{ name: "pocRemotePc", entry: "http://localhost:5002/mf-manifest.json", basePath: "/poc-inline" }],
    };
    const fetchedUrls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      fetchedUrls.push(String(url));
      return { json: async () => ({ metaData: { buildInfo: { buildVersion: "v2" } } }) } as Response;
    }) as typeof fetch;

    try {
      const result = await composeFromProfile(profile, {
        createMf: () => ({ registerRemotes() {}, loadRemote: async () => ({}) }) as never,
        overridePollIntervalMs: 5,
      });
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/", name: "home", component: { render: () => null } }],
      });
      result.attachToRouter(router);

      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(fetchedUrls).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("inline 声明 allowOverride:true 且存在同 basePath 的 remote 时，周期性拉取该 remote 的 manifest", async () => {
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [],
      platform: [],
      inline: [{ name: "poc-inline-pc", package: "@g2-domain/poc-inline-pc", basePath: "/poc-inline", allowOverride: true }],
      remotes: [{ name: "pocRemotePc", entry: "http://localhost:5002/mf-manifest.json", basePath: "/poc-inline" }],
    };
    const fetchedUrls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      fetchedUrls.push(String(url));
      return { json: async () => ({ metaData: { buildInfo: { buildVersion: "v2" } } }) } as Response;
    }) as typeof fetch;

    try {
      const result = await composeFromProfile(profile, {
        createMf: () => ({ registerRemotes() {}, loadRemote: async () => ({}) }) as never,
        overridePollIntervalMs: 5,
      });
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/", name: "home", component: { render: () => null } }],
      });
      result.attachToRouter(router);

      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(fetchedUrls).toContain("http://localhost:5002/mf-manifest.json");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("检测到新版本时调用注入的 notifyNewerVersion（ADR-0042 要求的“弹提示引导用户手动刷新”，生产环境默认实现是 window.confirm，这里注入假实现验证回调确实被触发）", async () => {
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [],
      platform: [],
      inline: [{ name: "poc-inline-pc", package: "@g2-domain/poc-inline-pc", basePath: "/poc-inline", allowOverride: true }],
      remotes: [{ name: "pocRemotePc", entry: "http://localhost:5002/mf-manifest.json", basePath: "/poc-inline" }],
    };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string) =>
      ({ json: async () => ({ metaData: { buildInfo: { buildVersion: "v2" } } }) }) as Response) as typeof fetch;
    const notified: string[] = [];

    try {
      const result = await composeFromProfile(profile, {
        createMf: () => ({ registerRemotes() {}, loadRemote: async () => ({}) }) as never,
        overridePollIntervalMs: 5,
        notifyNewerVersion: (inlineName) => notified.push(inlineName),
      });
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/", name: "home", component: { render: () => null } }],
      });
      result.attachToRouter(router);

      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(notified).toContain("poc-inline-pc");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("loadPlatformSlot", () => {
  test("加载指定 platform 的 slot 内容", async () => {
    const profile = structuredClone(demoProfile);
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async (id: string) => {
            if (id === "httpPlatform/platform") {
              return { platformModule: { slots: { "chrome.topBar": { name: "TopBarStub" } } } };
            }
            throw new Error(`unexpected remote ${id}`);
          },
        }) as never,
    });

    const slot = await result.loadPlatformSlot("httpPlatform", "chrome.topBar");
    expect(slot).toMatchObject({ name: "TopBarStub" });
  });

  test("platform 未暴露该 slot 时抛错", async () => {
    const profile = structuredClone(demoProfile);
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async () => ({ platformModule: { slots: {} } }),
        }) as never,
    });

    await expect(result.loadPlatformSlot("httpPlatform", "chrome.topBar")).rejects.toThrow(/does not expose slot/);
  });
});

describe("runPlatformInstalls", () => {
  test("only 只装指定子集，且按 Profile 书写顺序（ADR-0053）", async () => {
    const order: string[] = [];
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [],
      platform: [
        { name: "httpPlatform", entry: "http://x/http/mf-manifest.json" },
        { name: "pcChrome", entry: "http://x/chrome/mf-manifest.json" },
        { name: "pcAuth", entry: "http://x/auth/mf-manifest.json" },
      ],
      inline: [],
      remotes: [],
    };
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async (id: string) => ({
            platformModule: { install: async () => order.push(id.split("/")[0]!) },
          }),
        }) as never,
    });
    await result.runPlatformInstalls(createFakeApp(), createFakeRouter(), createFakePlatformContext(), {
      only: ["pcAuth", "httpPlatform"],
    });
    expect(order).toEqual(["httpPlatform", "pcAuth"]);
  });

  test("ensurePlatform 幂等：同一 name 只 install 一次", async () => {
    let installs = 0;
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [],
      platform: [{ name: "pcAuth", entry: "http://x/auth/mf-manifest.json" }],
      inline: [],
      remotes: [],
    };
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async () => ({
            platformModule: {
              install: async () => {
                installs += 1;
              },
            },
          }),
        }) as never,
    });
    const app = createFakeApp();
    const router = createFakeRouter();
    const ctx = createFakePlatformContext();
    await result.ensurePlatform("pcAuth", app, router, ctx);
    await result.ensurePlatform("pcAuth", app, router, ctx);
    expect(installs).toBe(1);
  });

  test("compose 时注册 client remote，不立刻 load", async () => {
    const registered: string[] = [];
    const loadRemoteCalls: string[] = [];
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [{ name: "messageClient", entry: "http://localhost:5020/mf-manifest.json" }],
      platform: [],
      inline: [],
      remotes: [],
    };
    await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes(remotes: { name: string }[]) {
            for (const remote of remotes) {
              registered.push(remote.name);
            }
          },
          loadRemote: async (id: string) => {
            loadRemoteCalls.push(id);
            throw new Error(`should not load during compose: ${id}`);
          },
        }) as never,
    });
    expect(registered).toContain("messageClient");
    expect(loadRemoteCalls).toEqual([]);
  });

  test("ensureClient 调用 create(ctx) 并幂等返回同一 API", async () => {
    let createCalls = 0;
    const api = { ping: () => "ok" };
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [{ name: "messageClient", entry: "http://localhost:5020/mf-manifest.json" }],
      platform: [],
      inline: [],
      remotes: [],
    };
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async (id: string) => {
            expect(id).toBe("messageClient/client");
            return {
              create: async () => {
                createCalls += 1;
                return api;
              },
            };
          },
        }) as never,
    });
    const ctx = createFakePlatformContext();
    const first = await result.ensureClient<typeof api>("messageClient", ctx);
    const second = await result.ensureClient<typeof api>("messageClient", ctx);
    expect(first).toBe(api);
    expect(second).toBe(api);
    expect(createCalls).toBe(1);
  });

  test("ensureClient 对 Profile 外逻辑名抛错", async () => {
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [],
      platform: [],
      inline: [],
      remotes: [],
    };
    const result = await composeFromProfile(profile, {
      createMf: () => ({ registerRemotes() {}, loadRemote: async () => ({}) }) as never,
    });
    await expect(result.ensureClient("messageClient", createFakePlatformContext())).rejects.toThrow(/not in the resolved profile/);
  });

  test("ensureClient 首次失败后可重试（不缓存 rejected Promise）", async () => {
    let attempts = 0;
    const api = { ping: () => "ok" };
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [{ name: "messageClient", entry: "http://localhost:5020/mf-manifest.json" }],
      platform: [],
      inline: [],
      remotes: [],
    };
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async () => {
            attempts += 1;
            if (attempts === 1) {
              throw new TypeError("Failed to fetch dynamically imported module: remoteEntry.js");
            }
            return {
              create: async () => api,
            };
          },
        }) as never,
    });
    const ctx = createFakePlatformContext();
    await expect(result.ensureClient("messageClient", ctx)).rejects.toThrow(/Failed to fetch/);
    const recovered = await result.ensureClient<typeof api>("messageClient", ctx);
    expect(recovered).toBe(api);
    expect(attempts).toBe(2);
  });

  test("loadPlatformModule 对 Failed to fetch 自动重试，且失败不永久占坑", async () => {
    let attempts = 0;
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [],
      platform: [{ name: "pcChrome", entry: "http://localhost:8081/pcChrome/mf-manifest.json" }],
      inline: [],
      remotes: [],
    };
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async () => {
            attempts += 1;
            if (attempts === 1) {
              throw new TypeError(
                "Failed to fetch dynamically imported module: http://localhost:8081/pcChrome/20260914.4a450da/remoteEntry.js",
              );
            }
            return { platformModule: { slots: { "chrome.topBar": { name: "TopBar" } } } };
          },
        }) as never,
    });
    const slot = await result.loadPlatformSlot("pcChrome", "chrome.topBar");
    expect(slot).toEqual({ name: "TopBar" });
    expect(attempts).toBe(2);
  });

  test("跨批次独占 slot 冲突：已装 ∪ 本批检测（ADR-0034 / ADR-0053）", async () => {
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [],
      platform: [
        { name: "a", entry: "http://x/a/mf-manifest.json" },
        { name: "b", entry: "http://x/b/mf-manifest.json" },
      ],
      inline: [],
      remotes: [],
    };
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async () => ({
            platformModule: { slots: { "chrome.topBar": {} } },
          }),
        }) as never,
    });
    const app = createFakeApp();
    const router = createFakeRouter();
    const ctx = createFakePlatformContext();
    await result.ensurePlatform("a", app, router, ctx);
    await expect(result.ensurePlatform("b", app, router, ctx)).rejects.toThrow(/chrome\.topBar/);
  });

  test("按 Profile 里 platform 数组的声明顺序依次调用每个 platform 的 install", async () => {
    const order: string[] = [];
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [],
      platform: [
        { name: "first", entry: "http://x/first/mf-manifest.json" },
        { name: "second", entry: "http://x/second/mf-manifest.json" },
      ],
      inline: [],
      remotes: [],
    };
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async (id: string) => ({
            platformModule: { install: async () => order.push(id.split("/")[0]) },
          }),
        }) as never,
    });
    await result.runPlatformInstalls(createFakeApp(), createFakeRouter(), createFakePlatformContext());
    expect(order).toEqual(["first", "second"]);
  });

  test("loadRemote 按 Profile 序串行（不并行启动多个 MF remote）", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const loadOrder: string[] = [];
    const loaded: string[] = [];
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [],
      platform: [
        { name: "first", entry: "http://x/first/mf-manifest.json" },
        { name: "second", entry: "http://x/second/mf-manifest.json" },
      ],
      inline: [],
      remotes: [],
    };
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async (id: string) => {
            const name = id.split("/")[0]!;
            loadOrder.push(name);
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await Promise.resolve();
            inFlight -= 1;
            return { platformModule: { install: async () => loaded.push(name) } };
          },
        }) as never,
      onPlatformModuleLoaded: (name) => {
        expect(loaded.includes(name)).toBe(false);
      },
    });
    await result.runPlatformInstalls(createFakeApp(), createFakeRouter(), createFakePlatformContext());
    expect(maxInFlight).toBe(1);
    expect(loadOrder).toEqual(["first", "second"]);
    expect(loaded).toEqual(["first", "second"]);
  });

  test("调用 install 时把 platform.config 作为第四个参数透传下去", async () => {
    const receivedConfig: unknown[] = [];
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [],
      platform: [{ name: "pcAuth", entry: "http://x/pcAuth/mf-manifest.json", config: { strategies: ["standard"] } }],
      inline: [],
      remotes: [],
    };
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async () => ({
            platformModule: {
              install: async (_app: unknown, _router: unknown, _ctx: unknown, config?: Record<string, unknown>) => {
                receivedConfig.push(config);
              },
            },
          }),
        }) as never,
    });
    await result.runPlatformInstalls(createFakeApp(), createFakeRouter(), createFakePlatformContext());
    expect(receivedConfig).toEqual([{ strategies: ["standard"] }]);
  });

  test("runPlatformInstalls 前检测到两个 platform 声明同一个 slot 名时抛错", async () => {
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [],
      platform: [
        { name: "a", entry: "http://x/a/mf-manifest.json" },
        { name: "b", entry: "http://x/b/mf-manifest.json" },
      ],
      inline: [],
      remotes: [],
    };
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async () => ({
            platformModule: { slots: { "chrome.topBar": {} } },
          }),
        }) as never,
    });
    await expect(result.runPlatformInstalls(createFakeApp(), createFakeRouter(), createFakePlatformContext())).rejects.toThrow(
      /chrome\.topBar/,
    );
  });

  test("没有 slot 冲突时正常按序 install，不受冲突检测影响", async () => {
    const order: string[] = [];
    const profile: ResolvedProfile = {
      facade: "pc",
      env: "demo",
      client: [],
      platform: [
        { name: "a", entry: "http://x/a/mf-manifest.json" },
        { name: "b", entry: "http://x/b/mf-manifest.json" },
      ],
      inline: [],
      remotes: [],
    };
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async (id: string) => ({
            platformModule: {
              slots: { [`${id.split("/")[0]}.slot`]: {} },
              install: async () => order.push(id.split("/")[0]),
            },
          }),
        }) as never,
    });
    await result.runPlatformInstalls(createFakeApp(), createFakeRouter(), createFakePlatformContext());
    expect(order).toEqual(["a", "b"]);
  });
});

describe("loadPlatformExposed", () => {
  test("按 platformName/exposedPath 透传给底层 MF loadRemote", async () => {
    const profile = structuredClone(demoProfile);
    const calls: string[] = [];
    const result = await composeFromProfile(profile, {
      createMf: () =>
        ({
          registerRemotes() {},
          loadRemote: async (id: string) => {
            calls.push(id);
            return { createHttpClientForPlatform: () => "fake-client" };
          },
        }) as never,
    });

    const mod = (await result.loadPlatformExposed("httpPlatform", "client")) as { createHttpClientForPlatform: () => string };
    expect(calls).toEqual(["httpPlatform/client"]);
    expect(mod.createHttpClientForPlatform()).toBe("fake-client");
  });
});
