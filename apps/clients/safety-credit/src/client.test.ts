import { expect, test } from "bun:test";

import { createSafetyCreditClient } from "./client";

test("无 data 包装的业务失败不能被当作保存成功", async () => {
  const f = fixture({ success: false, message: "测试业务错误" });
  await expect(createSafetyCreditClient(f.http).getMerchant("1")).rejects.toThrow("测试业务错误");
});
interface Call {
  method: string;
  url: string;
  body?: unknown;
}
function fixture(response: unknown = { data: { records: [], total: 0, pages: 0 } }) {
  const calls: Call[] = [];
  return {
    calls,
    http: {
      get: async (url: string) => {
        calls.push({ method: "GET", url });
        return response;
      },
      post: async (url: string, body?: unknown) => {
        calls.push({ method: "POST", url, body });
        return response;
      },
      put: async (url: string, body?: unknown) => {
        calls.push({ method: "PUT", url, body });
        return response;
      },
      delete: async (url: string) => {
        calls.push({ method: "DELETE", url });
        return response;
      },
    },
  };
}

test("商户分页使用真实 API 并解包返回值", async () => {
  const f = fixture();
  const result = await createSafetyCreditClient(f.http).pageMerchants({ pageNumber: 2, pageSize: 20, keyword: "商户" });
  expect(f.calls[0]?.url).toBe("/api/safety-credit/merchants/page?pageNumber=2&pageSize=20&keyword=%E5%95%86%E6%88%B7");
  expect(result.records).toEqual([]);
});
test("不同业务分页不进入未实现 BFF", async () => {
  const f = fixture();
  const c = createSafetyCreditClient(f.http),
    q = { pageNumber: 1, pageSize: 10 };
  await c.pageDataSources(q);
  await c.pageScoreModels(q);
  await c.pageBehaviors(q);
  await c.pageArchives(q);
  await c.pageChecklists(q);
  await c.pageBenefitRules(q);
  expect(f.calls.every((call) => call.url.startsWith("/api/safety-credit/"))).toBe(true);
});
test("导入必须使用 multipart，模板返回 Blob", async () => {
  const blob = new Blob(["xlsx"]);
  const f = fixture(blob),
    c = createSafetyCreditClient(f.http);
  expect(await c.downloadMerchantImportTemplate()).toBe(blob);
  await c.importMerchants(blob);
  expect(f.calls[1]?.url).toBe("/api/safety-credit/merchants/import");
  expect(f.calls[1]?.body).toBeInstanceOf(FormData);
});
test("审核保留 POST 方法和拒绝原因", async () => {
  const f = fixture(),
    c = createSafetyCreditClient(f.http);
  await c.rejectBehavior("1", { rejectReason: "说明" });
  expect(f.calls[0]).toEqual({ method: "POST", url: "/api/safety-credit/behaviors/1/reject", body: { rejectReason: "说明" } });
});
