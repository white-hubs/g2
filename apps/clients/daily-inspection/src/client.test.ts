import { describe, expect, test } from "bun:test";

import { asInspectionPage, createDailyInspectionClient } from "./client";

function fakeHttp() {
  const calls: Array<{ method: string; url: string; body?: unknown }> = [];
  return {
    calls,
    http: {
      get: async (url: string) => {
        calls.push({ method: "GET", url });
        if (url.includes("getDataDictionaryByItemAndCode")) {
          return { data: { variable: JSON.stringify({ inspectStandGenerate: "flow-1" }) } };
        }
        return { data: { records: [], total: 0 } };
      },
      post: async (url: string, body?: unknown) => (calls.push({ method: "POST", url, body }), { data: { standards: [] } }),
      put: async (url: string, body?: unknown) => (calls.push({ method: "PUT", url, body }), {}),
      delete: async (url: string) => (calls.push({ method: "DELETE", url }), {}),
    },
  };
}

describe("@g2-client/daily-inspection", () => {
  test("plan and task requests hit maintain gateway directly", async () => {
    const { calls, http } = fakeHttp();
    const client = createDailyInspectionClient(http);
    await client.listPlans({ pageNumber: 1, pageSize: 10, keywords: "计划" });
    await client.createTask({ name: "临时任务" });
    await client.setPlanEnabled("p-1", true);

    expect(calls[0]?.url).toContain("/api/maintain/inspect-plan/pageV2");
    expect(calls[0]?.url).toContain("keywords=");
    expect(calls[1]).toEqual({
      method: "POST",
      url: "/api/maintain/inspect-task/save",
      body: { name: "临时任务" },
    });
    expect(calls[2]?.url).toContain("/api/maintain/inspect-plan/p-1/start/true");
  });

  test("exportTasks posts to pageV2/export and returns blob", async () => {
    const calls: Array<{ method: string; url: string; body?: unknown }> = [];
    const blob = new Blob(["xlsx"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const client = createDailyInspectionClient({
      get: async () => ({}),
      post: async (url: string, body?: unknown) => {
        calls.push({ method: "POST", url, body });
        return blob;
      },
      put: async () => ({}),
      delete: async () => ({}),
    });
    const result = await client.exportTasks({ pageNumber: 1, pageSize: 10, keyword: "泵" });
    expect(result).toBe(blob);
    expect(calls[0]).toEqual({
      method: "POST",
      url: "/api/maintain/inspect-task/pageV2/export",
      body: { pageNumber: 1, pageSize: 10, keyword: "泵" },
    });
  });

  test("inspection result detail and option saves use the legacy result endpoints", async () => {
    const { calls, http } = fakeHttp();
    const client = createDailyInspectionClient(http);
    const payload = {
      name: "设备状态",
      code: "",
      enable: true,
      options: [{ key: "item-1", itemName: "异常", itemValue: "1", errorFlag: true }],
    };

    await client.getConfig("result", "result-1");
    await client.createConfig("result", payload);
    await client.updateConfig("result", "result-1", { id: "result-1", ...payload });

    expect(calls).toEqual([
      { method: "GET", url: "/api/maintain/inspect-result/result-1" },
      { method: "POST", url: "/api/maintain/inspect-result", body: payload },
      { method: "PUT", url: "/api/maintain/inspect-result/result-1", body: { id: "result-1", ...payload } },
    ]);
  });

  test("inspection cycle batch deletion sends selected ids to the legacy endpoint", async () => {
    const { calls, http } = fakeHttp();
    await createDailyInspectionClient(http).deleteCronBatch(["a", "b"]);
    expect(calls).toEqual([{ method: "DELETE", url: "/api/maintain/inspect-cron/batch?ids=a%2Cb" }]);
  });

  test("AI generation resolves flow from dictionary then calls ai-center", async () => {
    const { calls, http } = fakeHttp();
    const client = createDailyInspectionClient(http);
    await client.generateStandards({ targetName: "输送机", supplement: "高粉尘环境" });
    expect(calls[0]?.url).toContain("/api/dictionary/getDataDictionaryByItemAndCode");
    expect(calls[1]).toEqual({
      method: "POST",
      url: "/api/ai-center/flow/console/studio/flow-1/run",
      body: { input: "输送机\n高粉尘环境", inputType: "chat", outputType: "chat" },
    });
  });

  test("page response unwraps nested legacy envelopes", () => {
    expect(asInspectionPage({ data: { data: { records: [{ id: "1" }], total: 8, pages: 2 } } })).toEqual({
      records: [{ id: "1" }],
      total: 8,
      pages: 2,
    });
  });

  test("standard and object helpers hit expected maintain/tag paths", async () => {
    const { calls, http } = fakeHttp();
    const client = createDailyInspectionClient(http);
    await client.getStandardsByTarget("DEVICE", "dev-1");
    await client.listStandardPage({ pageNumber: 1, pageSize: 10, keyword: "泵" });
    await client.listItemPage({ pageNumber: 1, pageSize: 10 });
    await client.listObjectPage("device", { pageNumber: 1, pageSize: 20 });
    await client.listStandardPage({ pageNumber: 1, pageSize: 10, businessType: "" });
    await client.listAreaTree();

    expect(calls[0]?.url).toContain("/api/maintain/inspect-standard/targetCategory/DEVICE/targetType/dev-1");
    expect(calls[1]?.url).toContain("/api/maintain/inspect-standard/page");
    expect(calls[2]?.url).toContain("/api/maintain/inspect-item-template/page");
    expect(calls[3]).toEqual({
      method: "POST",
      url: "/api/device-center/device/instance/page",
      body: { pageNumber: 1, pageSize: 20 },
    });
    expect(calls[4]?.url).toContain("/api/maintain/inspect-standard/page");
    expect(calls[4]?.url).not.toContain("businessType=");
    expect(calls[5]?.url).toContain("/api/mdata/area/list");

    await client.setDefaultStandard("std-1", {
      defaultStandard: 1,
      targetType: "dev-1",
      targetCategory: "DEVICE",
      businessType: "",
    });
    expect(calls[6]).toEqual({
      method: "POST",
      url: "/api/maintain/inspect-standard/defaultStandard",
      body: {
        standardId: "std-1",
        defaultStandard: 1,
        targetType: "dev-1",
        targetCategory: "DEVICE",
        businessType: "",
      },
    });

    await client.getIotProductCategoryTree();
    expect(calls[7]?.url).toContain("/api/device-center/iot/product/category-tree");

    await client.listInspectionAnalysis("inspectionTaskAnalysis", { period: "2024-01-01 00:00:00,2024-01-31 23:59:59" });
    expect(calls[8]?.url).toContain("/api/maintain/inspection-analysis/inspectionTaskAnalysis");
    expect(calls[8]?.url).toContain("period=");
  });
});

test("小散工程保留巡检领域隔离参数和完整执行进度", async () => {
  const calls: string[] = [];
  const progress = { targetAllNum: 3, taskRateResults: [{ id: "t1", rate: 50 }], recordTaskResultList: [{ id: "r1", result: "ABNORMAL" }] };
  const client = createDailyInspectionClient({
    get: async (url) => { calls.push(url); return { data: url.includes("detail-rateV2") ? progress : [] }; },
    post: async () => ({}), put: async () => ({}), delete: async (url) => { calls.push(url); return {}; },
  });
  expect(await client.getTaskProgress({ id: "t1", businessType: "SMALL_ENGINEERING" })).toEqual(progress);
  await client.getStandardsByTarget("SMALL_ENGINEERING", "type/1", "SMALL_ENGINEERING");
  await client.getConfig("item", "item/1", "SMALL_ENGINEERING");
  await client.deleteConfig("standard", "std/1", "SMALL_ENGINEERING");
  expect(calls).toEqual([
    "/api/maintain/inspect-task/detail-rateV2?id=t1&businessType=SMALL_ENGINEERING",
    "/api/maintain/inspect-standard/targetCategory/SMALL_ENGINEERING/targetType/type%2F1?businessType=SMALL_ENGINEERING",
    "/api/maintain/inspect-item-template/item%2F1/detail?businessType=SMALL_ENGINEERING",
    "/api/maintain/inspect-standard/std%2F1?businessType=SMALL_ENGINEERING",
  ]);
});
