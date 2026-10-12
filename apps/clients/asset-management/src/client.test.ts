import type { ListResource } from "@g2-contract/asset-management";
import { describe, expect, test } from "bun:test";

import { type HttpClient, assetPage, assetUrl, createAssetClient, unwrap } from "./client";
function fixture(response?: unknown) {
  const result = response === undefined ? { code: 0, data: { records: [], total: 0 } } : response;
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const invoke = async (method: string, url: string, body?: unknown) => {
    calls.push({ method, url, body });
    return result;
  };
  const http: HttpClient = {
    get: (url) => invoke("GET", url),
    post: (url, body) => invoke("POST", url, body),
    put: (url, body) => invoke("PUT", url, body),
    delete: (url) => invoke("DELETE", url),
  };
  return { client: createAssetClient(http), calls };
}
describe("asset-management legacy API contract", () => {
  test("部门领用明细保留空部门参数，并按旧接口传递日期时间区间", async () => {
    const { client, calls } = fixture();
    const period = "2026-10-08 00:00:00,2026-10-08 23:59:59";
    await client.page("departmentUse", { dimension: "TODAY", period, pageNumber: 1, pageSize: 10 });
    let url = new URL(calls.at(-1)!.url, "http://test");
    expect(url.searchParams.get("period")).toBe(period);
    expect(url.searchParams.has("deptId")).toBe(true);
    expect(url.searchParams.get("deptId")).toBe("");
    await client.page("departmentUse", { dimension: "TODAY", period, deptId: "d1", pageNumber: 1, pageSize: 10 });
    url = new URL(calls.at(-1)!.url, "http://test");
    expect(url.searchParams.get("deptId")).toBe("d1");
  });
  test("unconfigured message scenes expose no channels instead of throwing", async () => {
    const { client } = fixture({ data: null });
    expect(await client.messageMethods("INVENTORY_TASK")).toEqual([]);
  });
  test("query encoder preserves IDs ranges boolean false and zero but omits empty fields", () => {
    const url = new URL(
      assetUrl("/property/page", { id: "a/b", range: ["a", "b"], flag: false, zero: 0, empty: "", nil: null }),
      "http://test",
    );
    expect(url.pathname).toBe("/api/property/page");
    expect(url.searchParams.get("range")).toBe("a,b");
    expect(url.searchParams.get("flag")).toBe("false");
    expect(url.searchParams.get("zero")).toBe("0");
    expect(url.searchParams.has("nil")).toBe(false);
  });
  test("page unwrapping retains envelope and raw page totals and surfaces business errors", () => {
    expect(assetPage({ code: 200, data: { records: [{ id: "1" }], total: 180 } })).toEqual({ records: [{ id: "1" }], total: 180 });
    expect(assetPage({ records: [], total: 20 })).toEqual({ records: [], total: 20 });
    expect(() => unwrap({ code: 500, data: null, message: "错误" })).toThrow("错误");
    expect(() => assetPage({ data: [] })).toThrow();
  });
  test("all table endpoints retain their distinct service path", async () => {
    const { client, calls } = fixture();
    const entries: [ListResource, string][] = [
      ["warehousing", "property/depository/getDepositoryDetailedPage"],
      ["inventory", "property/detailed/getPropertyDetailedPage-permission"],
      ["distribution", "property/allot/getAllotPage"],
      ["allocation", "property/allot/getAllotPage"],
      ["cleaning", "property/weedOut/getPropertyWeedOutPage"],
      ["assetCheck", "property/check/plan/getPropertyCheckPlanPage"],
      ["stock", "consumable-store-stock/page"],
      ["entering", "consumable-add-record/page"],
      ["consuming", "consumable-reduce-record/page"],
      ["consumableCheck", "consumable-check/page"],
      ["history", "property/history/getPropertyHistoryList"],
      ["maintenance", "property/detailed/getOveragePage"],
      ["overage", "property/detailed/getOveragePage"],
      ["inout", "consumable-stock-detail/record/page"],
      ["departmentUse", "consumable-reduce-record/detail"],
    ];
    for (const [resource, path] of entries) {
      await client.page(resource, { pageNumber: 2, pageSize: 20 });
      expect(new URL(calls.at(-1)!.url, "http://test").pathname).toBe(`/api/property/${path}`);
    }
    expect(new URL(calls[2].url, "http://test").searchParams.get("type")).toBe("ALLOT_PERSONAL");
    expect(new URL(calls[3].url, "http://test").searchParams.get("type")).toBe("ALLOT_UNIT");
    expect(new URL(calls[11].url, "http://test").searchParams.get("queryType")).toBe("maintenance");
    expect(new URL(calls[12].url, "http://test").searchParams.get("queryType")).toBe("usage");
  });
  test("tree and department summary are not parsed as regular pages", async () => {
    const tree = [{ id: "1", children: [{ id: "2" }] }];
    expect(await fixture({ code: 0, data: tree }).client.administrators({ name: "部门" })).toEqual(tree);
    const summary = { depAll: [{ depId: "d1", depName: "部门", totalNumber: 3, totalPrice: 12 }], totalNumber: 3, totalPrice: 12 };
    expect(await fixture({ code: 0, data: summary }).client.departmentSummary({})).toEqual(summary);
  });
  test("save and delete methods keep original paths and payload IDs", async () => {
    const { client, calls } = fixture(null);
    await client.save("assetType", { name: "设备", parentId: "p" });
    await client.save("assetSource", { name: "购买" }, "s1");
    await client.save("warehouse", { name: "仓库", code: "c" }, "w1");
    await client.remove("abnormalType", "a1");
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      "POST /api/property/classify/insert",
      "PUT /api/property/classify/update",
      "PUT /api/property/storehouse/w1",
      "DELETE /api/dictionary/deleteDataDictionary/a1",
    ]);
    expect(calls[1].body).toEqual({ id: "s1", name: "购买", type: "assetSource" });
  });
  test("code validation uses a batch body rather than an invented endpoint", async () => {
    const { client, calls } = fixture({ data: ["asset-01"] });
    expect(await client.checkAssetCodes("a1", "asset-01")).toEqual(["asset-01"]);
    expect(calls[0]).toEqual({
      method: "POST",
      url: "/api/property/property/detailed/checkCodeBath",
      body: { checkSerialNumberList: [{ key: "a1", value: "asset-01" }] },
    });
  });
  test("check submission and optional stock sync preserve exact order", async () => {
    const { client, calls } = fixture(true);
    await client.submitAssetCheck("p1");
    await client.syncAssetCheck("p1");
    await client.hasConsumableCheckDifference("c1");
    await client.submitConsumableCheck("c1", true);
    expect(calls.map((call) => call.url)).toEqual([
      "/api/property/property/check/plan/submit?planId=p1",
      "/api/property/property/check/plan/submitWin?planId=p1",
      "/api/property/consumable-check/submitWin/c1?planId=c1",
      "/api/property/consumable-check/c1/submit",
      "/api/property/consumable-check/addWin/c1",
    ]);
  });
  test("export and QR return real binary blobs and selected IDs", async () => {
    const blob = new Blob(["excel"]);
    const { client, calls } = fixture(blob);
    expect(await client.export("distribution", { ids: "1,2" })).toBe(blob);
    expect(calls[0]).toEqual({
      method: "POST",
      url: "/api/property/property/allot/getExcel",
      body: { ids: "1,2", type: "ALLOT_PERSONAL" },
    });
    await client.qrcodes([{ entityId: "1", entityName: "资产", serialNumber: "asset-1" }]);
    expect(calls[1].body).toMatchObject({ entityType: "PROPERTY", styleId: "1727209257265602562" });
    await expect(fixture({ data: {} }).client.template("asset")).rejects.toThrow("文件流");
  });
  test("imports use multipart and the correct asset/consumable/stock routes", async () => {
    const { client, calls } = fixture(null);
    for (const kind of ["asset", "consumable", "stock"] as const) {
      await client.import(kind, new File(["fixture"], "template.xlsx"));
    }
    expect(calls.map((call) => call.url)).toEqual([
      "/api/property/property/detailed/import/template",
      "/api/property/consumable/import",
      "/api/property/consumable-store-stock/import",
    ]);
    expect(calls.every((call) => call.body instanceof FormData)).toBe(true);
  });
});
