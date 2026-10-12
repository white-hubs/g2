import { describe, expect, test } from "bun:test";

import { LEGACY_GH_CURRENT_APPLICATION_KEY, LEGACY_GH_CURRENT_MENUS_KEY } from "./legacy-qiankun-auth";
import {
  WORKBENCH_CONTAINER_SELECTOR,
  buildMicroAppDescriptors,
  buildWorkbenchDescriptor,
  handleQiankunUncaughtError,
  registerLegacyMicroApps,
  registerWorkbenchMicroApp,
} from "./qiankun-bridge";
import type { MicroAppDescriptor, MicroAppRegistrar, RegisterableMicroApp, WorkbenchMicroAppDescriptor } from "./qiankun-bridge";

describe("buildMicroAppDescriptors", () => {
  test("把旧 window.config.microApps 清单映射成 qiankun registerMicroApps 需要的形状，props 含五个必需字段", () => {
    const microApps = [{ name: "legacy-personal", entry: "https://old.example.com/legacy-personal/" }];
    const descriptors = buildMicroAppDescriptors(microApps, {
      permissionConfig: { menuConfig: [], functionCodes: [] },
      getAuth: () => ({ token: "t", tenant: "tn" }),
      getRoutes: () => [],
    });
    expect(descriptors[0]).toMatchObject({
      name: "legacy-personal",
      entry: "https://old.example.com/legacy-personal/",
      container: "#appContainer",
      activeRule: "/portal/legacy-personal/",
    });
    expect(descriptors[0].props).toMatchObject({
      base: "/portal/legacy-personal/",
      auth: { token: "t", tenant: "tn", terminal: "bimops-manage-web" },
    });
    expect(Object.keys(descriptors[0].props)).toEqual(["router", "base", "permissionConfig", "routes", "auth"]);
  });

  test("多个微应用清单项各自映射出独立的 container/activeRule/props，字段齐全不互相污染", () => {
    const microApps = [
      { name: "legacy-personal", entry: "https://old.example.com/legacy-personal/" },
      { name: "legacy-fire", entry: "https://old.example.com/legacy-fire/" },
    ];
    const descriptors = buildMicroAppDescriptors(microApps, {
      permissionConfig: { menuConfig: ["m1"], functionCodes: ["f1"] },
      getAuth: () => ({ token: "t2", tenant: "tn2" }),
      getRoutes: () => [{ path: "/x" }],
    });
    expect(descriptors).toHaveLength(2);
    for (const [index, item] of microApps.entries()) {
      const descriptor = descriptors[index]!;
      expect(descriptor.container).toBe("#appContainer");
      expect(descriptor.activeRule).toBe(`/portal/${item.name}/`);
      expect(descriptor.name).toBe(item.name);
      expect(descriptor.entry).toBe(item.entry);
      expect(descriptor.props.permissionConfig).toEqual({ menuConfig: ["m1"], functionCodes: ["f1"] });
      expect(descriptor.props.routes).toEqual([{ path: "/x" }]);
      expect(descriptor.props.auth).toEqual({ token: "t2", tenant: "tn2", terminal: "bimops-manage-web" });
    }
  });
});

