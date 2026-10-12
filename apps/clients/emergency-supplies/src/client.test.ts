import { expect, test } from "bun:test";

import { createEmergencySuppliesClient } from "./client";

interface RequestCall {
  method: string;
  url: string;
  body?: unknown;
}

function createFixture(): { calls: RequestCall[]; client: ReturnType<typeof createEmergencySuppliesClient> } {
  const calls: RequestCall[] = [];
  const http = {
    get: async (url: string) => {
      calls.push({ method: "GET", url });
      return {};
    },
    post: async (url: string, body?: unknown) => {
      calls.push({ method: "POST", url, body });
      return {};
    },
    put: async (url: string, body?: unknown) => {
      calls.push({ method: "PUT", url, body });
      return {};
    },
    delete: async (url: string) => {
      calls.push({ method: "DELETE", url });
      return {};
    },
  };
  return { calls, client: createEmergencySuppliesClient(http) };
}

test("分页查询保留旧接口的参数名和编码", async () => {
  const { calls, client } = createFixture();
  await client.getWarehousePage({ pageNumber: 2, pageSize: 20, keyword: "中心仓" });
  expect(calls[0]).toEqual({
    method: "GET",
    url: "/gw-bff/emergency-supplies/warehouses/page?pageNumber=2&pageSize=20&keyword=%E4%B8%AD%E5%BF%83%E4%BB%93",
  });
});

test("仓库和物资状态变更传递 status 查询参数", async () => {
  const { calls, client } = createFixture();
  await client.changeWarehouseStatus("warehouse/1", false);
  await client.changeSuppliesStatus("supplies/1", "SCRAPPED");
  expect(calls).toEqual([
    { method: "PUT", url: "/gw-bff/emergency-supplies/warehouses/warehouse%2F1/status?status=false", body: undefined },
    { method: "PUT", url: "/gw-bff/emergency-supplies/supplies/supplies%2F1/status?status=SCRAPPED", body: undefined },
  ]);
});

test("出库确认和预警配置完整传递请求体", async () => {
  const { calls, client } = createFixture();
  const outbound = { quantity: 3, outboundTime: "2026-09-20 10:00", remark: "演练" };
  const warning = [{ warningType: "EXPIRY", enabled: true, yellowDays: 90 }];
  await client.confirmDispatchOutbound("order-1", outbound);
  await client.updateWarningConfig(warning);
  expect(calls).toEqual([
    { method: "PUT", url: "/gw-bff/emergency-supplies/dispatch-orders/order-1/confirm-outbound", body: outbound },
    { method: "PUT", url: "/gw-bff/emergency-supplies/warning-config", body: warning },
  ]);
});

test("物资导入按旧接口上传 multipart 文件", async () => {
  const { calls, client } = createFixture();
  const file = new File(["ledger"], "物资.xlsx");
  await client.importSuppliesLedger(file);
  expect(calls[0]?.method).toBe("POST");
  expect(calls[0]?.url).toBe("/api/emergency/emergency-supplies/import");
  const body = calls[0]?.body;
  expect(body).toBeInstanceOf(FormData);
  if (!(body instanceof FormData)) {
    throw new Error("导入请求体必须是 FormData");
  }
  const uploaded = body.get("file");
  expect(uploaded).toBeInstanceOf(File);
  expect((uploaded as File).name).toBe("物资.xlsx");
});
