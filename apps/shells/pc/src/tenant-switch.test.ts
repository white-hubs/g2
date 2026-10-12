import { describe, expect, test } from "bun:test";

import { TenantSwitchError, switchTenantWithRefreshToken } from "./tenant-switch";

describe("switchTenantWithRefreshToken", () => {
  test("同 code / 禁用 / 外链站点直接返回语义标记", async () => {
    expect(
      await switchTenantWithRefreshToken(
        {
          nextTenantCode: "a",
          currentTenantCode: "a",
          refreshToken: "r",
          enabled: true,
        },
        { postRefresh: async () => ({}) },
      ),
    ).toBe("same");
    expect(
      await switchTenantWithRefreshToken(
        {
          nextTenantCode: "b",
          currentTenantCode: "a",
          refreshToken: "r",
          enabled: false,
        },
        { postRefresh: async () => ({}) },
      ),
    ).toBe("disabled");
    expect(
      await switchTenantWithRefreshToken(
        {
          nextTenantCode: "b",
          currentTenantCode: "a",
          refreshToken: "r",
          enabled: true,
          webSiteUrl: "https://sub.test",
        },
        { postRefresh: async () => ({}) },
      ),
    ).toBe("external");
  });

  test("以目标租户调用 refresh，返回新 token", async () => {
    const calls: { body: unknown; tenant: string }[] = [];
    const result = await switchTenantWithRefreshToken(
      {
        nextTenantCode: "hq",
        currentTenantCode: "old",
        refreshToken: "rt-1",
        enabled: true,
      },
      {
        postRefresh: async (body, tenant) => {
          calls.push({ body, tenant });
          return { access_token: "tok-2", refresh_token: "rt-2" };
        },
      },
    );
    expect(calls).toEqual([{ body: { grant_type: "refresh_token", refresh_token: "rt-1" }, tenant: "hq" }]);
    expect(result).toEqual({ token: "tok-2", refreshToken: "rt-2", tenant: "hq" });
  });

  test("无 refresh_token 时抛错", async () => {
    await expect(
      switchTenantWithRefreshToken(
        {
          nextTenantCode: "hq",
          currentTenantCode: "old",
          refreshToken: "",
          enabled: true,
        },
        { postRefresh: async () => ({ access_token: "x" }) },
      ),
    ).rejects.toBeInstanceOf(TenantSwitchError);
  });
});
