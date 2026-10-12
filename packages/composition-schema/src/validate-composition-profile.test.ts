import { describe, expect, test } from "bun:test";

import { validateCompositionProfile } from "./validate-composition-profile";

describe("validateCompositionProfile", () => {
  test("accepts resolved coreRuntime entries", () => {
    const result = validateCompositionProfile(`
facade: pc
env: demo
coreRuntime:
  - name: pcUi
    entry: "http://localhost:5016/mf-manifest.json"
    apiVersion: "1.x"
platform: []
inline: []
remotes: []
`);
    expect(result.ok).toBe(true);
  });

  test("accepts a valid pc composition profile yaml", () => {
    const yaml = `
facade: pc
env: demo
platform:
  - name: httpPlatform
    entry: "http://localhost:5015/mf-manifest.json"
inline:
  - name: poc-inline-pc
    package: "@g2-domain/poc-inline-pc"
    basePath: /poc-inline
remotes:
  - name: pocRemotePc
    entry: "http://localhost:5002/mf-manifest.json"
    basePath: /poc-remote
`;
    const result = validateCompositionProfile(yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.facade).toBe("pc");
      expect(result.profile.platform).toHaveLength(1);
      expect(result.profile.inline).toHaveLength(1);
      expect(result.profile.remotes).toHaveLength(1);
    }
  });

  test("rejects a profile missing facade", () => {
    const yaml = `
env: demo
platform: []
inline: []
remotes: []
`;
    const result = validateCompositionProfile(yaml);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("facade"))).toBe(true);
    }
  });

  test("接受带 config 的 platform 条目", () => {
    const yaml = `
facade: pc
env: demo
platform:
  - name: pcAuth
    entry: "http://localhost:5010/mf-manifest.json"
    config:
      strategies: ["standard"]
inline: []
remotes: []
`;
    const result = validateCompositionProfile(yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const platform = result.profile.platform[0] as { config?: Record<string, unknown> };
      expect(platform.config).toEqual({ strategies: ["standard"] });
    }
  });

  test("接受带 allowOverride 的 inline 条目，默认 false", () => {
    const yamlWithout = `
facade: pc
env: demo
platform: []
inline:
  - name: poc-inline-pc
    package: "@g2-domain/poc-inline-pc"
    basePath: /poc-inline
remotes: []
`;
    const result = validateCompositionProfile(yamlWithout);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const inline = result.profile.inline[0] as { allowOverride?: boolean };
      expect(inline.allowOverride).toBe(false);
    }
  });

  test("接受 allowOverride: true 的 inline 条目", () => {
    const yamlWith = `
facade: pc
env: demo
platform: []
inline:
  - name: poc-inline-pc
    package: "@g2-domain/poc-inline-pc"
    basePath: /poc-inline
    allowOverride: true
remotes: []
`;
    const result = validateCompositionProfile(yamlWith);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const inline = result.profile.inline[0] as { allowOverride?: boolean };
      expect(inline.allowOverride).toBe(true);
    }
  });

  test("拒绝 profile 里出现 tenant 字段（ADR-0044 负向约束）", () => {
    const yaml = `
facade: pc
env: demo
tenant: acme
platform: []
inline: []
remotes: []
`;
    const result = validateCompositionProfile(yaml);
    expect(result.ok).toBe(false);
  });
});
