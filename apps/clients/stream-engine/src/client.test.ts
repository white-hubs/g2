import { expect, test } from "bun:test";

import { createStreamEngineClient } from "./client";

test("@g2-client/stream-engine hits /api/flow and maintain paths", async () => {
  const urls: string[] = [];
  const http = {
    get: async (url: string) => {
      urls.push(`GET ${url}`);
      if (url.includes("/page") || url.includes("allPage") || url.includes("historical/page")) {
        return { data: { records: [], total: 0 } };
      }
      if (url.includes("/list") || url.includes("/type") || url.includes("/field")) {
        return { data: [] };
      }
      if (url.includes("/flow/") && url.endsWith("/flow")) {
        return { data: "flow-1" };
      }
      return { data: { id: "1" } };
    },
    post: async (url: string) => {
      urls.push(`POST ${url}`);
      return { data: {} };
    },
    put: async (url: string) => {
      urls.push(`PUT ${url}`);
      return { data: {} };
    },
    delete: async (url: string) => {
      urls.push(`DELETE ${url}`);
      return { data: {} };
    },
  };
  const client = createStreamEngineClient(http);
  await client.pageFormFlows({ pageNumber: 1, pageSize: 10 });
  await client.getFormFlowBusiness({ businessType: "HIDDENDANGER" });
  await client.getProcessTaskForm("pi-1");
  await client.submitFormFlowFirst({
    application: "HIDDENDANGER",
    applicationName: "隐患排查",
    businessType: "HIDDENDANGER",
    data: "{}",
    flowKey: "k",
    formDefinitionId: "1",
    formDefinitionVersion: 1,
    formKey: "f",
    type: "add",
  });
  await client.listHiddenDangerLevels();
  await client.listFaultTypes("FAULT");
  await client.pageWorkReportTypes();
  await client.pageConsumableStock({ storeId: "store-1", pageNumber: 1, pageSize: 10 });
  await client.listConsumableCategories();
  await client.listAreas();
  await client.listAreas({ tenant: "one" }, "/api/custom/area/tree?active=true");
  await client.getStaffInfo({ attr: "education", id: "user-1" });
  await client.getStaffDetail("user-1");
  await client.listStaff({ pageNumber: 1, pageSize: 10, keyword: "张" });
  await client.listApprovalTypes("/api/attendance", "HIDDENDANGER");
  await client.saveFormFlowBusiness({ businessType: "HIDDENDANGER" });
  await client.enableFormFlow({ id: "1", enable: true });
  await client.deleteFormFlow("1");

  expect(urls.some((item) => item.includes("GET /api/flow/form-flow/page"))).toBe(true);
  expect(urls.some((item) => item.includes("GET /api/flow/form-flow-business/type"))).toBe(true);
  expect(urls.some((item) => item.includes("GET /api/flow/process/task/form/id/pi-1"))).toBe(true);
  expect(urls.some((item) => item.includes("POST /api/flow/form-flows/first/submit"))).toBe(true);
  expect(urls.some((item) => item.includes("GET /api/maintain/hidden-danger-level/list"))).toBe(true);
  expect(urls).toContain("GET /api/maintain/fault-type/list?applicationCode=FAULT");
  expect(urls).toContain("GET /api/report/report-type-page?pageSize=1000&pageNumber=1");
  expect(urls).toContain("GET /api/property/consumable-store-stock/page?storeId=store-1&pageNumber=1&pageSize=10");
  expect(urls).toContain("GET /api/property/consumable-category/tree");
  expect(urls.some((item) => item.includes("GET /api/mdata/area/list"))).toBe(true);
  expect(urls).toContain("GET /api/custom/area/tree?active=true&tenant=one");
  expect(urls).toContain("GET /api/personnel/staff/info?attr=education&id=user-1");
  expect(urls).toContain("GET /api/ouaa/user-under-tenant/user-1");
  expect(urls).toContain("GET /api/personnel/staff/list?pageNumber=1&pageSize=10&keyword=%E5%BC%A0");
  expect(urls.some((item) => item.includes("GET /api/attendance/approval/biz/type"))).toBe(true);
  expect(urls.some((item) => item.includes("POST /api/flow/form-flow-business"))).toBe(true);
  expect(urls.every((item) => !item.includes("/gw-bff/process-engine"))).toBe(true);
});

test("task form keeps its business data and schema after response unwrapping", async () => {
  const task = {
    id: "task-1",
    data: '{"field1":"已填写"}',
    properties: { formJson: '[{"id":"field1","name":"TextInput","title":"标题"}]' },
    processInstanceRunningInfo: { operateAlias: [{ code: "PASS", name: "同意" }] },
  };
  const client = createStreamEngineClient({
    get: async () => ({ code: 200, data: task }),
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  });
  expect(await client.getProcessTaskForm("process-1")).toEqual(task);
});

