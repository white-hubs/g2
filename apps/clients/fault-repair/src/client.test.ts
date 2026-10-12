import { expect, test } from "bun:test";

import { type HttpClient, createFaultRepairClient, normalizeReportTypes } from "./client";

test("报告类型兼容旧字典字段并保留中文标签", () => {
  expect(
    normalizeReportTypes([
      { code: "REPORT_DAY", name: "日报" },
      { type: "REPORT_WEEK", typeName: "周报" },
      { value: "REPORT_MONTH", label: "" },
    ]),
  ).toEqual([
    { value: "REPORT_DAY", label: "日报" },
    { value: "REPORT_WEEK", label: "周报" },
    { value: "REPORT_MONTH", label: "月报" },
  ]);
});

test("故障报修 Client 保持旧接口前缀与参数", async () => {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const http: HttpClient = {
    get: async (url) => {
      calls.push({ method: "GET", url });
      return url.endsWith("/getReportType") ? { data: [{ code: "REPORT_DAY", name: "日报" }] } : { data: { records: [], total: 0 } };
    },
    post: async (url, body) => {
      calls.push({ method: "POST", url, body });
      return { data: url === "/api/file/file" ? { id: "file-1", path: "/file-1.jpg" } : null };
    },
    put: async (url, body) => {
      calls.push({ method: "PUT", url, body });
      return { data: null };
    },
    delete: async (url) => {
      calls.push({ method: "DELETE", url });
      return { data: null };
    },
  };
  const client = createFaultRepairClient(http);
  await client.pagePersonal({ pageNumber: 2, pageSize: 20, businessType: "FAULT", type: "WAITING" });
  await client.pageRecords({ pageNumber: 1, pageSize: 10, businessType: "FAULT", keyword: "A B" });
  await client.pageOrderStatistics({ faultTypeId: "a/b", applicationCode: "FAULT" });
  await client.pageReports({ pageNumber: 1, pageSize: 10 });
  expect(await client.reportTypes()).toEqual([{ value: "REPORT_DAY", label: "日报" }]);
  await client.listTypes();
  await client.listTypes({ applicationCode: "COMPLAINT" });
  await client.deleteCase("a/b");
  await client.listDepartments();
  await client.listProductCategories();
  await client.listFlowNodeNames({ businessType: "FAULT" });
  expect(await client.uploadCaseFile(new Blob(["test"]))).toMatchObject({ id: "file-1", path: "/file-1.jpg" });
  expect(calls.map((call) => call.url)).toEqual([
    "/api/maintain/fault/apply/personal?pageNumber=2&pageSize=20&businessType=FAULT&type=WAITING",
    "/api/maintain/fault/apply/all?pageNumber=1&pageSize=10&businessType=FAULT&keyword=A+B",
    "/api/maintain/fault/apply/statistics/type?faultTypeId=a%2Fb&applicationCode=FAULT",
    "/api/maintain/getReport?applicationCode=FAULT&pageNumber=1&pageSize=10",
    "/api/maintain/getReportType",
    "/api/maintain/fault-type/list?applicationCode=FAULT",
    "/api/maintain/fault-type/list?applicationCode=COMPLAINT",
    "/api/maintain/fault-case/a%2Fb",
    "/api/ouaa/authenticated/organizations/list",
    "/api/device-center/iot/product/category-tree",
    "/api/flow/form-flow-business/node/name?businessType=FAULT",
    "/api/file/file",
  ]);
});
