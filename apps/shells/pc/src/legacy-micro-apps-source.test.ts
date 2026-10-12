import { describe, expect, test } from "bun:test";

import { DEFAULT_WORKBENCH_ENTRY, resolveLegacyMicroApps, resolveWorkbenchEntry } from "./legacy-micro-apps-source";

describe("resolveLegacyMicroApps", () => {
  test("window.config 不存在（还没有任何运行时注入，main.ts 传入 undefined）时如实返回空数组", () => {
    expect(resolveLegacyMicroApps(undefined)).toEqual([]);
    expect(resolveLegacyMicroApps(null)).toEqual([]);
  });

  test("window.config 存在但没有 microApps 字段时返回空数组", () => {
    expect(resolveLegacyMicroApps({})).toEqual([]);
  });

  test("window.config.microApps 不是数组时返回空数组（防御性解析，不因脏配置崩溃）", () => {
    expect(resolveLegacyMicroApps({ microApps: "not-an-array" })).toEqual([]);
    expect(resolveLegacyMicroApps({ microApps: {} })).toEqual([]);
  });

  test("window.config.microApps 是真实非空清单时，原样解析出 LegacyMicroAppConfig[]（这是清单非空场景的真实激活入口）", () => {
    const source = {
      microApps: [
        { name: "legacy-personal", entry: "https://old.example.com/legacy-personal/" },
        { name: "legacy-fire", entry: "https://old.example.com/legacy-fire/" },
      ],
    };
    expect(resolveLegacyMicroApps(source)).toEqual([
      { name: "legacy-personal", entry: "https://old.example.com/legacy-personal/" },
      { name: "legacy-fire", entry: "https://old.example.com/legacy-fire/" },
    ]);
  });

  test("清单里混入缺字段/类型不对的脏项时，只过滤掉脏项，不整体丢弃合法项", () => {
    const source = {
      microApps: [
        { name: "legacy-personal", entry: "https://old.example.com/legacy-personal/" },
        { name: "missing-entry" },
        { entry: "https://old.example.com/missing-name/" },
        { name: "", entry: "https://old.example.com/empty-name/" },
        null,
        "not-an-object",
        42,
      ],
    };
    expect(resolveLegacyMicroApps(source)).toEqual([{ name: "legacy-personal", entry: "https://old.example.com/legacy-personal/" }]);
  });
});

describe("resolveWorkbenchEntry", () => {
  test("window.config 缺失或 homeEntry 非法时回落到默认 cube-workbench-app", () => {
    expect(resolveWorkbenchEntry(undefined)).toBe(DEFAULT_WORKBENCH_ENTRY);
    expect(resolveWorkbenchEntry(null)).toBe(DEFAULT_WORKBENCH_ENTRY);
    expect(resolveWorkbenchEntry({})).toBe(DEFAULT_WORKBENCH_ENTRY);
    expect(resolveWorkbenchEntry({ homeEntry: "" })).toBe(DEFAULT_WORKBENCH_ENTRY);
    expect(resolveWorkbenchEntry({ homeEntry: "   " })).toBe(DEFAULT_WORKBENCH_ENTRY);
    expect(resolveWorkbenchEntry({ homeEntry: 42 })).toBe(DEFAULT_WORKBENCH_ENTRY);
    expect(DEFAULT_WORKBENCH_ENTRY).toBe("/apps/@ghcloud/cube-workbench-app/");
  });

  test("homeEntry 为非空字符串时原样（trim 后）返回", () => {
    expect(resolveWorkbenchEntry({ homeEntry: "/apps/@ghcloud/cube-workbench-app/" })).toBe("/apps/@ghcloud/cube-workbench-app/");
    expect(resolveWorkbenchEntry({ homeEntry: "  https://cdn.example.com/wb/  " })).toBe("https://cdn.example.com/wb/");
  });
});
