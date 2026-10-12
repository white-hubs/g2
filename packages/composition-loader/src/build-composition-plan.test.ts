import type { CompositionProfile } from "@g2-composition/schema";
import { describe, expect, test } from "bun:test";

import { buildCompositionPlan } from "./build-composition-plan";

describe("buildCompositionPlan", () => {
  test("maps profile entries into a load plan without reading shell source", () => {
    const profile: CompositionProfile = {
      facade: "pc",
      env: "demo",
      platform: [{ name: "httpPlatform", entry: "http://localhost:5015/mf-manifest.json" }],
      client: [{ name: "messageClient", entry: "http://localhost:5020/mf-manifest.json" }],
      pageLibrary: [{ name: "gemPages", entry: "http://localhost:5051/mf-manifest.json" }],
      inline: [
        {
          name: "poc-inline-pc",
          package: "@g2-domain/poc-inline-pc",
          basePath: "/poc-inline",
          allowOverride: false,
        },
      ],
      remotes: [
        {
          name: "pocRemotePc",
          entry: "http://localhost:5002/mf-manifest.json",
          basePath: "/poc-remote",
        },
      ],
    };

    const plan = buildCompositionPlan(profile);
    expect(plan.facade).toBe("pc");
    expect(plan.platforms[0]).toEqual({
      name: "httpPlatform",
      kind: "entry",
      entry: "http://localhost:5015/mf-manifest.json",
    });
    expect(plan.clients[0]).toEqual({
      name: "messageClient",
      kind: "entry",
      entry: "http://localhost:5020/mf-manifest.json",
    });
    expect(plan.pageLibraries[0]).toEqual({
      name: "gemPages",
      kind: "entry",
      entry: "http://localhost:5051/mf-manifest.json",
    });
    expect(plan.inline[0]).toEqual({
      name: "poc-inline-pc",
      kind: "package",
      package: "@g2-domain/poc-inline-pc",
      basePath: "/poc-inline",
    });
    expect(plan.remotes[0]).toEqual({
      name: "pocRemotePc",
      kind: "entry",
      entry: "http://localhost:5002/mf-manifest.json",
      basePath: "/poc-remote",
    });
  });

  test("adding a remote only changes remotes in the plan", () => {
    const profile: CompositionProfile = {
      facade: "pc",
      env: "demo",
      platform: [],
      client: [],
      pageLibrary: [],
      inline: [],
      remotes: [
        { name: "a", entry: "http://localhost:1/mf-manifest.json", basePath: "/a" },
        { name: "b", entry: "http://localhost:2/mf-manifest.json", basePath: "/b" },
      ],
    };
    const plan = buildCompositionPlan(profile);
    expect(plan.remotes.map((r) => r.name)).toEqual(["a", "b"]);
    expect(plan.inline).toEqual([]);
    expect(plan.pageLibraries).toEqual([]);
  });
});
