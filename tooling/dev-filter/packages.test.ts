import * as BunTest from "bun:test";

import { CHROME_BOOTSTRAP_PACKAGES, type SourceProfileLike, collectProfilePackages, selectPackages, toTurboFilters } from "./packages";

const { describe, expect, test } = BunTest;

const sampleProfile: SourceProfileLike = {
  platform: [{ logicalName: "pcChrome" }, { logicalName: "pcAuth" }, { logicalName: "pcMessaging" }],
  client: [{ logicalName: "authClient" }],
  pageLibrary: [],
  inline: [],
  remotes: [{ logicalName: "hazardGovernance" }],
};

describe("dev-filter package selection", () => {
  test("collects asset-management Domain and Client", () => {
    const packages = collectProfilePackages({
      ...sampleProfile,
      client: [{ logicalName: "assetManagementClient" }],
      remotes: [{ logicalName: "assetManagement" }],
    });
    expect(packages).toContain("@g2-domain/asset-management");
    expect(packages).toContain("@g2-client/asset-management");
  });
  test("collects meeting-room Domain and Client", () => {
    const packages = collectProfilePackages({
      ...sampleProfile,
      client: [...(sampleProfile.client ?? []), { logicalName: "meetRoomClient" }],
      remotes: [...sampleProfile.remotes, { logicalName: "meetRoom" }],
    });
    expect(packages).toContain("@g2-domain/meet-room");
    expect(packages).toContain("@g2-client/meet-room");
  });
  test("collects government-management Domain and Client", () => {
    const packages = collectProfilePackages({
      ...sampleProfile,
      client: [...(sampleProfile.client ?? []), { logicalName: "governmentManagementClient" }],
      remotes: [...sampleProfile.remotes, { logicalName: "governmentManagement" }],
    });
    expect(packages).toContain("@g2-domain/government-management");
    expect(packages).toContain("@g2-client/government-management");
  });

  test("collects consumption-management Domain and Client", () => {
    const packages = collectProfilePackages({
      ...sampleProfile,
      client: [...(sampleProfile.client ?? []), { logicalName: "consumptionManagementClient" }],
      remotes: [...sampleProfile.remotes, { logicalName: "consumptionManagement" }],
    });
    expect(packages).toContain("@g2-domain/consumption-management");
    expect(packages).toContain("@g2-client/consumption-management");
  });

  test("collects the person-management domain and client from a composition", () => {
    const packages = collectProfilePackages({
      ...sampleProfile,
      client: [...(sampleProfile.client ?? []), { logicalName: "personManagementClient" }],
      remotes: [...sampleProfile.remotes, { logicalName: "personManagement" }],
    });
    expect(packages).toContain("@g2-domain/person-management");
    expect(packages).toContain("@g2-client/person-management");
  });

  test("collects the factory-management domain and client from a composition", () => {
    const packages = collectProfilePackages({
      ...sampleProfile,
      client: [...(sampleProfile.client ?? []), { logicalName: "factoryManagementClient" }],
      remotes: [...sampleProfile.remotes, { logicalName: "factoryManagement" }],
    });
    expect(packages).toContain("@g2-domain/factory-management");
    expect(packages).toContain("@g2-client/factory-management");
  });

  test("collects the knowledge-document domain and client from a composition", () => {
    const packages = collectProfilePackages({
      ...sampleProfile,
      client: [...(sampleProfile.client ?? []), { logicalName: "knowledgeDocumentClient" }],
      remotes: [...sampleProfile.remotes, { logicalName: "knowledgeDocument" }],
    });
    expect(packages).toContain("@g2-domain/knowledge-document");
    expect(packages).toContain("@g2-client/knowledge-document");
  });

  test("collects the technical-bulletin domain and client from a composition", () => {
    const packages = collectProfilePackages({
      ...sampleProfile,
      client: [...(sampleProfile.client ?? []), { logicalName: "technicalBulletinClient" }],
      remotes: [...sampleProfile.remotes, { logicalName: "technicalBulletin" }],
    });
    expect(packages).toContain("@g2-domain/technical-bulletin");
    expect(packages).toContain("@g2-client/technical-bulletin");
  });

  test("chrome mode only keeps shell + chrome bootstrap packages", () => {
    const all = collectProfilePackages(sampleProfile);
    const chrome = selectPackages(all, "chrome");
    expect(chrome).toContain("@g2-shell/pc");
    expect(chrome).toContain("@g2-platform/pc-chrome");
    expect(chrome).toContain("@g2-platform/pc-auth");
    expect(chrome).toContain("@g2-client/auth");
    expect(chrome).not.toContain("@g2-domain/hazard-governance");
    expect(chrome).not.toContain("@g2-platform/pc-messaging");
    expect(chrome.every((name) => (CHROME_BOOTSTRAP_PACKAGES as readonly string[]).includes(name))).toBe(true);
  });

  test("rest mode excludes chrome bootstrap packages", () => {
    const all = collectProfilePackages(sampleProfile);
    const rest = selectPackages(all, "rest");
    expect(rest).toContain("@g2-domain/hazard-governance");
    expect(rest).toContain("@g2-platform/pc-messaging");
    expect(rest).not.toContain("@g2-client/auth");
    expect(rest).not.toContain("@g2-shell/pc");
    expect(rest).not.toContain("@g2-platform/pc-chrome");
  });

  test("toTurboFilters formats --filter list", () => {
    expect(toTurboFilters(["@g2-shell/pc", "@g2-platform/pc-chrome"])).toBe("--filter=@g2-shell/pc --filter=@g2-platform/pc-chrome");
  });

  test("collects the warehouse-safety domain and client from a composition", () => {
    const packages = collectProfilePackages({
      ...sampleProfile,
      client: [...(sampleProfile.client ?? []), { logicalName: "warehouseSafetyClient" }],
      remotes: [...sampleProfile.remotes, { logicalName: "warehouseSafety" }],
    });
    expect(packages).toContain("@g2-domain/warehouse-safety");
    expect(packages).toContain("@g2-client/warehouse-safety");
  });

  test("collects the emergency-supplies domain and client from a composition", () => {
    const packages = collectProfilePackages({
      ...sampleProfile,
      client: [...(sampleProfile.client ?? []), { logicalName: "emergencySuppliesClient" }],
      remotes: [...sampleProfile.remotes, { logicalName: "emergencySupplies" }],
    });
    expect(packages).toContain("@g2-domain/emergency-supplies");
    expect(packages).toContain("@g2-client/emergency-supplies");
  });

  test("collects the form-audit domain and client from a composition", () => {
    const packages = collectProfilePackages({
      ...sampleProfile,
      client: [...(sampleProfile.client ?? []), { logicalName: "formAuditClient" }],
      remotes: [...sampleProfile.remotes, { logicalName: "formAudit" }],
    });
    expect(packages).toContain("@g2-domain/form-audit");
    expect(packages).toContain("@g2-client/form-audit");
  });

  test("collects the work-order-center domain and client from a composition", () => {
    const packages = collectProfilePackages({
      ...sampleProfile,
      client: [...(sampleProfile.client ?? []), { logicalName: "workOrderCenterClient" }],
      remotes: [...sampleProfile.remotes, { logicalName: "workOrderCenter" }],
    });
    expect(packages).toContain("@g2-domain/work-order-center");
    expect(packages).toContain("@g2-client/work-order-center");
  });

  test("collects the electronic-patrol domain and client from a composition", () => {
    const packages = collectProfilePackages({
      ...sampleProfile,
      client: [...(sampleProfile.client ?? []), { logicalName: "electronicPatrolClient" }],
      remotes: [...sampleProfile.remotes, { logicalName: "electronicPatrol" }],
    });
    expect(packages).toContain("@g2-domain/electronic-patrol");
    expect(packages).toContain("@g2-client/electronic-patrol");
  });

  test("collects the small-engineering domain and client from a composition", () => {
    const packages = collectProfilePackages({
      ...sampleProfile,
      client: [...(sampleProfile.client ?? []), { logicalName: "smallEngineeringClient" }],
      remotes: [...sampleProfile.remotes, { logicalName: "smallEngineering" }],
    });
    expect(packages).toContain("@g2-domain/small-engineering");
    expect(packages).toContain("@g2-client/small-engineering");
  });
});
