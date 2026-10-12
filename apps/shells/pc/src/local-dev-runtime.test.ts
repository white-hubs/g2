import { expect, test } from "bun:test";

import {
  loadLocalDevRuntimeModule,
  shouldLoadRegisteredRemote,
  workspaceClientSourcePath,
  workspacePageLibrarySourcePath,
} from "./local-dev-runtime";

test("安全教育两个入口按需复用正式页面库，注册库时保留 Remote 边界", () => {
  for (const owner of ["secureEdu", "secureEduHead"]) {
    expect(workspacePageLibrarySourcePath("secureEduPages", "pages", { mode: "legacy-compat", localRemoteNames: [owner] })).toBe(
      "apps/page-libraries/secure-edu/src/index.ts",
    );
  }
  expect(workspacePageLibrarySourcePath("secureEduPages", "pages", { mode: "legacy-compat", localRemoteNames: [] })).toBeUndefined();
  expect(
    loadLocalDevRuntimeModule("secureEduPages", "pages", { mode: "legacy-compat", localRemoteNames: ["secureEdu", "secureEduPages"] }),
  ).toBeUndefined();
});
test("资产管理仅启动 Domain 时解析工作区 Client，注册 Client 时使用 Remote", () => {
  expect(
    workspaceClientSourcePath("assetManagementClient", "client", { mode: "legacy-compat", localRemoteNames: ["assetManagement"] }),
  ).toBe("apps/clients/asset-management/src/client.ts");
  expect(
    loadLocalDevRuntimeModule("assetManagementClient", "client", {
      mode: "legacy-compat",
      localRemoteNames: ["assetManagement", "assetManagementClient"],
    }),
  ).toBeUndefined();
});

test("工作汇报按需启动时使用工作区 Client，已注册 Client 优先使用 Remote", () => {
  expect(
    workspaceClientSourcePath("workReportClient", "client", {
      mode: "legacy-compat",
      localRemoteNames: ["workReport"],
    }),
  ).toBe("apps/clients/work-report/src/client.ts");
  expect(
    loadLocalDevRuntimeModule("workReportClient", "client", {
      mode: "legacy-compat",
      localRemoteNames: ["workReport", "workReportClient"],
    }),
  ).toBeUndefined();
});

test("按需启动 meetRoom 时解析其工作区 Client", () => {
  expect(
    workspaceClientSourcePath("meetRoomClient", "client", {
      mode: "legacy-compat",
      localRemoteNames: ["meetRoom"],
    }),
  ).toBe("apps/clients/meet-room/src/client.ts");
});

test("按需启动 governmentManagement 时解析工作区 Client", () => {
  expect(
    workspaceClientSourcePath("governmentManagementClient", "client", {
      mode: "legacy-compat",
      localRemoteNames: ["governmentManagement"],
    }),
  ).toBe("apps/clients/government-management/src/client.ts");
});

test("按需启动 consumptionManagement 时解析工作区 Client", () => {
  expect(
    workspaceClientSourcePath("consumptionManagementClient", "client", {
      mode: "legacy-compat",
      localRemoteNames: ["consumptionManagement"],
    }),
  ).toBe("apps/clients/consumption-management/src/client.ts");
});

test("按需启动 personManagement 时解析其工作区 Client", () => {
  expect(
    workspaceClientSourcePath("personManagementClient", "client", {
      mode: "legacy-compat",
      localRemoteNames: ["personManagement"],
    }),
  ).toBe("apps/clients/person-management/src/client.ts");
});

test("按需启动 factoryManagement 时解析其工作区 Client", () => {
  expect(
    workspaceClientSourcePath("factoryManagementClient", "client", {
      mode: "legacy-compat",
      localRemoteNames: ["factoryManagement"],
    }),
  ).toBe("apps/clients/factory-management/src/client.ts");
});

test("按需启动 knowledgeDocument 时解析其工作区 Client", () => {
  expect(
    workspaceClientSourcePath("knowledgeDocumentClient", "client", {
      mode: "legacy-compat",
      localRemoteNames: ["knowledgeDocument"],
    }),
  ).toBe("apps/clients/knowledge-document/src/client.ts");
});

test("按需启动 riskManagement 时解析其工作区 Client", () => {
  expect(
    workspaceClientSourcePath("riskManagementClient", "client", {
      mode: "legacy-compat",
      localRemoteNames: ["riskManagement"],
    }),
  ).toBe("apps/clients/risk-management/src/client.ts");
});

test("已注册的 riskManagement Client 仍优先使用实际 Remote", () => {
  expect(
    loadLocalDevRuntimeModule("riskManagementClient", "client", {
      mode: "legacy-compat",
      localRemoteNames: ["riskManagement", "riskManagementClient"],
    }),
  ).toBeUndefined();
});

test("局域网 hostname 下已注册 Platform 不走 MF Remote，避免跨端口 CORS", () => {
  const state = { mode: "legacy-compat" as const, localRemoteNames: ["pcChrome"] };
  expect(shouldLoadRegisteredRemote("pcChrome", state, "192.168.4.153")).toBe(false);
  expect(shouldLoadRegisteredRemote("pcChrome", state, "localhost")).toBe(true);
  expect(shouldLoadRegisteredRemote("renovation", { mode: "legacy-compat", localRemoteNames: ["renovation"] }, "192.168.4.153")).toBe(true);
});

test("按需启动 lineLossManagement 时解析其工作区 Client", () => {
  expect(
    workspaceClientSourcePath("lineLossManagementClient", "client", {
      mode: "legacy-compat",
      localRemoteNames: ["lineLossManagement"],
    }),
  ).toBe("apps/clients/line-loss-management/src/client.ts");
});

test("按需启动 safetyPersonnelManagement 时解析其工作区 Client", () => {
  expect(
    workspaceClientSourcePath("safetyPersonnelClient", "client", {
      mode: "g2-profile",
      localRemoteNames: ["safetyPersonnelManagement"],
    }),
  ).toBe("apps/clients/safety-personnel/src/client.ts");
});
