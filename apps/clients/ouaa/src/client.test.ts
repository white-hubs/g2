import { createFakePlatformContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { create, createOuaaClient } from "./client";

describe("createOuaaClient", () => {
  test("department tree uses the BFF and preserves the enabled=false filter", async () => {
    const urls: string[] = [];
    const data = [{ id: "1", name: "部门", children: [{ id: "2", name: "子部门" }] }];
    const client = createOuaaClient({
      get: async (url) => {
        urls.push(url);
        return { data };
      },
      post: async () => undefined,
      put: async () => undefined,
    });
    expect(await client.getDepartments({ enabled: false })).toEqual(data);
    expect(urls).toEqual(["/gw-bff/ouaa/departments?enabled=false"]);
    const malformed = createOuaaClient({
      get: async () => ({ message: "not a list" }),
      post: async () => undefined,
      put: async () => undefined,
    });
    await expect(malformed.getDepartments()).rejects.toThrow("部门树响应格式错误");
  });
  test("getUserPermissions 打到固定路径", async () => {
    const urls: string[] = [];
    const client = createOuaaClient({
      get: async (url) => {
        urls.push(url);
        return [];
      },
      post: async () => undefined,
      put: async () => undefined,
    });
    await client.getUserPermissions();
    expect(urls).toEqual(["/api/ouaa/user-permissions"]);
  });

  test("getRoles 打到 cube-services /gw-bff", async () => {
    const urls: string[] = [];
    const client = createOuaaClient({
      get: async (url) => {
        urls.push(url);
        return [];
      },
      post: async () => undefined,
      put: async () => undefined,
    });
    await client.getRoles();
    expect(urls).toEqual(["/gw-bff/ouaa/roles"]);
  });

  test("listPositions 对齐 ghcloud 的认证职位接口", async () => {
    const urls: string[] = [];
    const client = createOuaaClient({
      get: async (url) => {
        urls.push(url);
        return [];
      },
      post: async () => undefined,
      put: async () => undefined,
    });
    await client.listPositions({ pageNumber: 1, pageSize: 100 });
    expect(urls[0]).toContain("/api/ouaa/authenticated/position/list");
  });

  test("listTenantUsers 对齐 ghcloud 的租户人员分页接口", async () => {
    const urls: string[] = [];
    const client = createOuaaClient({
      get: async (url) => {
        urls.push(url);
        return [];
      },
      post: async () => undefined,
      put: async () => undefined,
    });
    await client.listTenantUsers({ pageNumber: 1, pageSize: 10, keyword: "" });
    expect(urls[0]).toContain("/api/ouaa/authenticated/user-under-tenant/page");
    expect(urls[0]).toContain("enabled=true");
    expect(urls[0]).toContain("cascaderIds=");
    expect(urls[0]).toContain("anyMatchedAreaId=");
  });

  test("流引擎按旧版人员范围选择接口查询", async () => {
    const calls: Array<[string, unknown?]> = [];
    const client = createOuaaClient({
      get: async (url) => {
        calls.push([url]);
        return { records: [] };
      },
      post: async (url, body) => {
        calls.push([url, body]);
        return { records: [] };
      },
      put: async () => undefined,
    });
    await client.listFlowUsers({ pageNumber: 1, pageSize: 10 });
    await client.listFlowUsersByIds({ ids: ["u1"], pageNumber: 1 });
    await client.listFlowUsersByRoleIds({ ids: ["r1"], pageNumber: 1 });
    await client.listFlowDepartments({ name: "总办" });
    await client.listFlowDepartmentOptions({ enabled: true });
    expect(calls).toEqual([
      ["/api/ouaa/user-under-tenant/page?pageNumber=1&pageSize=10"],
      ["/api/ouaa/authenticated/user-under-tenant/page", { ids: ["u1"], pageNumber: 1 }],
      ["/api/ouaa/authenticated/role/user/page", { ids: ["r1"], pageNumber: 1 }],
      ["/api/ouaa/organizations?name=%E6%80%BB%E5%8A%9E"],
      ["/api/ouaa/authenticated/organizations/list?enabled=true"],
    ]);
  });

  test("getApplicationGroupMenus 正确编码 id", async () => {
    const urls: string[] = [];
    const client = createOuaaClient({
      get: async (url) => {
        urls.push(url);
        return [];
      },
      post: async () => undefined,
      put: async () => undefined,
    });
    await client.getApplicationGroupMenus("g ops");
    expect(urls).toEqual(["/api/ouaa/context/application/group/menus?id=g%20ops"]);
  });
});

describe("create(ctx)", () => {
  test("经 loadPlatform 后可 getUserProfile", async () => {
    const urls: string[] = [];
    const ctx = createFakePlatformContext({
      loadPlatform: async () => ({
        createHttpClientForPlatform: () => ({
          get: async (url: string) => {
            urls.push(url);
            return { name: "n" };
          },
          post: async () => undefined,
          put: async () => undefined,
        }),
      }),
    });
    const client = await create(ctx);
    await client.getUserProfile();
    expect(urls).toEqual(["/api/ouaa/context/user"]);
  });
});
