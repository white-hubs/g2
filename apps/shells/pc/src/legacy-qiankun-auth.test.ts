import { describe, expect, test } from "bun:test";

import { BIMOPS_PC_TERMINAL } from "./legacy-constants";
import {
  LEGACY_GH_CURRENT_APPLICATION_KEY,
  LEGACY_GH_CURRENT_MENUS_KEY,
  LEGACY_GH_ENTERPRISE_KEY,
  LEGACY_GH_TOKEN_KEY,
  LEGACY_GH_USER_INFO_KEY,
  type LegacyQiankunAuth,
  buildLegacyQiankunAuth,
  clearLegacyQiankunAuth,
  parsePortalMicroAppName,
  syncLegacyApplicationForMicroApp,
  syncLegacyQiankunAuth,
  syncLegacyUserInfo,
} from "./legacy-qiankun-auth";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    getItem: (k: string) => map.get(k) ?? null,
  };
}

describe("buildLegacyQiankunAuth", () => {
  test("无 token 返回 null；有 token 时补齐 terminal", () => {
    expect(buildLegacyQiankunAuth({})).toBeNull();
    expect(buildLegacyQiankunAuth({ token: "t", tenant: "tn" })).toEqual({
      token: "t",
      tenant: "tn",
      terminal: BIMOPS_PC_TERMINAL,
    });
  });
});

describe("syncLegacyQiankunAuth", () => {
  test("同时写入 __CUBE_AUTH_INFO__、GH-Token、GH-NowEnterprise", () => {
    const storage = memoryStorage();
    const target = {} as Window & { __CUBE_AUTH_INFO__?: LegacyQiankunAuth };
    const snapshot = syncLegacyQiankunAuth(target, { token: "access", tenant: "ent-1" }, storage);
    expect(snapshot).not.toBeNull();
    expect(target.__CUBE_AUTH_INFO__).toEqual(snapshot!);
    expect(JSON.parse(storage.getItem(LEGACY_GH_TOKEN_KEY)!)).toEqual({ access_token: "access" });
    expect(JSON.parse(storage.getItem(LEGACY_GH_ENTERPRISE_KEY)!)).toEqual({ code: "ent-1" });
  });

  test("清空时移除鉴权全局与全部 GH session key", () => {
    const storage = memoryStorage();
    const target = {
      __CUBE_AUTH_INFO__: { token: "x", tenant: "y", terminal: BIMOPS_PC_TERMINAL },
    } as Window & { __CUBE_AUTH_INFO__?: LegacyQiankunAuth };
    storage.setItem(LEGACY_GH_TOKEN_KEY, "{}");
    storage.setItem(LEGACY_GH_ENTERPRISE_KEY, "{}");
    storage.setItem(LEGACY_GH_CURRENT_APPLICATION_KEY, "{}");
    storage.setItem(LEGACY_GH_CURRENT_MENUS_KEY, "[]");
    storage.setItem(LEGACY_GH_USER_INFO_KEY, '{"id":"1"}');
    clearLegacyQiankunAuth(target, storage);
    expect(target.__CUBE_AUTH_INFO__).toBeUndefined();
    expect(storage.getItem(LEGACY_GH_TOKEN_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_GH_ENTERPRISE_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_GH_CURRENT_APPLICATION_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_GH_CURRENT_MENUS_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_GH_USER_INFO_KEY)).toBeNull();
  });
});

describe("syncLegacyUserInfo", () => {
  test("写入 GH-UserInfo，供 personal-migrate 读 .id", () => {
    const storage = memoryStorage();
    syncLegacyUserInfo(storage, { id: "1478636886984523777", name: "超级管理员3" });
    expect(JSON.parse(storage.getItem(LEGACY_GH_USER_INFO_KEY)!)).toEqual({
      id: "1478636886984523777",
      name: "超级管理员3",
    });
    // 对齐子应用：JSON.parse(sessionStorage.getItem("GH-UserInfo")).id
    expect(JSON.parse(storage.getItem(LEGACY_GH_USER_INFO_KEY)!).id).toBe("1478636886984523777");
  });

  test("无 id 时不写，避免用残缺对象覆盖已有资料", () => {
    const storage = memoryStorage();
    storage.setItem(LEGACY_GH_USER_INFO_KEY, JSON.stringify({ id: "keep" }));
    syncLegacyUserInfo(storage, { name: "无 id" });
    expect(JSON.parse(storage.getItem(LEGACY_GH_USER_INFO_KEY)!)).toEqual({ id: "keep" });
  });
});

describe("parsePortalMicroAppName / syncLegacyApplicationForMicroApp", () => {
  test("从 /portal/{name}/... 解析 microApp name", () => {
    expect(parsePortalMicroAppName("/portal/problems/problemsList")).toBe("problems");
    expect(parsePortalMicroAppName("/portal/legacy-personal/")).toBe("legacy-personal");
    expect(parsePortalMicroAppName("/index")).toBeNull();
  });

  test("按 microApp name 写入 GH-currentApplication.code，避免子应用读 null.code", () => {
    const storage = memoryStorage();
    syncLegacyApplicationForMicroApp(storage, "problems", [{ path: "/portal/problems/problemsList" }]);
    expect(JSON.parse(storage.getItem(LEGACY_GH_CURRENT_APPLICATION_KEY)!)).toEqual({
      code: "problems",
      name: "problems",
    });
    expect(JSON.parse(storage.getItem(LEGACY_GH_CURRENT_MENUS_KEY)!)).toEqual([{ path: "/portal/problems/problemsList" }]);
  });
});