describe("registerLegacyMicroApps", () => {
  const deps = {
    permissionConfig: { menuConfig: [], functionCodes: [] },
    getAuth: () => ({ token: "t", tenant: "tn" }),
    getRoutes: () => [],
  };

  test("清单为空时不调用 registerMicroApps，也不安装全局错误处理器（诚实地什么都不做）", () => {
    const registerMicroApps = () => {
      throw new Error("registerMicroApps 不应该被调用");
    };
    const addGlobalUncaughtErrorHandler = () => {
      throw new Error("addGlobalUncaughtErrorHandler 不应该被调用");
    };
    const result = registerLegacyMicroApps([], deps, { registerMicroApps, addGlobalUncaughtErrorHandler });
    expect(result).toBe(false);
  });

  test("清单非空时真的会调用 registerMicroApps，传入的描述符与 buildMicroAppDescriptors 的产出一致", () => {
    const registeredCalls: { apps: RegisterableMicroApp[]; hasLifeCycles: boolean }[] = [];
    let errorHandlerInstalled = false;
    const registrar: MicroAppRegistrar = {
      registerMicroApps: (apps, lifeCycles) => {
        registeredCalls.push({ apps, hasLifeCycles: lifeCycles !== undefined });
      },
      addGlobalUncaughtErrorHandler: () => {
        errorHandlerInstalled = true;
      },
    };
    const microApps = [{ name: "legacy-personal", entry: "https://old.example.com/legacy-personal/" }];

    const result = registerLegacyMicroApps(microApps, deps, registrar);

    expect(result).toBe(true);
    expect(registeredCalls).toHaveLength(1);
    expect(registeredCalls[0]!.apps).toEqual(buildMicroAppDescriptors(microApps, deps));
    expect(registeredCalls[0]!.hasLifeCycles).toBe(true);
    expect(errorHandlerInstalled).toBe(true);
  });

  test("beforeLoad/afterMount 生命周期回调真的会触发调用方传入的 hooks", () => {
    let capturedLifeCycles:
      | {
          beforeLoad?: (app?: WorkbenchMicroAppDescriptor) => Promise<void>;
          afterMount?: () => Promise<void>;
        }
      | undefined;
    const registrar: MicroAppRegistrar = {
      registerMicroApps: (_apps, lifeCycles) => {
        capturedLifeCycles = lifeCycles;
      },
      addGlobalUncaughtErrorHandler: () => {},
    };
    const microApps = [{ name: "legacy-personal", entry: "https://old.example.com/legacy-personal/" }];
    let beforeLoadCalled = false;
    let afterMountCalled = false;

    registerLegacyMicroApps(microApps, deps, registrar, {
      onBeforeLoad: () => {
        beforeLoadCalled = true;
      },
      onAfterMount: () => {
        afterMountCalled = true;
      },
    });

    capturedLifeCycles?.beforeLoad?.();
    capturedLifeCycles?.afterMount?.();

    expect(beforeLoadCalled).toBe(true);
    expect(afterMountCalled).toBe(true);
  });

  test("全局错误处理器触发时会调用 onLoadError hook", () => {
    let capturedErrorHandler: ((event?: unknown) => void) | undefined;
    const registrar: MicroAppRegistrar = {
      registerMicroApps: () => {},
      addGlobalUncaughtErrorHandler: (handler) => {
        capturedErrorHandler = handler;
      },
    };
    const microApps = [{ name: "legacy-personal", entry: "https://old.example.com/legacy-personal/" }];
    let loadErrorCalled = false;

    registerLegacyMicroApps(microApps, deps, registrar, {
      onLoadError: () => {
        loadErrorCalled = true;
      },
    });
    capturedErrorHandler?.(new Error("real failure"));

    expect(loadErrorCalled).toBe(true);
  });

  test("CSSStyleDeclaration 索引写入不触发 onLoadError", () => {
    let loadErrorCalled = false;
    handleQiankunUncaughtError(
      new TypeError("Failed to set an indexed property [0] on 'CSSStyleDeclaration': Indexed property setter is not supported."),
      () => {
        loadErrorCalled = true;
      },
      "qiankun workbench micro app",
    );
    expect(loadErrorCalled).toBe(false);
  });

  test("ResizeObserver 噪声不触发 onLoadError", () => {
    let loadErrorCalled = false;
    handleQiankunUncaughtError(
      "ResizeObserver loop completed with undelivered notifications.",
      () => {
        loadErrorCalled = true;
      },
      "qiankun micro app",
    );
    expect(loadErrorCalled).toBe(false);
  });

  test("beforeLoad 写入 GH-currentApplication.code（门户子应用兼容）", async () => {
    const map = new Map<string, string>();
    const storage = {
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    };
    let captured:
      | {
          beforeLoad?: (app?: MicroAppDescriptor) => Promise<void>;
        }
      | undefined;
    const registrar: MicroAppRegistrar = {
      registerMicroApps: (_apps, lifeCycles) => {
        captured = lifeCycles;
      },
      addGlobalUncaughtErrorHandler: () => {},
    };
    const microApps = [{ name: "problems", entry: "/apps-legacy/problems-migrate" }];
    const portalDeps = { ...deps, getSessionStorage: () => storage };
    registerLegacyMicroApps(microApps, portalDeps, registrar);
    const app = buildMicroAppDescriptors(microApps, portalDeps)[0]!;
    await captured?.beforeLoad?.(app);
    expect(JSON.parse(map.get(LEGACY_GH_CURRENT_APPLICATION_KEY)!)).toEqual({
      code: "problems",
      name: "problems",
    });
  });

  test("beforeLoad 写入带 alias 的 GH-currentMenus，并刷新 props.permissionConfig", async () => {
    const map = new Map<string, string>();
    const storage = {
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    };
    let captured:
      | {
          beforeLoad?: (app?: MicroAppDescriptor) => Promise<void>;
        }
      | undefined;
    const registrar: MicroAppRegistrar = {
      registerMicroApps: (_apps, lifeCycles) => {
        captured = lifeCycles;
      },
      addGlobalUncaughtErrorHandler: () => {},
    };
    const microApps = [{ name: "maintenance", entry: "/apps-legacy/maintenance-migrate" }];
    const menus = [
      {
        name: "维保计划",
        path: "/portal/maintenance/maintenancePlan",
        alias: { name: "维保计划@" },
      },
    ];
    const permissionConfig = { menuConfig: [] as unknown[], functionCodes: [] as string[] };
    const portalDeps = {
      ...deps,
      permissionConfig,
      getSessionStorage: () => storage,
      getLegacyMenusForApp: (code: string) => (code === "maintenance" ? menus : []),
    };
    registerLegacyMicroApps(microApps, portalDeps, registrar);
    const app = buildMicroAppDescriptors(microApps, portalDeps)[0]!;
    await captured?.beforeLoad?.(app);

    expect(JSON.parse(map.get(LEGACY_GH_CURRENT_MENUS_KEY)!)).toEqual(menus);
    const menuConfigWithPermissions = menus.map((m) => ({ ...m, dataPermissions: [] }));
    expect(app.props.permissionConfig.menuConfig).toEqual(menuConfigWithPermissions);
    expect(app.props.routes).toEqual(menus);
    expect(permissionConfig.menuConfig).toEqual(menuConfigWithPermissions);
  });
});

