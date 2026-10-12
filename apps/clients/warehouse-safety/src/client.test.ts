import { expect, test } from "bun:test";

import { createWarehouseSafetyClient } from "./client";

test("@g2-client/warehouse-safety maps every operation to its BFF route", async () => {
  const requests: Array<{ method: string; url: string; body?: unknown }> = [];
  const http = {
    get: async (url: string) => {
      requests.push({ method: "GET", url });
      return {};
    },
    post: async (url: string, body?: unknown) => {
      requests.push({ method: "POST", url, body });
      return {};
    },
    put: async (url: string, body?: unknown) => {
      requests.push({ method: "PUT", url, body });
      return {};
    },
    delete: async (url: string) => {
      requests.push({ method: "DELETE", url });
      return {};
    },
  };
  const api = createWarehouseSafetyClient(http);
  const page = { pageNumber: 2, pageSize: 20, keyword: "A B" };
  const payload = { code: "W-01", name: "一号仓" };

  await api.pageWarehouses(page);
  await api.getWarehouseStatistics();
  await api.getWarehouse("仓/1");
  await api.createWarehouse(payload);
  await api.updateWarehouse("仓/1", payload);
  await api.deleteWarehouse("仓/1");

  await api.pageShelves(page);
  await api.getShelfStatistics();
  await api.getShelf(2);
  await api.createShelf({ name: "一号货架" });
  await api.updateShelf(2, { name: "二号货架" });
  await api.deleteShelf(2);

  await api.pageForklifts(page);
  await api.getForkliftStatistics();
  await api.getForklift(3);
  await api.createForklift(payload);
  await api.updateForklift(3, payload);
  await api.deleteForklift(3);

  await api.pageEvents(page);
  await api.getEvent(4);
  await api.listEventDevices(4);
  await api.pageDeviceOptions(page);
  await api.getAreaTree();

  expect(requests.map(({ method, url }) => `${method} ${url}`)).toEqual([
    "GET /gw-bff/warehouse-safety/warehouses?pageNumber=2&pageSize=20&keyword=A%20B",
    "GET /gw-bff/warehouse-safety/statistics/warehouses",
    "GET /gw-bff/warehouse-safety/warehouses/%E4%BB%93%2F1",
    "POST /gw-bff/warehouse-safety/warehouses",
    "PUT /gw-bff/warehouse-safety/warehouses/%E4%BB%93%2F1",
    "DELETE /gw-bff/warehouse-safety/warehouses/%E4%BB%93%2F1",
    "GET /gw-bff/warehouse-safety/shelves?pageNumber=2&pageSize=20&keyword=A%20B",
    "GET /gw-bff/warehouse-safety/statistics/shelves",
    "GET /gw-bff/warehouse-safety/shelves/2",
    "POST /gw-bff/warehouse-safety/shelves",
    "PUT /gw-bff/warehouse-safety/shelves/2",
    "DELETE /gw-bff/warehouse-safety/shelves/2",
    "GET /gw-bff/warehouse-safety/forklifts?pageNumber=2&pageSize=20&keyword=A%20B",
    "GET /gw-bff/warehouse-safety/statistics/forklifts",
    "GET /gw-bff/warehouse-safety/forklifts/3",
    "POST /gw-bff/warehouse-safety/forklifts",
    "PUT /gw-bff/warehouse-safety/forklifts/3",
    "DELETE /gw-bff/warehouse-safety/forklifts/3",
    "GET /gw-bff/warehouse-safety/events?pageNumber=2&pageSize=20&keyword=A%20B",
    "GET /gw-bff/warehouse-safety/events/4",
    "GET /gw-bff/warehouse-safety/events/4/devices",
    "GET /gw-bff/warehouse-safety/devices?pageNumber=2&pageSize=20&keyword=A%20B",
    "GET /gw-bff/warehouse-safety/areas/tree",
  ]);
  expect(requests.find(({ method }) => method === "POST")?.body).toEqual(payload);
});