test("object picker requests the legacy device list with its POST body", async () => {
  let request: { url: string; body: unknown } | undefined;
  const client = createStreamEngineClient({
    get: async () => ({ data: [] }),
    post: async (url, body) => {
      request = { url, body };
      return { data: { records: [{ id: "device-1" }], total: 1 } };
    },
    put: async () => ({}),
    delete: async () => ({}),
  });
  expect((await client.pageTargetObjects("DEVICE", { pageNumber: 2, pageSize: 10 })).records).toEqual([{ id: "device-1" }]);
  expect(request).toEqual({ url: "/api/device-center/device/instance/page", body: { pageNumber: 2, pageSize: 10 } });
});

test("outsourced device picker uses its own GET list and query", async () => {
  const urls: string[] = [];
  const client = createStreamEngineClient({
    get: async (url) => {
      urls.push(url);
      return { data: { records: [{ deviceId: "D1", deviceName: "水泵" }], total: 1 } };
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  });
  expect((await client.pageOutsourceDevices({ pageNumber: 1, pageSize: 10, enabled: true, keyword: "水泵" })).records).toEqual([
    { deviceId: "D1", deviceName: "水泵" },
  ]);
  expect(urls).toEqual(["/api/maintain/outsource/device/list?pageNumber=1&pageSize=10&enabled=true&keyword=%E6%B0%B4%E6%B3%B5"]);
});

test("vehicle plate lookup keeps the legacy parking path and selected user id", async () => {
  const urls: string[] = [];
  const client = createStreamEngineClient({
    get: async (url) => {
      urls.push(url);
      return { data: ["沪A12345", "沪B67890"] };
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  });
  expect(await client.getVehicleNumbers("user/1")).toEqual(["沪A12345", "沪B67890"]);
  expect(urls).toEqual(["/api/park-management/vehicle/approval/vechicle/no?id=user%2F1"]);
});

test("vehicle period lookup keeps the legacy misspelled path and query parameter", async () => {
  const urls: string[] = [];
  const period = { begin: "2026-09-28 08:30:00", end: "2026-10-01 18:45:00" };
  const client = createStreamEngineClient({
    get: async (url) => {
      urls.push(url);
      return { code: 200, data: period };
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  });
  expect(await client.getVehicleNumberTime("沪A 12345")).toEqual(period);
  expect(urls).toEqual(["/api/park-management/vehicle/approval/vechicle/start-end-time?vechicleNo=%E6%B2%AAA+12345"]);
});

test("archive and alarm requests preserve scalar names and complete legacy period queries", async () => {
  const urls: string[] = [];
  const client = createStreamEngineClient({
    get: async (url) => {
      urls.push(url);
      return url.includes("/staff/info") ? { data: { name: "大学本科" } } : { data: { records: [{ id: "alarm-1" }], total: 1 } };
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  });
  expect(await client.getStaffInfo({ attr: "education", id: "user/2" })).toEqual({ name: "大学本科" });
  expect(
    await client.pageAlarmRecords({
      pageNumber: 1,
      pageSize: 10,
      deviceIds: "device-1,device-2",
      period: "2026-09-28 08:00:00,2026-09-28 17:00:00",
    }),
  ).toMatchObject({ records: [{ id: "alarm-1" }], total: 1 });
  expect(urls).toEqual([
    "/api/personnel/staff/info?attr=education&id=user%2F2",
    "/api/alarm/alarm-records/common-page?pageNumber=1&pageSize=10&deviceIds=device-1%2Cdevice-2&period=2026-09-28+08%3A00%3A00%2C2026-09-28+17%3A00%3A00",
  ]);
});

test("outsourced repair and small engineering controls keep legacy API paths", async () => {
  const urls: string[] = [];
  const client = createStreamEngineClient({
    get: async (url) => {
      urls.push(url);
      return { data: { records: [], total: 0 } };
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  });
  await client.listOutsourceCompanies("device/1");
  await client.listOutsourceModes("company/2");
  await client.listProjectNames();
  await client.pageTargetObjects("SMALL_ENGINEERING", { pageNumber: 1, pageSize: 10, enabled: true, status: "UNDERWAY" });
  expect(urls).toEqual([
    "/api/maintain/outsource/company/list?pageNumber=1&pageSize=1000&deviceId=device%2F1",
    "/api/maintain/outsource/model/listByCompany?pageNumber=1&pageSize=1000&companyId=company%2F2",
    "/api/loose-works/project/apply/nameList",
    "/api/loose-works/project/schedule/list?pageNumber=1&pageSize=10&enabled=true&status=UNDERWAY",
  ]);
});

test("asset, work permit and parking controls use their legacy service paths", async () => {
  const requests: Array<{ method: string; url: string; body?: unknown }> = [];
  const client = createStreamEngineClient({
    get: async (url) => {
      requests.push({ method: "GET", url });
      return { data: { records: [], total: 0 } };
    },
    post: async (url, body) => {
      requests.push({ method: "POST", url, body });
      return { data: [] };
    },
    put: async () => ({}),
    delete: async () => ({}),
  });
  await client.listAssetClassifications("assetSource");
  await client.listAssetClassificationTree("assetType");
  await client.listAssetWarehouses();
  await client.pageAssets({ pageNumber: 2, pageSize: 10, typeId: "type-1" });
  await client.pageConsumables({ pageNumber: 1, pageSize: 10, keyword: "手套" });
  const codePayload = { checkSerialNumberList: [{ key: null, value: "A-1" }] };
  await client.checkAssetCodes(codePayload);
  await client.listWorkPermitTypes({ typeName: "动火" });
  await client.listWorkPermitLevels({ typeName: "动火" });
  await client.pageWorkPermitItems("RISK_CHECK", { pageNumber: 1, pageSize: 1000, typeName: "动火", workPermitLevel: "一级" });
  await client.pageWorkPermitItems("ACCEPTANCE", { pageNumber: 1, pageSize: 1000 });
  const recognition = { itemContent: "检查灭火器", fileIds: ["file-1"] };
  await client.recognizeWorkPermitItem(recognition);
  await client.pageParkingVehicles({ pageNumber: 2, pageSize: 20, vehicleNo: "粤A" });
  await client.listParkingLots();
  expect(requests).toEqual([
    { method: "GET", url: "/api/property/classify/getAssemblyClassifyPage?type=assetSource&pageSize=1000&pageNumber=1" },
    { method: "GET", url: "/api/property/classify/getAssemblyClassifyTree?type=assetType" },
    { method: "GET", url: "/api/property/storehouse/list" },
    { method: "GET", url: "/api/property/property/detailed/getPropertyDetailedPage?pageNumber=2&pageSize=10&typeId=type-1" },
    { method: "GET", url: "/api/property/consumable/page?pageNumber=1&pageSize=10&keyword=%E6%89%8B%E5%A5%97" },
    { method: "POST", url: "/api/property/property/detailed/checkCodeBath", body: codePayload },
    { method: "GET", url: "/api/work-permit/work-permit-types/names?typeName=%E5%8A%A8%E7%81%AB" },
    { method: "GET", url: "/api/work-permit/work-permit-types/levels?typeName=%E5%8A%A8%E7%81%AB" },
    {
      method: "GET",
      url: "/api/work-permit/work-permit-types/risk-check-items/page?pageNumber=1&pageSize=1000&typeName=%E5%8A%A8%E7%81%AB&workPermitLevel=%E4%B8%80%E7%BA%A7",
    },
    { method: "GET", url: "/api/work-permit/work-permit-types/acceptance-items/page?pageNumber=1&pageSize=1000" },
    { method: "POST", url: "/gw-bff/work-permit/associated-items/ai-recognition", body: recognition },
    { method: "GET", url: "/api/park-management/vehicle/page?pageNumber=2&pageSize=20&vehicleNo=%E7%B2%A4A" },
    { method: "GET", url: "/api/park-management/parking-infos" },
  ]);
});

test("official management and retrofit controls use the old API and device snapshot query", async () => {
  const urls: string[] = [];
  const client = createStreamEngineClient({
    get: async (url) => {
      urls.push(url);
      return { data: [] };
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  });
  await client.listOfficialSeals();
  await client.listFocusWorkTypes();
  await client.getFocusWork("work/1");
  await client.listFocusWork();
  await client.listFocusWorkStatuses();
  await client.getFocusWorkRequirement("work/1");
  await client.getFocusWorkCompleteTime("work/1");
  await client.getNorthDeviceDetail("device/1");
  expect(urls).toEqual([
    "/api/official/officialSeal/widget/list",
    "/api/official/focusWork/category/weight/list",
    "/api/official/focusWork/weight/work%2F1",
    "/api/official/focusWork/weight/list",
    "/api/official/focusWork/weight/status/list",
    "/api/official/focusWork/weight/work%2F1/requirement",
    "/api/official/focusWork/weight/work%2F1/completeTime",
    "/api/iot/north/device/detail?deviceId=device%2F1&withPropertySpec=true&withSnapShot=true",
  ]);
});
