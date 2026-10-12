import { expect, test } from "bun:test";
import { createUserCenterClient } from "./client";

test("用户中心接口保持旧服务路径和查询参数", async () => {
  const urls: string[] = [];
  const client = createUserCenterClient({
    get: async (url) => { urls.push("GET " + url); return url.includes("detail") ? { id: 7 } : { records: [], total: 0 }; },
    delete: async (url) => { urls.push("DELETE " + url); },
  });
  await client.pageReaders({ pageNumber: 2, pageSize: 10, mobile: "123" });
  await client.getReader(7);
  await client.pageGroups({ pageNumber: 1, pageSize: 10, keyword: "甲" });
  await client.deleteGroup("8");
  await client.pageUsers({ pageNumber: 1, pageSize: 10, createTime: "2026-09-01,2026-09-29" });
  await client.deleteUser("9");
  expect(urls).toEqual([
    "GET /api/ouaa/user-under-tenant/register-user/list?pageNumber=2&pageSize=10&mobile=123",
    "GET /api/ouaa/user-under-tenant/register-user/detail?id=7",
    "GET /api/disinfection/bus/member/group/page?pageNumber=1&pageSize=10&keyword=%E7%94%B2",
    "DELETE /api/disinfection/bus/member/group/remove?id=8",
    "GET /api/disinfection/bus/member/user/page?pageNumber=1&pageSize=10&createTime=2026-09-01%2C2026-09-29",
    "DELETE /api/disinfection/bus/member/user/remove?id=9",
  ]);
});
