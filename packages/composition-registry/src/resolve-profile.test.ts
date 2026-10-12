import { describe, expect, test } from "bun:test";

import { resolveBaseUrlFromRegistry, resolveProfile, resolveStaticResourceBaseFromRegistry } from "./resolve-profile";

describe("resolveProfile", () => {
  test("resolves core runtime entries through the registry pointer", () => {
    const resolved = resolveProfile(
      {
        facade: "pc",
        env: "prod",
        coreRuntime: [{ name: "pcUi", logicalName: "pcUi", apiVersion: "1.x" }],
        platform: [],
        inline: [],
        remotes: [],
      },
      { pcUi: "https://cdn.example.com/pcUi/2026.09.22/mf-manifest.json" },
    );
    expect(resolved.coreRuntime).toEqual([
      { name: "pcUi", entry: "https://cdn.example.com/pcUi/2026.09.22/mf-manifest.json", apiVersion: "1.x" },
    ]);
  });

  test("把 platform entry 的逻辑名换成注册表里的具体地址", () => {
    const source = {
      facade: "pc" as const,
      env: "demo",
      platform: [{ name: "pcAuth", logicalName: "pcAuth" }],
      inline: [],
      remotes: [],
    };
    const registry = { pcAuth: "http://localhost:5010/mf-manifest.json", backendApi: "https://api.demo.example.com" };
    const resolved = resolveProfile(source, registry);
    expect(resolved.platform[0]).toMatchObject({ name: "pcAuth", entry: "http://localhost:5010/mf-manifest.json" });
  });

  test("registry 里找不到对应逻辑名时报错，列出缺失的逻辑名", () => {
    const source = {
      facade: "pc" as const,
      env: "demo",
      platform: [{ name: "pcAuth", logicalName: "pcAuth" }],
      inline: [],
      remotes: [],
    };
    expect(() => resolveProfile(source, {})).toThrow(/pcAuth/);
  });

  test("resolveBaseUrl 从注册表按 backendApi 逻辑名取值，缺失时返回 undefined（走同源默认）", () => {
    const registry = { backendApi: "https://api.demo.example.com" };
    expect(resolveBaseUrlFromRegistry(registry)).toBe("https://api.demo.example.com");
    expect(resolveBaseUrlFromRegistry({})).toBeUndefined();
  });

  test("resolveStaticResourceBase 从注册表按 staticResourceBase 取值，空串/缺失为 undefined", () => {
    expect(resolveStaticResourceBaseFromRegistry({ staticResourceBase: "https://r.kaiheai.com/" })).toBe("https://r.kaiheai.com");
    expect(resolveStaticResourceBaseFromRegistry({ staticResourceBase: "" })).toBeUndefined();
    expect(resolveStaticResourceBaseFromRegistry({})).toBeUndefined();
  });

  test("把 pageLibrary entry 的逻辑名换成注册表里的具体地址", () => {
    const source = {
      facade: "pc" as const,
      env: "demo",
      platform: [] as { name: string; logicalName: string }[],
      inline: [] as { name: string; package: string; basePath: string }[],
      remotes: [] as { name: string; logicalName: string; basePath: string }[],
      pageLibrary: [{ name: "gemPages", logicalName: "genericEquipmentMonitorPages" }],
    };
    const resolved = resolveProfile(source, {
      genericEquipmentMonitorPages: "http://localhost:5051/mf-manifest.json",
    });
    expect(resolved.pageLibrary).toEqual([{ name: "gemPages", entry: "http://localhost:5051/mf-manifest.json" }]);
  });

  test("把 client entry 的逻辑名换成注册表里的具体地址", () => {
    const source = {
      facade: "pc" as const,
      env: "demo",
      platform: [],
      client: [{ name: "messageClient", logicalName: "messageClient" }],
      inline: [],
      remotes: [],
    };
    const resolved = resolveProfile(source, { messageClient: "http://localhost:5020/mf-manifest.json" });
    expect(resolved.client[0]).toMatchObject({ name: "messageClient", entry: "http://localhost:5020/mf-manifest.json" });
  });

  test("client 逻辑名缺失时 resolveProfile 抛错", () => {
    const source = {
      facade: "pc" as const,
      env: "demo",
      platform: [],
      client: [{ name: "messageClient", logicalName: "messageClient" }],
      inline: [],
      remotes: [],
    };
    expect(() => resolveProfile(source, {})).toThrow(/messageClient/);
  });

  test("resolveProfile 带上 staticResourceBaseUrl", () => {
    const source = {
      facade: "pc" as const,
      env: "demo",
      platform: [{ name: "pcAuth", logicalName: "pcAuth" }],
      inline: [],
      remotes: [],
    };
    const resolved = resolveProfile(source, {
      pcAuth: "http://localhost:5010/mf-manifest.json",
      staticResourceBase: "https://r.kaiheai.com",
    });
    expect(resolved.staticResourceBaseUrl).toBe("https://r.kaiheai.com");
  });

  test("相对 key 经 webReleaseBase 拼成绝对 entry", () => {
    const source = {
      facade: "pc" as const,
      env: "prod",
      platform: [{ name: "pcAuth", logicalName: "pcAuth" }],
      inline: [],
      remotes: [],
    };
    const resolved = resolveProfile(source, {
      webReleaseBase: "http://localhost:8081",
      pcAuth: "pcAuth/20260722.b32db5b/mf-manifest.json",
    });
    expect(resolved.platform[0]?.entry).toBe("http://localhost:8081/pcAuth/20260722.b32db5b/mf-manifest.json");
  });

  test("绝对 URL 不拼接 webReleaseBase", () => {
    const source = {
      facade: "pc" as const,
      env: "dev",
      platform: [{ name: "pcAuth", logicalName: "pcAuth" }],
      inline: [],
      remotes: [],
    };
    const resolved = resolveProfile(source, {
      pcAuth: "http://localhost:5010/mf-manifest.json",
    });
    expect(resolved.platform[0]?.entry).toBe("http://localhost:5010/mf-manifest.json");
  });

  test("相对 key 缺少 webReleaseBase 时抛错", () => {
    const source = {
      facade: "pc" as const,
      env: "prod",
      platform: [{ name: "pcAuth", logicalName: "pcAuth" }],
      inline: [],
      remotes: [],
    };
    expect(() => resolveProfile(source, { pcAuth: "pcAuth/20260722.b32db5b/mf-manifest.json" })).toThrow(/webReleaseBase/);
  });
});
