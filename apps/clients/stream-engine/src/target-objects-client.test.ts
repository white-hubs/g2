import { expect, test } from "bun:test";

import { createStreamEngineClient } from "./client";

test("patrol object selection uses the old GET query and preserves its location DTO", async () => {
  const requests: Array<{ method: string; url: string }> = [];
  const location = { id: "patrol-1", patrolLocationName: "北门巡更点", area: [{ id: "area-1", name: "北区" }], code: "P-1" };
  const client = createStreamEngineClient({
    get: async (url) => {
      requests.push({ method: "GET", url });
      return { data: { records: [location], total: 1, pages: 1 } };
    },
    post: async (url) => {
      requests.push({ method: "POST", url });
      return {};
    },
    put: async () => ({}),
    delete: async () => ({}),
  });

  expect(await client.pageTargetObjects("PATROL_POINT", { pageNumber: 2, pageSize: 20, keyword: "北门", areaId: "area/1" })).toEqual({
    records: [location],
    total: 1,
    pages: 1,
  });
  expect(requests).toEqual([
    { method: "GET", url: "/api/maintain/patrol/location/page?pageNumber=2&pageSize=20&keyword=%E5%8C%97%E9%97%A8&areaId=area%2F1" },
  ]);
});

test("site object selection keeps pointName, typeId and receiveDepId instead of a generic keyword", async () => {
  const requests: string[] = [];
  const client = createStreamEngineClient({
    get: async (url) => {
      requests.push(url);
      return { data: { records: [], total: 0 } };
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  });

  await client.pageTargetObjects("SITE_POINT", {
    pageNumber: 3,
    pageSize: 15,
    keyword: "ignored",
    pointName: "消防栓",
    typeId: "type/1",
    receiveDepId: "dep/2",
  });
  await client.pageTargetObjects("SITE_POINT", { keyword: "配电柜" });
  await client.listInspectPointTypes();
  expect(requests).toEqual([
    "/api/maintain/inspect/pointList?pageNumber=3&pageSize=15&pointName=%E6%B6%88%E9%98%B2%E6%A0%93&typeId=type%2F1&receiveDepId=dep%2F2",
    "/api/maintain/inspect/pointList?pageNumber=1&pageSize=10&pointName=%E9%85%8D%E7%94%B5%E6%9F%9C",
    "/api/maintain/inspect/sceneTypeList",
  ]);
});

test("empty patrol filters retain the legacy page defaults without calling the tag API", async () => {
  const requests: string[] = [];
  const client = createStreamEngineClient({
    get: async (url) => {
      requests.push(url);
      return { data: { records: [], total: 0 } };
    },
    post: async (url) => {
      requests.push(`POST ${url}`);
      return {};
    },
    put: async () => ({}),
    delete: async () => ({}),
  });

  await client.pageTargetObjects("PATROL_POINT", {});
  expect(requests).toEqual(["/api/maintain/patrol/location/page?pageNumber=1&pageSize=10"]);
});

test("target filter options use the precise legacy product, tag, asset, stall and dictionary services", async () => {
  const requests: string[] = [];
  const client = createStreamEngineClient({
    get: async (url) => {
      requests.push(url);
      return { data: [] };
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  });
  await client.listTargetDeviceProducts();
  await client.listTargetDeviceCategories();
  await client.listTargetDeviceTags();
  await client.listAssetClassifications("assetType");
  await client.listTargetStallTypes();
  await client.listTargetRiskSourceTypes();
  expect(requests).toEqual([
    "/api/device-center/things/product/list/all",
    "/api/device-center/iot/product/category-tree",
    "/api/device-center/tag/customer/list?status=1",
    "/api/property/classify/getAssemblyClassifyPage?type=assetType&pageSize=1000&pageNumber=1",
    "/api/mdata/stall-category/list?enabled=true",
    "/api/dictionary/getCascadeDictionaryItem?itemCode=risk-source-type",
  ]);
});

test("asset, stall, risk and small engineering target pages preserve their GET filters", async () => {
  const requests: string[] = [];
  const client = createStreamEngineClient({
    get: async (url) => {
      requests.push(url);
      return { data: { records: [], total: 0 } };
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  });
  await client.pageTargetObjects("PROPERTY", { pageNumber: 1, pageSize: 10, keyword: "打印机", typeId: "office", receiveDepId: "dep-1" });
  await client.pageTargetObjects("STALL", { pageNumber: 1, pageSize: 10, enabled: true, type: "stall-1", areaId: "area-1" });
  await client.pageTargetObjects("RISK_SOURCE", { pageNumber: 1, pageSize: 10, typeCode: "fire", keyword: "灭火器" });
  await client.pageTargetObjects("SMALL_ENGINEERING", { pageNumber: 1, pageSize: 10, status: "UNDERWAY", depId: "dep-1", keyword: "铺路" });
  expect(requests).toEqual([
    "/api/property/property/detailed/getPropertyDetailedPage?pageNumber=1&pageSize=10&keyword=%E6%89%93%E5%8D%B0%E6%9C%BA&typeId=office&receiveDepId=dep-1",
    "/api/mdata/stall/page?pageNumber=1&pageSize=10&enabled=true&type=stall-1&areaId=area-1",
    "/api/property/risk/source/ledger/page?pageNumber=1&pageSize=10&typeCode=fire&keyword=%E7%81%AD%E7%81%AB%E5%99%A8",
    "/api/loose-works/project/schedule/list?pageNumber=1&pageSize=10&status=UNDERWAY&depId=dep-1&keyword=%E9%93%BA%E8%B7%AF",
  ]);
});

test("legacy empty target filters survive GET serialization while absent filters remain absent", async () => {
  const requests: string[] = [];
  const client = createStreamEngineClient({
    get: async (url) => {
      requests.push(url);
      return { data: { records: [], total: 0 } };
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  });
  await client.pageTargetObjects("PROPERTY", {
    pageNumber: 1,
    pageSize: 10,
    keyword: "",
    typeId: "",
    receiveDepId: "",
    status: "",
    areaId: "",
    sourceId: "",
    purchaseStartDate: "",
    purchaseEndDate: "",
    usageDate: "",
  });
  await client.pageTargetObjects("RISK_SOURCE", { pageNumber: 1, pageSize: 10, keyword: "", typeCode: "", areaId: "" });
  await client.pageTargetObjects("SITE_POINT", { typeId: "", receiveDepId: "" });
  await client.pageTargetObjects("PATROL_POINT", { keyword: "", areaId: "" });
  await client.pageTargetObjects("SMALL_ENGINEERING", { pageNumber: 1, pageSize: 10, keyword: "", depId: "", status: "", enabled: true });
  expect(requests).toEqual([
    "/api/property/property/detailed/getPropertyDetailedPage?pageNumber=1&pageSize=10&keyword=&typeId=&receiveDepId=&status=&areaId=&sourceId=&purchaseStartDate=&purchaseEndDate=&usageDate=",
    "/api/property/risk/source/ledger/page?pageNumber=1&pageSize=10&keyword=&typeCode=&areaId=",
    "/api/maintain/inspect/pointList?pageNumber=1&pageSize=10&pointName=&typeId=&receiveDepId=",
    "/api/maintain/patrol/location/page?pageNumber=1&pageSize=10&keyword=&areaId=",
    "/api/loose-works/project/schedule/list?pageNumber=1&pageSize=10&keyword=&depId=&status=&enabled=true",
  ]);
});
