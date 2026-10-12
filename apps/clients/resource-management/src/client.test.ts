import { expect, test } from "bun:test";
import { createResourceManagementClient } from "./client";

test("物品查询、导出及医院部门接口使用旧路径和选中租户", async () => {
  const calls: { url: string; tenant?: string }[] = [];
  const client = createResourceManagementClient({
    get: async (url, init) => {
      calls.push({ url, tenant: (init?.headers as { tenant?: string } | undefined)?.tenant });
      if (url.includes("detailPage")) return { records: [], total: 0 };
      if (url.includes("downloadItemDetail")) return new Blob(["x"]);
      if (url.includes("tenant/page")) return { records: [{ code: "t1", name: "医院" }] };
      return [];
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  });
  await client.pageItems({ pageNumber: 1, pageSize: 10, tenant: "t1", deptId: "d1" });
  await client.exportItems({ pageNumber: 1, pageSize: 10, tenant: "t1", deptId: "d1", tenantName: "医院" });
  await client.listTenants();
  await client.listDepartments("t1", true);
  expect(calls).toEqual([
    { url: "/api/medical-cleanliness/resources/item/detailPage?pageNumber=1&pageSize=10&tenant=t1&deptId=d1", tenant: "t1" },
    { url: "/api/medical-cleanliness/resources/item/downloadItemDetail?tenant=t1&tenantName=%E5%8C%BB%E9%99%A2&deptId=d1", tenant: "t1" },
    { url: "/api/ouaa/tenant/page?pageSize=1000&pageNumber=1&enabled=true", tenant: undefined },
    { url: "/api/ouaa/authenticated/organizations/list?enabled=true&tenant=t1", tenant: "t1" },
  ]);
});

test("未配置菜单的物品、机组和设备接口保留旧方法与参数", async () => {
  const calls: { method: string; url: string; body?: unknown; tenant?: string }[] = [];
  const capture = (method: string, url: string, body?: unknown, init?: RequestInit): unknown => {
    calls.push({ method, url, body, tenant: (init?.headers as { tenant?: string } | undefined)?.tenant });
    return url.includes("/page") ? { records: [], total: 0 } : {};
  };
  const client = createResourceManagementClient({
    get: async (url, init) => capture("GET", url, undefined, init),
    post: async (url, body, init) => capture("POST", url, body, init),
    put: async (url, body, init) => capture("PUT", url, body, init),
    delete: async (url, init) => capture("DELETE", url, init?.body, init),
  });
  await client.pageManagedItems({ tenant: "t1", deviceId: "d1", pageNumber: 2, pageSize: 10 });
  await client.saveManagedItem({ id: "", tenant: "t1", deviceId: "d1", deviceCode: "c1", deviceName: "手术室", name: "物品", size: "", number: "1", manufacturer: "", model: "" });
  await client.deleteManagedItem("i1");
  await client.pageMachines({ tenant: "t1", code: "m1", pageNumber: 1, pageSize: 10 });
  await client.deleteMachineRooms("t1", "m1", "d1");
  await client.pageDeviceLogs({ tenant: "t1", pageNumber: 1, pageSize: 10 }, "t1");
  expect(calls.map(({ method, url, tenant }) => ({ method, url, tenant }))).toEqual([
    { method: "GET", url: "/api/medical-cleanliness/resources/item/page?tenant=t1&deviceId=d1&pageNumber=2&pageSize=10", tenant: "t1" },
    { method: "POST", url: "/api/medical-cleanliness/resources/item/add", tenant: "t1" },
    { method: "DELETE", url: "/api/medical-cleanliness/resources/item/remove?id=i1", tenant: undefined },
    { method: "GET", url: "/api/medical-cleanliness/resources/machines/page?tenant=t1&code=m1&pageNumber=1&pageSize=10", tenant: "t1" },
    { method: "DELETE", url: "/api/medical-cleanliness/resources/machines/room/remove?tenant=t1&id=m1&roomIds=d1", tenant: "t1" },
    { method: "GET", url: "/api/device-center/device/instance/attribute/change/logByTenant/page?tenant=t1&pageNumber=1&pageSize=10", tenant: "t1" },
  ]);
  expect(calls[4]?.body).toBeUndefined();
});

test("关联手术室设备选择保留旧版筛选字段与租户请求头", async () => {
  const calls: { method: string; url: string; body?: unknown; tenant?: string }[] = [];
  const client = createResourceManagementClient({
    get: async (url, init) => {
      calls.push({ method: "GET", url, tenant: (init?.headers as { tenant?: string } | undefined)?.tenant });
      return [];
    },
    post: async (url, body, init) => {
      calls.push({ method: "POST", url, body, tenant: (init?.headers as { tenant?: string } | undefined)?.tenant });
      return { records: [], total: 0 };
    },
    put: async () => ({}),
    delete: async () => ({}),
  });
  await client.pageAvailableRooms({ tenant: "t1", pageNumber: 1, pageSize: 10, keyword: "手术室", productId: "p1", categoryCode: "a-b",
    anyMatchedAreaId: "x-y", anyMatchedDepartmentId: "d1", tagCodes: ["s1"] });
  await client.listProducts("t1");
  await client.listCustomerTags("t1");
  await client.listDepartments("t1");
  expect(calls).toEqual([
    { method: "POST", url: "/api/device-center/device/instance/page", tenant: "t1", body: { pageNumber: 1, pageSize: 10,
      keyword: "手术室", productId: "p1", categoryCode: "a-b", anyMatchedAreaId: "x-y", anyMatchedDepartmentId: "d1", tagCodes: ["s1"],
      filterTagCodes: [], applicationCode: "RESOURCE_MANAGE" } },
    { method: "GET", url: "/api/device-center/things/product/list/all", tenant: "t1" },
    { method: "GET", url: "/api/device-center/tag/customer/list?status=1&tenant=t1", tenant: "t1" },
    { method: "GET", url: "/api/ouaa/authenticated/organizations/list?tenant=t1", tenant: "t1" },
  ]);
});

test("机组铭牌附件沿用洁净医疗场景并按旧配置选择正式或临时上传接口", async () => {
  const calls: { url: string; body?: unknown }[] = [];
  const client = createResourceManagementClient({
    get: async () => ({}),
    post: async (url, body) => { calls.push({ url, body }); return { id: "f1", name: "铭牌", path: "/file/f1" }; },
    put: async () => ({}),
    delete: async () => ({}),
  });
  const file = new FormData();
  file.append("businessKey", "maintain");
  file.append("sceneCode", "MEDICAL_CLEANLINESS");
  file.append("file", new Blob(["image"]), "plate.png");
  await client.uploadFile(file, false);
  await client.uploadFile(file, true);
  expect(calls.map((item) => item.url)).toEqual(["/api/file/file", "/api/file/upload/temporary"]);
  expect(calls[0]?.body).toBe(file);
  expect(file.get("businessKey")).toBe("maintain");
  expect(file.get("sceneCode")).toBe("MEDICAL_CLEANLINESS");
});
