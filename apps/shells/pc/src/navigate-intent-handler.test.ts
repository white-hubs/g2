import { createFakeBus } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import {
  NAVIGATE_INTENT_EVENT,
  type NavigateIntentHandlerDeps,
  handleNavigateIntent,
  installNavigateIntentHandler,
} from "./navigate-intent-handler";

function createDeps(overrides: Partial<NavigateIntentHandlerDeps> = {}): NavigateIntentHandlerDeps & {
  navigated: string[];
  errors: string[];
} {
  const navigated: string[] = [];
  const errors: string[] = [];
  return {
    navigated,
    errors,
    navigate: (path) => {
      navigated.push(path);
    },
    waitNavReady: async () => undefined,
    resolvePathForCode: async () => undefined,
    personManageFirstPath: "/portal/legacy-personal/info",
    onError: (message) => {
      errors.push(message);
    },
    ...overrides,
  };
}

describe("handleNavigateIntent", () => {
  test("同时有 code 与 path 时忽略 path，经 resolvePathForCode 跳转（ADR-0059）", async () => {
    const deps = createDeps({
      resolvePathForCode: async (code) => (code === "AGENCY_CENTER" ? "/d/agency/waiting" : undefined),
    });
    await handleNavigateIntent({ code: "AGENCY_CENTER", path: "/portal/agencyCenter/waitingList" }, deps);
    expect(deps.navigated).toEqual(["/d/agency/waiting"]);
  });

  test("仅有 path、无 code 时仍 navigate(path)（迁移兼容）", async () => {
    const deps = createDeps();
    await handleNavigateIntent({ path: "/portal/agencyCenter/waitingList" }, deps);
    expect(deps.navigated).toEqual(["/portal/agencyCenter/waitingList"]);
  });

  test("仅有 code 时经 resolvePathForCode 取首菜单并 navigate", async () => {
    const deps = createDeps({
      resolvePathForCode: async (code) => (code === "hazard" ? "/ops/hazard-gov" : undefined),
    });
    await handleNavigateIntent({ code: "hazard" }, deps);
    expect(deps.navigated).toEqual(["/ops/hazard-gov"]);
  });

  test("code + params.entry 传给 resolvePathForCode（MF 域具名入口）", async () => {
    const deps = createDeps({
      resolvePathForCode: async (code, params) =>
        code === "access-control" && params?.entry === "devices" ? "/d/access-control/devices" : undefined,
    });
    await handleNavigateIntent({ code: "access-control", params: { entry: "devices" } }, deps);
    expect(deps.navigated).toEqual(["/d/access-control/devices"]);
  });

  test("报警详情 params 平铺 id/businessKey 进入 query 再 resolve", async () => {
    const deps = createDeps({
      resolvePathForCode: async (code, params) => {
        if (code !== "DOORMANAGE" || params?.entry !== "alarmDetail") return undefined;
        const q = params.query;
        return q?.id ? `/d/access-control/alarmDetail?id=${q.id}&businessKey=${q.businessKey}` : undefined;
      },
    });
    await handleNavigateIntent(
      {
        code: "DOORMANAGE",
        params: { entry: "alarmDetail", id: "a1", businessKey: "bk1", deviceId: "d1" },
      },
      deps,
    );
    expect(deps.navigated).toEqual(["/d/access-control/alarmDetail?id=a1&businessKey=bk1"]);
  });

  test("PERSON-MANAGE 无 path 时用壳贡献首项，不走 resolvePathForCode", async () => {
    const deps = createDeps({
      resolvePathForCode: async () => {
        throw new Error("should not resolve OUAA for PERSON-MANAGE");
      },
    });
    await handleNavigateIntent({ code: "PERSON-MANAGE" }, deps);
    expect(deps.navigated).toEqual(["/portal/legacy-personal/info"]);
  });

  test("未知 code 时 onError 且不 navigate", async () => {
    const deps = createDeps({
      resolvePathForCode: async () => undefined,
    });
    await handleNavigateIntent({ code: "missing-app" }, deps);
    expect(deps.navigated).toEqual([]);
    expect(deps.errors).toEqual(["该应用下未分配菜单"]);
  });
});

describe("installNavigateIntentHandler", () => {
  test("订阅 navigate-intent 后异步执行跳转", async () => {
    const bus = createFakeBus();
    let resolveDone!: () => void;
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });
    const navigated: string[] = [];
    installNavigateIntentHandler(bus, {
      navigate: (path) => {
        navigated.push(path);
        resolveDone();
      },
      waitNavReady: async () => undefined,
      resolvePathForCode: async () => undefined,
      personManageFirstPath: "/portal/legacy-personal/info",
      onError: () => undefined,
    });

    bus.publish(NAVIGATE_INTENT_EVENT, { path: "/portal/x" });
    await done;
    expect(navigated).toEqual(["/portal/x"]);
  });

  test("后来的 intent 覆盖进行中的跳转", async () => {
    const bus = createFakeBus();
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let firstEntered = false;
    const navigated: string[] = [];
    let settle!: () => void;
    const settled = new Promise<void>((resolve) => {
      settle = resolve;
    });

    installNavigateIntentHandler(bus, {
      navigate: (path) => {
        navigated.push(path);
        if (path === "/portal/second") {
          settle();
        }
      },
      waitNavReady: async () => {
        if (!firstEntered) {
          firstEntered = true;
          await firstGate;
        }
      },
      resolvePathForCode: async () => undefined,
      personManageFirstPath: "/portal/legacy-personal/info",
      onError: () => undefined,
    });

    bus.publish(NAVIGATE_INTENT_EVENT, { path: "/portal/first" });
    await Promise.resolve();
    bus.publish(NAVIGATE_INTENT_EVENT, { path: "/portal/second" });
    releaseFirst();
    await settled;
    await Promise.resolve();
    await Promise.resolve();

    expect(navigated).toEqual(["/portal/second"]);
  });
});
