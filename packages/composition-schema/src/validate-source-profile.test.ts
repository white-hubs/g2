import { describe, expect, test } from "bun:test";

import { validateSourceProfile } from "./validate-source-profile";

describe("validateSourceProfile", () => {
  test("accepts versioned coreRuntime entries", () => {
    const result = validateSourceProfile(`
facade: pc
env: demo
coreRuntime:
  - name: pcUi
    logicalName: pcUi
    apiVersion: "1.x"
platform: []
inline: []
remotes: []
`);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.profile.coreRuntime).toEqual([{ name: "pcUi", logicalName: "pcUi", apiVersion: "1.x" }]);
  });

  test("接受 pageLibrary 槽位（无 basePath，ADR-0059/0060）", () => {
    const yaml = `
facade: pc
env: demo
platform: []
inline: []
remotes: []
pageLibrary:
  - name: genericEquipmentMonitorPages
    logicalName: genericEquipmentMonitorPages
`;
    const result = validateSourceProfile(yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.pageLibrary).toEqual([{ name: "genericEquipmentMonitorPages", logicalName: "genericEquipmentMonitorPages" }]);
    }
  });

  test("拒绝 pageLibrary 条目携带 basePath", () => {
    const yaml = `
facade: pc
env: demo
pageLibrary:
  - name: gemPages
    logicalName: gemPages
    basePath: /d/gem
`;
    const result = validateSourceProfile(yaml);
    expect(result.ok).toBe(false);
  });

  test("接受只含逻辑名的 platform/remotes 条目", () => {
    const yaml = `
facade: pc
env: demo
platform:
  - name: httpPlatform
    logicalName: httpPlatform
inline:
  - name: poc-inline-pc
    package: "@g2-domain/poc-inline-pc"
    basePath: /poc-inline
remotes:
  - name: pocRemotePc
    logicalName: pocRemotePc
    basePath: /poc-remote
`;
    const result = validateSourceProfile(yaml);
    expect(result.ok).toBe(true);
  });

  test("拒绝 platform 条目里出现 entry 字段（源 Profile 不应该有具体地址）", () => {
    const yaml = `
facade: pc
env: demo
platform:
  - name: httpPlatform
    entry: "http://localhost:5015/mf-manifest.json"
inline: []
remotes: []
`;
    const result = validateSourceProfile(yaml);
    expect(result.ok).toBe(false);
  });

  test("接受 displayGroups 分组展示元数据，platform/inline/remotes 条目可选引用 group key", () => {
    const yaml = `
facade: pc
env: demo
displayGroups:
  - key: admin-tools
    label: 管理工具
    order: 1
platform:
  - name: pcAuth
    logicalName: pcAuth
inline: []
remotes: []
`;
    const result = validateSourceProfile(yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.displayGroups).toEqual([{ key: "admin-tools", label: "管理工具", order: 1 }]);
    }
  });

  test("displayGroups 缺 label 时报错", () => {
    const yaml = `
facade: pc
env: demo
displayGroups:
  - key: x
    order: 1
platform: []
inline: []
remotes: []
`;
    const result = validateSourceProfile(yaml);
    expect(result.ok).toBe(false);
  });

  test("接受 client 槽位（服务 Client，逻辑名 + 无 entry）", () => {
    const yaml = `
facade: pc
env: demo
platform: []
client:
  - name: messageClient
    logicalName: messageClient
inline: []
remotes: []
`;
    const result = validateSourceProfile(yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.client).toEqual([{ name: "messageClient", logicalName: "messageClient" }]);
    }
  });

  test("拒绝 client 条目里出现 entry 字段", () => {
    const yaml = `
facade: pc
env: demo
platform: []
client:
  - name: messageClient
    entry: "http://localhost:5020/mf-manifest.json"
inline: []
remotes: []
`;
    const result = validateSourceProfile(yaml);
    expect(result.ok).toBe(false);
  });
});
