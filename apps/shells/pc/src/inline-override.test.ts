import { describe, expect, test } from "bun:test";

import { checkForNewerVersion } from "./inline-override";

describe("checkForNewerVersion", () => {
  test("轮询到的 buildVersion 与已渲染版本不同时返回 true", async () => {
    const hasNewer = await checkForNewerVersion({
      renderedVersion: "v1",
      fetchManifest: async () => ({ metaData: { buildInfo: { buildVersion: "v2" } } }),
    });
    expect(hasNewer).toBe(true);
  });

  test("版本相同时返回 false", async () => {
    const hasNewer = await checkForNewerVersion({
      renderedVersion: "v1",
      fetchManifest: async () => ({ metaData: { buildInfo: { buildVersion: "v1" } } }),
    });
    expect(hasNewer).toBe(false);
  });

  test("轮询失败时静默返回 false，不抛错（维持已渲染的内置版本）", async () => {
    const hasNewer = await checkForNewerVersion({
      renderedVersion: "v1",
      fetchManifest: async () => {
        throw new Error("network error");
      },
    });
    expect(hasNewer).toBe(false);
  });
});
