import { describe, expect, test } from "bun:test";

import { mergeLocalOverride } from "./merge-local-override";
import type { SourceProfileParsed } from "./validate-source-profile";

describe("mergeLocalOverride", () => {
  test("按 name 覆盖 platform 条目的 logicalName", () => {
    const source = {
      facade: "pc" as const,
      env: "demo",
      platform: [{ name: "pcAuth", logicalName: "pcAuth" }],
      inline: [],
      remotes: [],
    } as unknown as SourceProfileParsed;
    const merged = mergeLocalOverride(source, { platform: [{ name: "pcAuth", entry: "http://localhost:9999/mf-manifest.json" }] });
    expect((merged.platform[0] as unknown as { entry?: string }).entry).toBe("http://localhost:9999/mf-manifest.json");
  });

  test("覆盖层里没有对应 name 的条目时，源 Profile 条目原样保留", () => {
    const source = {
      facade: "pc" as const,
      env: "demo",
      platform: [{ name: "pcAuth", logicalName: "pcAuth" }],
      inline: [],
      remotes: [],
    } as unknown as SourceProfileParsed;
    const merged = mergeLocalOverride(source, { platform: [] });
    expect(merged.platform[0]).toMatchObject({ name: "pcAuth", logicalName: "pcAuth" });
  });
});