describe("buildWorkbenchDescriptor", () => {
  test("映射为独立容器与 /index|/workbench activeRule；name 取自 entry 末段；auth 含 terminal", () => {
    const descriptor = buildWorkbenchDescriptor("/apps/@ghcloud/cube-workbench-app/", () => ({
      token: "t",
      tenant: "tn",
    }));
    expect(descriptor).toEqual({
      name: "cube-workbench-app",
      entry: "/apps/@ghcloud/cube-workbench-app/",
      container: WORKBENCH_CONTAINER_SELECTOR,
      activeRule: ["/index", "/workbench"],
      props: { base: "/", auth: { token: "t", tenant: "tn", terminal: "bimops-manage-web" } },
    });
  });
});

describe("registerWorkbenchMicroApp", () => {
  test("entry 为空时不注册", () => {
    const result = registerWorkbenchMicroApp("", () => ({ token: "t", tenant: "tn" }), {
      registerMicroApps: () => {
        throw new Error("不应调用");
      },
      addGlobalUncaughtErrorHandler: () => {
        throw new Error("不应调用");
      },
    });
    expect(result).toBe(false);
  });

  test("非空 entry 时注册 workbench descriptor 并安装错误处理器", () => {
    const registered: WorkbenchMicroAppDescriptor[][] = [];
    let errorHandlerInstalled = false;
    const registrar: MicroAppRegistrar = {
      registerMicroApps: (apps) => {
        registered.push(apps as WorkbenchMicroAppDescriptor[]);
      },
      addGlobalUncaughtErrorHandler: () => {
        errorHandlerInstalled = true;
      },
    };
    const getAuth = () => ({ token: "t", tenant: "tn" });
    const entry = "/apps/@ghcloud/cube-workbench-app/";
    const result = registerWorkbenchMicroApp(entry, getAuth, registrar);
    expect(result).toBe(true);
    expect(registered).toEqual([[buildWorkbenchDescriptor(entry, getAuth)]]);
    expect(errorHandlerInstalled).toBe(true);
  });

  test("beforeLoad 会用最新 getAuth 刷新 props.auth（避免登录后仍用空快照）", async () => {
    let auth = { token: "", tenant: "" };
    let captured:
      | {
          beforeLoad?: (app?: WorkbenchMicroAppDescriptor) => Promise<void>;
        }
      | undefined;
    const registrar: MicroAppRegistrar = {
      registerMicroApps: (_apps, lifeCycles) => {
        captured = lifeCycles;
      },
      addGlobalUncaughtErrorHandler: () => {},
    };
    const entry = "/apps/@ghcloud/cube-workbench-app/";
    registerWorkbenchMicroApp(entry, () => auth, registrar);
    const app = buildWorkbenchDescriptor(entry, () => auth);
    expect(app.props.auth.token).toBe("");

    auth = { token: "fresh", tenant: "ent" };
    await captured?.beforeLoad?.(app);
    expect(app.props.auth).toEqual({
      token: "fresh",
      tenant: "ent",
      terminal: "bimops-manage-web",
    });
  });
});
