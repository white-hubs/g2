import { describe, expect, test } from "bun:test";

import { loadReleaseSet } from "./load-release-set";
import { findRepoRoot } from "./repo-root";

describe("loadReleaseSet", () => {
  test("parses deploy/release-sets/prod.yaml", () => {
    const repoRoot = findRepoRoot();
    const set = loadReleaseSet("prod", repoRoot);

    expect(set.name).toBe("prod");
    expect(set.profilePath).toEndWith("deploy/compositions/prod.pc.yaml");
    expect(set.addressTemplatePath).toEndWith("deploy/address-templates/prod.yaml");
    expect(set.members.length).toBeGreaterThan(0);

    expect(set.members).toEqual(
      expect.arrayContaining([
        {
          logicalName: "pcAuth",
          package: "@g2-platform/pc-auth",
          entryFile: "mf-manifest.json",
        },
        {
          logicalName: "intruderAlarm",
          package: "@g2-domain/intruder-alarm",
          entryFile: "mf-manifest.json",
        },
        {
          logicalName: "gasManagement",
          package: "@g2-domain/gas-management",
          entryFile: "mf-manifest.json",
        },
      ]),
    );
  });
});
