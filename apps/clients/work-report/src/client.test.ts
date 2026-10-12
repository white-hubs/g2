import { describe, expect, test } from "bun:test";

import { type HttpClient, createWorkReportClient } from "./client";
function fixture(response?: unknown) {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const invoke = async (method: string, url: string, body?: unknown) => {
    calls.push({ method, url, body });
    return response === undefined ? { records: [], total: 0 } : response;
  };
  const http: HttpClient = {
    get: (url) => invoke("GET", url),
    post: (url, body) => invoke("POST", url, body),
    put: (url, body) => invoke("PUT", url, body),
    delete: (url) => invoke("DELETE", url),
  };
  return { calls, client: createWorkReportClient(http) };
}
describe("work-report legacy API contracts", () => {
  test("type pages retain distinct search names", async () => {
    const { client, calls } = fixture();
    await client.pageTypes("report", { pageNumber: 1, pageSize: 10, keyword: "日报" });
    await client.pageTypes("arrange", { pageNumber: 2, pageSize: 20, name: "通知" });
    expect(new URL(calls[0]!.url, "http://test").pathname).toBe("/api/report/report-type-page");
    expect(new URL(calls[0]!.url, "http://test").searchParams.get("keyword")).toBe("日报");
    expect(new URL(calls[1]!.url, "http://test").pathname).toBe("/api/report/work-plan-type/page");
    expect(new URL(calls[1]!.url, "http://test").searchParams.get("name")).toBe("通知");
  });
  test("numeric report status and boolean arrangement status retain method and payload", async () => {
    const { client, calls } = fixture(null);
    await client.setTypeStatus("report", "r1", 1);
    await client.setTypeStatus("arrange", "a1", true);
    expect(calls).toEqual([
      { method: "PUT", url: "/api/report/report-type/r1?status=1", body: { id: "r1", status: 1 } },
      { method: "PUT", url: "/api/report//work-plan-type/a1?status=true", body: { id: "a1", status: true } },
    ]);
  });
  test("type create update and delete endpoints", async () => {
    const { client, calls } = fixture(null);
    await client.createType("report", { name: "日报", status: 0 });
    await client.updateType("report", "1", { name: "日报", status: 1 });
    await client.deleteType("report", "1");
    await client.createType("arrange", { name: "安排", status: false });
    await client.updateType("arrange", "2", { name: "安排", status: true });
    await client.deleteType("arrange", "2");
    expect(calls.map((item) => `${item.method} ${item.url}`)).toEqual([
      "POST /api/report/report-type-add",
      "PUT /api/report/report-type-update",
      "DELETE /api/report/report-type/1",
      "POST /api/report/work-plan-type",
      "PUT /api/report/work-plan-type/2",
      "DELETE /api/report/work-plan-type/2",
    ]);
    expect(calls[1]?.body).toEqual({ id: "1", name: "日报", status: 1 });
  });
  test("flow page sends REPORT and five-view filter", async () => {
    const { client, calls } = fixture();
    await client.pageFlows({ pageNumber: 1, pageSize: 10, businessType: "REPORT", type: "WAITING", submitTime: "2026-10-01,2026-10-08" });
    const address = new URL(calls[0]!.url, "http://test");
    expect(address.pathname).toBe("/api/flow/process/instance/historical/page");
    expect(address.searchParams.get("businessType")).toBe("REPORT");
    expect(address.searchParams.get("type")).toBe("WAITING");
    expect(address.searchParams.has("status")).toBe(false);
    expect(address.searchParams.get("submitTime")).toBe("2026-10-01,2026-10-08");
  });
  test("report center and drilldown use report-page with IDs not labels", async () => {
    const { client, calls } = fixture();
    await client.pageReports({
      pageNumber: 1,
      pageSize: 10,
      organizationId: "o1",
      startUserId: "u1",
      reportTypeId: "r1",
      username: "张",
      status: "FINISHED",
      submitTime: "2026-10-01,2026-10-08",
    });
    const address = new URL(calls[0]!.url, "http://test");
    expect(address.pathname).toBe("/api/report/report-page");
    expect(address.searchParams.get("organizationId")).toBe("o1");
    expect(address.searchParams.get("startUserId")).toBe("u1");
    expect(address.searchParams.get("reportTypeId")).toBe("r1");
    expect(address.searchParams.get("username")).toBe("张");
  });
  test("normalizes direct, enveloped and center nested page results without losing total", async () => {
    for (const response of [
      { records: [{ processInstanceId: "p1" }], total: 3 },
      { code: 200, data: { records: [{ processInstanceId: "p1" }], total: 3 } },
      { data: { records: [{ processInstanceId: "p1" }] }, total: 3 },
    ]) {
      const { client } = fixture(response);
      const result = await client.pageReports({ pageNumber: 1, pageSize: 10 });
      expect(result.records[0]?.processInstanceId).toBe("p1");
      expect(result.total).toBe(3);
    }
  });
  test("bad response formats and service errors are visible", async () => {
    await expect(fixture({ wrong: [] }).client.pageReports({ pageNumber: 1, pageSize: 10 })).rejects.toThrow("分页接口返回格式错误");
    await expect(fixture({ code: 412, message: "类型已被使用", data: {} }).client.deleteType("report", "1")).rejects.toThrow(
      "类型已被使用",
    );
  });
  test("arrangement filters detail publishing and deletion", async () => {
    const { client, calls } = fixture();
    await client.pageArrangements({ pageNumber: 1, pageSize: 10, deptId: "d1", period: "2026-10-01,2026-10-08", keyword: "内容" });
    await client.getArrangement("a/1");
    await client.createArrangement({ title: "安排", type: "t1", content: "内容", fileIds: "f1,f2" });
    await client.deleteArrangement("a1");
    expect(new URL(calls[0]!.url, "http://test").searchParams.get("deptId")).toBe("d1");
    expect(calls[1]?.url).toBe("/api/report/work-plan/a%2F1");
    expect(calls[2]).toEqual({
      method: "POST",
      url: "/api/report/work-plan",
      body: { title: "安排", type: "t1", content: "内容", fileIds: "f1,f2" },
    });
    expect(calls[3]?.url).toBe("/api/report/work-plan/a1");
  });
  test("options retain status enable and WORK_REPORT application scopes", async () => {
    const { client, calls } = fixture([]);
    await client.listArrangeTypes();
    await client.listOrganizations();
    await client.listFormFlows();
    await client.listReportFields();
    expect(calls.map((item) => item.url)).toEqual([
      "/api/report/work-plan-type/list?status=true",
      "/api/ouaa/authenticated/organizations/list",
      "/api/flow/form-flow/list?enable=true&application=WORK_REPORT",
      "/api/report/report-field",
    ]);
  });
  test("flow binding maps group fields using the legacy business endpoint", async () => {
    const { client, calls } = fixture("flow1");
    expect(await client.getBusinessFlow()).toBe("flow1");
    await client.getFormFlow("flow1");
    const body = {
      businessType: "REPORT" as const,
      businessTypeName: "工作汇报" as const,
      formDefinitionId: "form1",
      formFlowId: "flow1",
      fieldMapList: [{ controlId: "c1", title: "类型", businessField: "type" }],
    };
    await client.saveFlowBusiness(body);
    expect(calls[0]?.url).toBe("/api/flow/form-flow-business/REPORT/flow");
    expect(calls[1]?.url).toBe("/api/flow/form-flow/flow1?id=flow1");
    expect(calls[2]).toEqual({ method: "POST", url: "/api/flow/form-flow-business", body });
  });
  test("statistics retains departmentId period and selected user IDs for binary export", async () => {
    const { client, calls } = fixture();
    await client.pageStatistics({ pageNumber: 2, pageSize: 10, departmentId: "d1", period: "2026-10-01,2026-10-08", userName: "李" });
    const address = new URL(calls[0]!.url, "http://test");
    expect(address.pathname).toBe("/api/report/report-statistics-pc");
    expect(address.searchParams.get("departmentId")).toBe("d1");
    const blob = new Blob(["sheet"], { type: "application/vnd.ms-excel" });
    const exported = fixture(blob);
    const query = { pageNumber: 1, pageSize: 10, period: "", selectReportBys: "u1,u2" };
    expect(await exported.client.exportStatistics(query)).toBe(blob);
    expect(exported.calls[0]).toEqual({ method: "POST", url: "/api/report/report-statistics-export-pc", body: query });
    await expect(fixture({ records: [] }).client.exportStatistics(query)).rejects.toThrow("导出接口未返回文件流");
  });
});
