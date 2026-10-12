import { describe, expect, test } from "bun:test";

import { joinReleaseKey } from "./paths";

describe("joinReleaseKey", () => {
  test("joins logical segments with forward slashes", () => {
    expect(joinReleaseKey("pcAuth", "20260722.abc", "mf-manifest.json")).toBe("pcAuth/20260722.abc/mf-manifest.json");
  });

  test("strips leading and trailing slashes on parts", () => {
    expect(joinReleaseKey("/pcShell/", "/20260722.local/", "index.html")).toBe("pcShell/20260722.local/index.html");
  });
});
