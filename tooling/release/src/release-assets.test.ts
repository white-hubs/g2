import { describe, expect, test } from "bun:test";

import { isReleasePublishExcluded, sanitizeReleaseFileBody } from "./release-assets";

describe("isReleasePublishExcluded", () => {
  test("excludes MF type artifacts and dev-server trees", () => {
    expect(isReleasePublishExcluded("@mf-types.zip")).toBe(true);
    expect(isReleasePublishExcluded("@mf-types.d.ts")).toBe(true);
    expect(isReleasePublishExcluded("@mf-types/compiled-types/src/x.d.ts")).toBe(true);
    expect(isReleasePublishExcluded(".dev-server.zip")).toBe(true);
    expect(isReleasePublishExcluded(".dev-server/compiled-types/a.d.ts")).toBe(true);
  });

  test("keeps runtime assets", () => {
    expect(isReleasePublishExcluded("mf-manifest.json")).toBe(false);
    expect(isReleasePublishExcluded("remoteEntry.js")).toBe(false);
    expect(isReleasePublishExcluded("assets/platform-abc.js")).toBe(false);
  });

  test("excludes host-emitted CDN-isomorphic _mf/ tree (uploaded at bucket root)", () => {
    expect(isReleasePublishExcluded("_mf/runtime/2.8.0/mf-runtime.js")).toBe(true);
    expect(isReleasePublishExcluded("_mf")).toBe(true);
  });
});

describe("sanitizeReleaseFileBody", () => {
  test("strips metaData.types from mf-manifest.json", () => {
    const input = {
      id: "httpPlatform",
      metaData: {
        name: "httpPlatform",
        types: { zip: "@mf-types.zip", api: "@mf-types.d.ts" },
        publicPath: "auto",
      },
    };
    const out = sanitizeReleaseFileBody("mf-manifest.json", new TextEncoder().encode(JSON.stringify(input)));
    const parsed = JSON.parse(new TextDecoder().decode(out)) as typeof input;
    expect(parsed.metaData.types).toBeUndefined();
    expect(parsed.metaData.publicPath).toBe("auto");
  });

  test("leaves non-manifest files unchanged", () => {
    const body = new TextEncoder().encode("not-json");
    expect(sanitizeReleaseFileBody("remoteEntry.js", body)).toEqual(body);
  });
});
