import { expect, test } from "bun:test";

import { type HttpClient, createMaintenanceClient, normalizePlanStatusOptions } from "./client";

test("计划状态字典兼容字符串与 code/name 行", () => {
  expect(normalizePlanStatusOptions(["ENABLED", { code: "EXPIRED", name: "已过期" }, { value: "DEACTIVATED", label: "已停用" }])).toEqual([
    { label: "ENABLED", value: "ENABLED" },
    { label: "已过期", value: "EXPIRED" },
    { label: "已停用", value: "DEACTIVATED" },
  ]);
});

test("维保作业 Client 保持旧 /api/maintain 路径与参数", async () => {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const http: HttpClient = {
    get: async (url) => {
      calls.push({ method: "GET", url });
      return url.endsWith("/getStatus") ? { data: ["ENABLED"] } : { data: { records: [], total: 0, pages: 0 } };
    },
    post: async (url, body) => {
      calls.push({ method: "POST", url, body });
      return { data: null };
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
  const client = createMaintenanceClient(http);
  await client.pagePlans({ pageNumber: 2, pageSize: 20, status: "ENABLED", keyword: "空调 A" });
  await client.listPlanStatus();
  await client.getPlan("a/b");
  await client.savePlan({ maintenancePlanName: "计划", status: "ENABLED" });
  await client.updatePlanStatus({ id: "p1", status: "DEACTIVATED" });
  await client.deletePlan("p1");
  await client.pageTasks({ pageNumber: 1, pageSize: 10, categoryCode: "AC", period: "2026-01-01 00:00:00,2026-01-31 23:59:59" });
  await client.getTask("t1");
  await client.saveProgetRecord({ id: "t1", taskRemark: "完成", fileIds: ["f1"] });
  await client.pageMaintenanceProjects({ pageNumber: 1, pageSize: 10, categoryCode: "AC" });
  await client.listMaintenanceProjectItems({ categoryCode: "AC" });
  await client.saveMaintenanceProjectItems([{ categoryCode: "AC", maintenanceContent: "清洗滤网", deleted: false }]);
  await client.pageDeviceStatistics({ pageNumber: 1, pageSize: 10, keyword: "风机" });
  await client.listAppointments({ enabled: true });
  await client.listSatMsgConfigs("MAINTAIN_MAINTANCE_RECEIPT_CONFIRM");
  await client.createSatMsgConfigs([{ satMsgDefineCode: "MAINTAIN_MAINTANCE_RECEIPT_CONFIRM" }]);
  await client.updateSatMsgConfigs([{ satMsgDefineCode: "MAINTAIN_MAINTANCE_RECEIPT_CONFIRM" }]);
  expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
    "GET /api/maintain/select-maintenance-plan?pageNumber=2&pageSize=20&status=ENABLED&keyword=%E7%A9%BA%E8%B0%83+A",
    "GET /api/maintain/getStatus",
    "GET /api/maintain/select-maintenance-planDetail/a%2Fb",
    "POST /api/maintain/save-maintenance-plan",
    "PUT /api/maintain/update-maintenance-plan?id=p1&status=DEACTIVATED",
    "DELETE /api/maintain/delete-plan/p1",
    "GET /api/maintain/select-tasks?pageNumber=1&pageSize=10&categoryCode=AC&period=2026-01-01+00%3A00%3A00%2C2026-01-31+23%3A59%3A59",
    "GET /api/maintain/select-tasks-detail/t1",
    "POST /api/maintain/save-proget-record",
    "GET /api/maintain/select-maintenance-project?pageNumber=1&pageSize=10&categoryCode=AC",
    "GET /api/maintain/select-maintenance-projectDetail?categoryCode=AC",
    "POST /api/maintain/save-maintenance-project",
    "GET /api/maintain/maintenance/device/statistics/page?pageNumber=1&pageSize=10&keyword=%E9%A3%8E%E6%9C%BA",
    "GET /api/ouaa/appointment/list?enabled=true",
    "GET /api/message/sat-msg-configs?satMsgDefineCodes=MAINTAIN_MAINTANCE_RECEIPT_CONFIRM",
    "POST /api/message/sat-msg-config",
    "PUT /api/message/sat-msg-config",
  ]);
  expect(calls.find((call) => call.url === "/api/message/sat-msg-config")?.body).toEqual({
    params: [{ satMsgDefineCode: "MAINTAIN_MAINTANCE_RECEIPT_CONFIRM" }],
  });
  expect(calls.find((call) => call.url === "/api/maintain/save-maintenance-project")?.body).toEqual([
    { categoryCode: "AC", maintenanceContent: "清洗滤网", deleted: false },
  ]);
});

test("维保统计导出返回二进制", async () => {
  const http: HttpClient = {
    get: async () => new Blob(["excel"]),
    post: async () => ({ data: null }),
    put: async () => ({ data: null }),
    delete: async () => ({ data: null }),
  };
  const blob = await createMaintenanceClient(http).exportDeviceStatistics({ keyword: "风机" });
  expect(blob).toBeInstanceOf(Blob);
});

test("任务详情实体 code（任务编号）不能被 unwrap 误判为失败", async () => {
  const http: HttpClient = {
    get: async () => ({
      code: 200,
      data: { id: "t1", code: "WB-2024-001", objectName: "理货机", maintenanceTaskStatus: "BE_MAINTAINED" },
    }),
    post: async () => ({ data: null }),
    put: async () => ({ data: null }),
    delete: async () => ({ data: null }),
  };
  const task = await createMaintenanceClient(http).getTask("t1");
  expect(task).toEqual({
    id: "t1",
    code: "WB-2024-001",
    objectName: "理货机",
    maintenanceTaskStatus: "BE_MAINTAINED",
  });
});
