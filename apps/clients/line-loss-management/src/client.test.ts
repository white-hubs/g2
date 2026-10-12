import { expect, test } from "bun:test";

import { createLineLossManagementClient } from "./client";

function capture() {
  const calls: string[] = [];
  return {
    calls,
    client: createLineLossManagementClient({
      get: async (url) => {
        calls.push(`GET ${url}`);
        return {};
      },
      post: async (url) => {
        calls.push(`POST ${url}`);
        return {};
      },
    }),
  };
}

test("线损业务接口保持旧仓 /api/securitymanagement 前缀与参数", async () => {
  const { client, calls } = capture();
  await client.getCollectionRecords({ pageNumber: 2, pageSize: 20, deviceIdSet: ["a", "b"] });
  await client.getLossStatistics({ pageNumber: 1, pageSize: 10, startTime: "", endTime: "", lineName: "" });
  await client.getCollectionCycle();
  await client.getLineLossTrend({ lineId: "line-1", timeRange: "MONTH" });
  await client.getLineConnections({ keyword: "进线" });
  await client.getSupplyGraph();
  expect(calls[0]).toBe("GET /api/securitymanagement/lineLoss/read/page?pageNumber=2&pageSize=20&deviceIdSet=a&deviceIdSet=b");
  expect(calls).toContain("GET /api/securitymanagement/lineLoss/stat/page?pageNumber=1&pageSize=10&startTime=&endTime=&lineName=");
  expect(calls).toContain("GET /api/securitymanagement/lineloss/collectConfig/detail");
  expect(calls).toContain("GET /api/securitymanagement/lineLoss/supply/trend?lineId=line-1&timeRange=MONTH");
  expect(calls).toContain("GET /api/securitymanagement/lineLoss/connection/page?keyword=%E8%BF%9B%E7%BA%BF");
  expect(calls).toContain("GET /api/securitymanagement/lineLoss/supply/detail");
});

test("线损保存与同步接口保持旧仓 POST 动词", async () => {
  const { client, calls } = capture();
  await client.saveCollectionCycle({ periodType: "EVERY_DAY", hourTime: "01:00:00" });
  await client.syncSupplyGraph();
  await client.updateLineLossDevices({ id: "line-1", fromDeviceId: "a", toDeviceId: "b" });
  expect(calls).toEqual([
    "POST /api/securitymanagement/lineloss/collectConfig/edit",
    "POST /api/securitymanagement/lineLoss/supply/sync",
    "POST /api/securitymanagement/lineLoss/supply/edit",
  ]);
});
