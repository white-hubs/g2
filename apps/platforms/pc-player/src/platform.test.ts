import { describe, expect, test } from "bun:test";

import { getCubePlayerAuthHeaders, initCubePlayerAuth, loadPlayerSDK } from "./player-api";

describe("pc-player platform", () => {
  test("exposes auth/sdk init without throw", async () => {
    expect(() => initCubePlayerAuth({})).not.toThrow();
    await expect(loadPlayerSDK()).resolves.toBeUndefined();
  });

  test("adds the shell auth triplet to video requests", () => {
    initCubePlayerAuth({ token: "token-1", tenant: "tenant-1" });
    expect(getCubePlayerAuthHeaders()).toEqual({
      Authorization: "Bearer token-1",
      tenant: "tenant-1",
      terminal: "bimops-manage-web",
    });
  });

  test("reads fresh auth values from a provider", () => {
    let token = "token-1";
    initCubePlayerAuth(() => ({ token, tenant: "tenant-1", terminal: "pc" }));
    token = "token-2";
    expect(getCubePlayerAuthHeaders().Authorization).toBe("Bearer token-2");
  });
});
