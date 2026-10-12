import { expect, test } from "bun:test";

import { createElectricalSafetyClient } from "./client";

test("远检完整记录集按实际条数分页，服务端分页结果保持不变", async () => {
  const records = Array.from({ length: 23 }, (_, index) => ({
    index,
    deviceName: `设备${index}`,
    deviceId: String(index),
    collectTime: "2026-09-21 09:00:00",
    values: {},
  }));
  const f = fixture({ headers: [], records });
  const page = await createElectricalSafetyClient(f.http).getRemoteInspectionData("1", {
    startTime: "2026-09-01",
    endTime: "2026-09-21",
    pageNumber: 2,
    pageSize: 10,
  });
  expect(page.total).toBe(23);
  expect(page.records).toEqual(records.slice(10, 20));
  const serverPage = { headers: [], records: records.slice(10, 20), total: 23 };
  const paged = fixture({ data: serverPage });
  expect(
    await createElectricalSafetyClient(paged.http).getRemoteInspectionData("1", {
      startTime: "2026-09-01",
      endTime: "2026-09-21",
      pageNumber: 2,
      pageSize: 10,
    }),
  ).toEqual(serverPage);
});

test("无 data 包装的业务失败也必须抛错", async () => {
  const f = fixture({ code: 500, message: "测试业务错误" });
  await expect(createElectricalSafetyClient(f.http).loadGraph()).rejects.toThrow("测试业务错误");
});

test("线损导出逐页读取，转义中文、引号及公式单元格", async () => {
  const f = fixture();
  const pages: number[] = [];
  f.http.get = async (url: string) => {
    const pageNumber = Number(new URL(url, "http://local").searchParams.get("pageNumber"));
    pages.push(pageNumber);
    return { total: 2, records: [{ lineId: String(pageNumber), lineName: pageNumber === 1 ? "=SUM(A1)" : '中文,"线路"' }] };
  };
  const blob = await createElectricalSafetyClient(f.http).exportLineLossStatistics({ startTime: "2026-09-01", endTime: "2026-09-21" });
  expect(pages).toEqual([1, 2]);
  const csv = await blob.text();
  expect(csv).toContain('"\'=SUM(A1)"');
  expect(csv).toContain('"中文,""线路"""');
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

test("设施和监测真实路径，ID 安全编码", async () => {
  const f = fixture(),
    c = createElectricalSafetyClient(f.http);
  await c.listFacilities({ pageNumber: 1, pageSize: 10 });
  await c.getFacility("a/b");
  await c.getDeviceRealtimeProperties("dev/1");
  expect(f.calls.map((x) => x.url)).toEqual([
    "/api/electrical-management/facilities?pageNumber=1&pageSize=10",
    "/api/electrical-management/facilities/a%2Fb",
    "/api/electrical-management/monitoring/devices/dev%2F1/realtime-properties",
  ]);
});
test("拓扑与线损不改写大小写敏感路径", async () => {
  const f = fixture(),
    c = createElectricalSafetyClient(f.http);
  await c.loadGraph();
  await c.loadLineGraph();
  await c.getOrUpdate();
  expect(f.calls.map((x) => x.url)).toEqual([
    "/api/securitymanagement/electricity-supply/detail",
    "/api/securitymanagement/lineLoss/supply/detail",
    "/api/securitymanagement/lineloss/collectConfig/detail",
  ]);
});
test("线损抄表保留设备集合参数", async () => {
  const f = fixture(),
    c = createElectricalSafetyClient(f.http);
  await c.getSecurityDevicePage({ pageNumber: 1, pageSize: 10, startTime: "2026-09-01", endTime: "2026-09-20", deviceIdSet: ["a", "b"] });
  expect(new URL(f.calls[0].url, "http://local").searchParams.get("deviceIdSet")).toBe("a,b");
});
test("绑定资源允许 404，其他错误不能吞掉", async () => {
  const f = fixture();
  f.http.get = async () => {
    throw { status: 404 };
  };
  const c = createElectricalSafetyClient(f.http);
  expect(await c.getFacilityScadaBinding("1")).toBeNull();
  f.http.get = async () => {
    throw { httpStatus: 404 };
  };
  expect(await c.getFacilityScadaBinding("1")).toBeNull();
  f.http.get = async () => {
    throw new Error("服务异常");
  };
  await expect(c.getFacilityScadaBinding("1")).rejects.toThrow("服务异常");
});
