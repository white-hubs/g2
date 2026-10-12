import { describe, expect, test } from "bun:test";

import { filterLocallyOverriddenQiankunApps, filterMigratedQiankunApps } from "./filter-migrated-qiankun-apps";

describe("filterMigratedQiankunApps", () => {
  test("仅替换资产管理精确旧应用注册名，未启动时保留旧应用", () => {
    const apps = [
      { name: "asset-management", entry: "https://legacy/asset-management" },
      { name: "asset-management-preview", entry: "https://legacy/asset-management-preview" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["asset-management-preview"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["assetManagement"]).map((app) => app.name)).toEqual(["asset-management-preview"]);
    expect(filterLocallyOverriddenQiankunApps(apps, [])).toEqual(apps);
  });
  test("仅替换工作汇报的精确旧应用注册名", () => {
    const apps = [
      { name: "work-report", entry: "https://legacy/work-report" },
      { name: "work-report-preview", entry: "https://legacy/work-report-preview" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["work-report-preview"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["workReport"]).map((app) => app.name)).toEqual(["work-report-preview"]);
    expect(filterLocallyOverriddenQiankunApps(apps, [])).toEqual(apps);
  });
  test("仅替换会议室管理旧应用", () => {
    const apps = [
      { name: "meet-room", entry: "https://legacy/apps/meet-room" },
      { name: "meet-room-preview", entry: "https://legacy/apps/meet-room-preview" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["meet-room-preview"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["meetRoom"]).map((app) => app.name)).toEqual(["meet-room-preview"]);
  });
  test("仅过滤行政管理原始 qiankun 注册名", () => {
    const apps = [
      { name: "governmentManagement", entry: "https://legacy/government" },
      { name: "governmentManagement-preview", entry: "https://legacy/government-preview" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["governmentManagement-preview"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["governmentManagement"]).map((app) => app.name)).toEqual([
      "governmentManagement-preview",
    ]);
  });

  test("仅替换精确注册名 ConsumptionManagement", () => {
    const apps = [
      { name: "ConsumptionManagement", entry: "https://legacy/consumption-management" },
      { name: "ConsumptionManagement-preview", entry: "https://legacy/consumption-management-preview" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["ConsumptionManagement-preview"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["consumptionManagement"]).map((app) => app.name)).toEqual([
      "ConsumptionManagement-preview",
    ]);
  });

  test("replaces only the exact legacy person-management application", () => {
    const apps = [
      { name: "personalManagement", entry: "https://legacy/apps/person-management" },
      { name: "personalManagement-preview", entry: "https://legacy/apps/person-management-preview" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["personalManagement-preview"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["personManagement"]).map((app) => app.name)).toEqual(["personalManagement-preview"]);
  });

  test("replaces only the exact legacy factory-management application", () => {
    const apps = [
      { name: "factorymanagement-migrate", entry: "https://legacy/apps/factory-management" },
      { name: "factorymanagement-preview", entry: "https://legacy/apps/factory-management-preview" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["factorymanagement-preview"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["factoryManagement"]).map((app) => app.name)).toEqual(["factorymanagement-preview"]);
  });

  test("共享旧 user-center 宿主仅在两个本地域都启动时卸载", () => {
    const apps = [{ name: "user-center", entry: "https://legacy/user-center" }];
    expect(filterLocallyOverriddenQiankunApps(apps, ["userCenter"])).toEqual(apps);
    expect(filterLocallyOverriddenQiankunApps(apps, ["logManagement"])).toEqual(apps);
    expect(filterLocallyOverriddenQiankunApps(apps, ["userCenter", "logManagement"])).toEqual([]);
    expect(filterMigratedQiankunApps(apps)).toEqual([]);
  });

  test("replaces only the exact legacy knowledge-document application", () => {
    const apps = [
      { name: "cube-knowledge-document-app", entry: "https://legacy/apps/knowledge-document" },
      { name: "knowledge-document-preview", entry: "https://legacy/apps/knowledge-document-preview" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["knowledge-document-preview"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["knowledgeDocument"]).map((app) => app.name)).toEqual(["knowledge-document-preview"]);
  });

  test("replaces the command configuration app without removing the standalone dispatch app", () => {
    const apps = [
      { name: "command-dispatch-config", entry: "https://legacy/apps/command-dispatch-config" },
      { name: "command-dispatch", entry: "https://legacy/command-dispatch" },
      { name: "emergency-dispatch", entry: "https://legacy/emergency-dispatch" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["command-dispatch"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["commandDispatch"]).map((app) => app.name)).toEqual([
      "command-dispatch",
      "emergency-dispatch",
    ]);
    expect(filterLocallyOverriddenQiankunApps(apps, []).map((app) => app.name)).toEqual(apps.map((app) => app.name));
  });
  test("filters the migrated video-monitor-auth application", () => {
    const kept = filterMigratedQiankunApps([
      { name: "video-monitor-auth", entry: "http://legacy-video-monitor" },
      { name: "still-legacy", entry: "http://legacy-app" },
    ]);
    expect(kept.map((app) => app.name)).toEqual(["still-legacy"]);
  });

  test("replaces only the legacy secure education application", () => {
    const apps = [
      { name: "secure-edu", entry: "https://legacy/apps/secure-edu/app" },
      { name: "secure-edu-mobile", entry: "https://legacy/apps/secure-edu/mobile" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["secure-edu-mobile"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["secureEduHead"]).map((app) => app.name)).toEqual(["secure-edu", "secure-edu-mobile"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["secureEdu"]).map((app) => app.name)).toEqual(["secure-edu", "secure-edu-mobile"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["secureEdu", "secureEduHead"]).map((app) => app.name)).toEqual(["secure-edu-mobile"]);
  });

  test("strips hazard-governance after MF migration", () => {
    const kept = filterMigratedQiankunApps([
      { name: "hazard-governance", entry: "https://cdn.example/hazard/" },
      { name: "hazard-gov", entry: "https://cdn.example/hazard-legacy/" },
    ]);
    expect(kept.map((app) => app.name)).toEqual(["hazard-gov"]);
  });

  test("strips the explicitly mapped risk-management legacy application", () => {
    const kept = filterMigratedQiankunApps([
      { name: "risk-management", entry: "https://env/risk-management/" },
      { name: "risk-management-preview", entry: "https://env/risk-management-preview/" },
    ]);
    expect(kept.map((app) => app.name)).toEqual(["risk-management-preview"]);
  });

  test("strips access-control (already MF domain)", () => {
    const kept = filterMigratedQiankunApps([
      { name: "hazard-gov", entry: "https://cdn.example/hazard/" },
      { name: "access-control", entry: "https://cdn.example/access-control/" },
      { name: "AccessControl", entry: "https://cdn.example/ac/" },
    ]);
    expect(kept.map((a) => a.name)).toEqual(["hazard-gov"]);
  });

  test("strips genericEquipmentMonitor after MF migration", () => {
    const kept = filterMigratedQiankunApps([
      { name: "hazard-gov", entry: "https://cdn.example/hazard/" },
      { name: "genericEquipmentMonitor", entry: "https://cdn.example/gem/" },
    ]);
    expect(kept.map((a) => a.name)).toEqual(["hazard-gov"]);
  });

  test("strips stream-engine config and render after MF migration", () => {
    const kept = filterMigratedQiankunApps([
      { name: "hazard-gov", entry: "https://cdn.example/hazard/" },
      { name: "flow-engine", entry: "https://cdn.example/flow-engine/" },
      { name: "stream-engine-config", entry: "https://cdn.example/stream-engine-config/" },
      { name: "stream-engine-render", entry: "https://cdn.example/stream-engine-render/" },
    ]);
    expect(kept.map((a) => a.name)).toEqual(["hazard-gov"]);
    expect(
      filterLocallyOverriddenQiankunApps(
        [
          { name: "flow-engine", entry: "https://legacy/flow-engine" },
          { name: "stream-engine-render", entry: "https://legacy/render" },
          { name: "other", entry: "https://legacy/other" },
        ],
        ["streamEngine", "streamEnginePages"],
      ).map((app) => app.name),
    ).toEqual(["other"]);
  });

  test("strips daily-task after MF migration", () => {
    const kept = filterMigratedQiankunApps([
      { name: "hazard-gov", entry: "https://cdn.example/hazard/" },
      { name: "daily-task", entry: "https://cdn.example/daily-task/" },
      { name: "DailyTask", entry: "https://cdn.example/daily-task-alias/" },
    ]);
    expect(kept.map((a) => a.name)).toEqual(["hazard-gov"]);
  });

  test("strips daily-inspection aliases after MF migration", () => {
    const kept = filterMigratedQiankunApps([
      { name: "hazard-gov", entry: "https://cdn.example/hazard/" },
      { name: "daily-inspection", entry: "https://cdn.example/daily-inspection/" },
      { name: "cube-daily-inspection-app", entry: "https://cdn.example/daily-inspection-alias/" },
    ]);
    expect(kept.map((a) => a.name)).toEqual(["hazard-gov"]);
  });

  test("strips security-monitor legacy aliases after MF migration", () => {
    const kept = filterMigratedQiankunApps([
      { name: "hazard-gov", entry: "https://cdn.example/hazard/" },
      { name: "security-monitor-migrate", entry: "https://cdn.example/security-monitor/" },
      { name: "SecurityMonitor", entry: "https://cdn.example/security-monitor-alias/" },
    ]);
    expect(kept.map((a) => a.name)).toEqual(["hazard-gov"]);
  });

  test("strips safety personnel management legacy aliases after MF migration", () => {
    const result = filterMigratedQiankunApps([
      { name: "cube-safety-personnel-management", entry: "https://cdn.example/safety-personnel/" },
      { name: "unrelated-app", entry: "https://cdn.example/unrelated/" },
    ]);
    expect(result.map((app) => app.name)).toEqual(["unrelated-app"]);
  });

  test("strips fire-management after MF migration", () => {
    const kept = filterMigratedQiankunApps([
      { name: "hazard-gov", entry: "https://cdn.example/hazard/" },
      { name: "fire-management", entry: "https://cdn.example/fire-management/" },
      { name: "FireManagement", entry: "https://cdn.example/fire-management-alias/" },
    ]);
    expect(kept.map((a) => a.name)).toEqual(["hazard-gov"]);
  });

  test("strips broadcast-center aliases after MF migration", () => {
    const kept = filterMigratedQiankunApps([
      { name: "hazard-gov", entry: "https://cdn.example/hazard/" },
      { name: "broadcast-migrate", entry: "https://cdn.example/broadcast/" },
      { name: "broadcastCenter", entry: "https://cdn.example/broadcast-alias/" },
      { name: "cube-broadcast-center-app", entry: "https://cdn.example/broadcast-app/" },
    ]);
    expect(kept.map((a) => a.name)).toEqual(["hazard-gov"]);
  });

  test("strips line-loss-management and graph-editor legacy applications", () => {
    const kept = filterMigratedQiankunApps([
      { name: "line-loss-management", entry: "https://cdn.example/line-loss/" },
      { name: "graph-editor", entry: "https://cdn.example/graph-editor/" },
      { name: "graphEditor", entry: "https://cdn.example/graph-editor-alias/" },
      { name: "unrelated", entry: "https://cdn.example/other/" },
    ]);
    expect(kept.map((app) => app.name)).toEqual(["unrelated"]);
  });

  test("local lineLossManagement also suppresses graph-editor lineLoss host", () => {
    const kept = filterLocallyOverriddenQiankunApps(
      [
        { name: "line-loss-management", entry: "https://env/line-loss/" },
        { name: "graph-editor", entry: "https://env/graph-editor/" },
        { name: "still-legacy", entry: "https://env/legacy/" },
      ],
      ["lineLossManagement"],
    );
    expect(kept.map((app) => app.name)).toEqual(["still-legacy"]);
  });

  test("strips warehouse-safety aliases after MF migration", () => {
    const apps = [
      { name: "warehouse-safety", entry: "https://legacy.example/warehouse-safety/" },
      { name: "cube-warehouse-safety-app", entry: "https://legacy.example/warehouse-safety-app/" },
      { name: "still-legacy", entry: "https://legacy.example/still-legacy/" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["still-legacy"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["warehouseSafety"]).map((app) => app.name)).toEqual(["still-legacy"]);
  });

  test("strips emergency-supplies after MF migration", () => {
    const apps = [
      { name: "emergency-supplies", entry: "https://legacy.example/emergency-supplies/" },
      { name: "still-legacy", entry: "https://legacy.example/still-legacy/" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["still-legacy"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["emergencySupplies"]).map((app) => app.name)).toEqual(["still-legacy"]);
  });

  test("strips fumigation-operation aliases after MF migration", () => {
    const apps = [
      { name: "fumigation-operation", entry: "https://legacy.example/fumigation-operation/" },
      { name: "cube-fumigation-operation-app", entry: "https://legacy.example/fumigation-operation-app/" },
      { name: "still-legacy", entry: "https://legacy.example/still-legacy/" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["still-legacy"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["fumigationOperation"]).map((app) => app.name)).toEqual(["still-legacy"]);
  });

  test("strips the exact legacy form-audit application after MF migration", () => {
    const apps = [
      { name: "cube-form-audit-app", entry: "https://legacy.example/form-audit/" },
      { name: "still-legacy", entry: "https://legacy.example/still-legacy/" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["still-legacy"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["formAudit"]).map((app) => app.name)).toEqual(["still-legacy"]);
  });

  test("strips the exact legacy work-order-center application after MF migration", () => {
    const apps = [
      { name: "cube-work-order-center-app", entry: "https://legacy.example/work-order-center/" },
      { name: "work-order-center-preview", entry: "https://legacy.example/work-order-center-preview/" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["work-order-center-preview"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["workOrderCenter"]).map((app) => app.name)).toEqual(["work-order-center-preview"]);
  });

  test("strips the exact legacy electronic-patrol application after MF migration", () => {
    const apps = [
      { name: "electronic-patrol", entry: "https://legacy.example/electronic-patrol/" },
      { name: "electronic-patrol-preview", entry: "https://legacy.example/electronic-patrol-preview/" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["electronic-patrol-preview"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["electronicPatrol"]).map((app) => app.name)).toEqual(["electronic-patrol-preview"]);
  });

  test("strips the exact legacy technicalBulletin application after MF migration", () => {
    const apps = [
      { name: "technicalBulletin", entry: "https://legacy.example/technicalbulletin-migrate/" },
      { name: "technicalBulletin-preview", entry: "https://legacy.example/technicalbulletin-preview/" },
    ];
    expect(filterMigratedQiankunApps(apps).map((app) => app.name)).toEqual(["technicalBulletin-preview"]);
    expect(filterLocallyOverriddenQiankunApps(apps, ["technicalBulletin"]).map((app) => app.name)).toEqual(["technicalBulletin-preview"]);
  });
});

describe("filterLocallyOverriddenQiankunApps", () => {
  test("keeps target applications except the locally started matching domain", () => {
    const kept = filterLocallyOverriddenQiankunApps(
      [
        { name: "hazard-governance", entry: "https://env/hazard/" },
        { name: "energy-consumption-migrate", entry: "https://env/energy/" },
        { name: "cube-workbench-app", entry: "https://env/workbench/" },
      ],
      ["hazardGovernance"],
    );
    expect(kept.map((app) => app.name)).toEqual(["energy-consumption-migrate"]);
  });

  test("recognizes cube and app legacy aliases of a local domain", () => {
    const kept = filterLocallyOverriddenQiankunApps(
      [
        { name: "cube-daily-inspection-app", entry: "https://env/inspection/" },
        { name: "still-legacy", entry: "https://env/legacy/" },
      ],
      ["dailyInspection"],
    );
    expect(kept.map((app) => app.name)).toEqual(["still-legacy"]);
  });

  test("does not infer a match from an unrelated normalized-looking application name", () => {
    const kept = filterLocallyOverriddenQiankunApps(
      [
        { name: "cube-hazard-governance-preview-app", entry: "https://env/preview/" },
        { name: "hazard-governance", entry: "https://env/hazard/" },
      ],
      ["hazardGovernance"],
    );
    expect(kept.map((app) => app.name)).toEqual(["cube-hazard-governance-preview-app"]);
  });
});
