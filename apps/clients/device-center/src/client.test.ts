import { describe, expect, test } from "bun:test";

import { createDeviceCenterClient } from "./client";

describe("@g2-client/device-center", () => {
  const httpStub = (urls: string[]) => ({
    get: async (url: string) => {
      urls.push(url);
      return {};
    },
    post: async (url: string) => {
      urls.push(url);
      return {};
    },
    put: async (url: string) => {
      urls.push(url);
      return {};
    },
    delete: async (url: string) => {
      urls.push(url);
      return {};
    },
  });

  test("configuration CRUD matches the legacy securitymanagement contract", async () => {
    const urls: string[] = [];
    const api = createDeviceCenterClient(httpStub(urls));
    await api.getConfiguration("ROTATINGMANAGE");
    await api.addConfiguration({ monitorName: "监测" });
    await api.editConfiguration("config-1", { monitorName: "监测2" });
    await api.deleteConfiguration("config-1");
    expect(urls[0]).toContain("/api/securitymanagement/getDeviceMonitor/ROTATINGMANAGE");
    expect(urls[1]).toBe("/api/securitymanagement/addDeviceMonitor");
    expect(urls[2]).toBe("/api/securitymanagement/updateDeviceMonitor/config-1");
    expect(urls[3]).toBe("/api/securitymanagement/deleteDeviceMonitor/config-1");
  });

  test("getIotDeviceList posts device-center instance page", async () => {
    const urls: string[] = [];
    const api = createDeviceCenterClient(httpStub(urls));
    await api.getIotDeviceList({ pageNumber: 1 });
    expect(urls[0]).toBe("/api/device-center/device/instance/page");
  });

  test("getDeviceMonitoringPage hits securitymanagement with applicationCode", async () => {
    const urls: string[] = [];
    const api = createDeviceCenterClient(httpStub(urls));
    await api.getDeviceMonitoringPage("DOORMANAGE", { pageNumber: 1, pageSize: 12 });
    expect(urls[0]).toContain("/api/securitymanagement/getDeviceMonitoringPage/DOORMANAGE");
    expect(urls[0]).toContain("applicationCode=DOORMANAGE");
    expect(urls[0]).not.toContain("/api/device/");
  });

  test("filter trees hit securitymanagement", async () => {
    const urls: string[] = [];
    const api = createDeviceCenterClient(httpStub(urls));
    await api.getAreaTree("DOORMANAGE");
    await api.getStatusList("DOORMANAGE");
    expect(urls[0]).toContain("/api/securitymanagement/getAreaTree/DOORMANAGE");
    expect(urls[1]).toContain("/api/securitymanagement/getStatusList/DOORMANAGE");
  });

  test("video monitor groups use the legacy-compatible device-center path", async () => {
    const urls: string[] = [];
    const api = createDeviceCenterClient(httpStub(urls));
    await api.getDeviceGroupDevicesAll("builtin.app::SECURITY_MONITORING");
    expect(urls[0]).toBe("/api/device-center/tags/builtin.app%3A%3ASECURITY_MONITORING/device-group-all");
  });

  test("alarm-rule cascade APIs match iot-center paths", async () => {
    const urls: string[] = [];
    const api = createDeviceCenterClient(httpStub(urls));
    await api.getIotProductCategoryTree();
    await api.getProductModelByCategory("door-leaf");
    await api.getDeviceCondition({ prodIds: "prod-1", withPropertySpec: true });
    await api.getCustomerTagListAll({ pageNumber: 1, pageSize: 100 });
    expect(urls[0]).toBe("/api/device-center/iot/product/category-tree");
    expect(urls[1]).toBe("/api/device-center/category/door-leaf/product/list");
    expect(urls[2]).toContain("/api/iot/north/product/prod-list-detail");
    expect(urls[2]).toContain("prodIds=prod-1");
    expect(urls[2]).toContain("withPropertySpec=true");
    expect(urls[3]).toContain("/api/device-center/tag/customer/list");
  });

  test("listProductBrands hits device-center prod-brand page", async () => {
    const urls: string[] = [];
    const api = createDeviceCenterClient(httpStub(urls));
    await api.listProductBrands({ pageNumber: 1, pageSize: 20, itemLabel: "海康" });
    expect(urls[0]).toContain("/api/device-center/base/prod-brand/page");
    expect(urls[0]).toContain("pageNumber=1");
    expect(urls[0]).toContain("pageSize=20");
    expect(urls[0]).toContain("itemLabel=");
  });

  test("detail APIs hit device-center / iot north", async () => {
    const urls: string[] = [];
    const api = createDeviceCenterClient(httpStub(urls));
    await api.getDeviceInfo("d1");
    await api.getDeviceAssociatedVideos("d1");
    await api.getDeviceIotDetail("d1");
    await api.getDeviceHistoryGroup({ deviceId: "d1", propCodes: "temp", startTs: 1, endTs: 2 });
    expect(urls[0]).toBe("/api/device-center/device/d1");
    expect(urls[1]).toContain("/api/device-center/device/associated/videos");
    expect(urls[1]).toContain("deviceId=d1");
    expect(urls[2]).toContain("/api/iot/north/device/detail");
    expect(urls[2]).toContain("withSnapShot=true");
    expect(urls[3]).toContain("/api/iot/north/device/prop/history-group");
  });

  test("getDeviceLogPage hits attribute change log page", async () => {
    const urls: string[] = [];
    const api = createDeviceCenterClient(httpStub(urls));
    await api.getDeviceLogPage({ deviceInstanceId: "d1", pageNumber: 1, pageSize: 10 });
    expect(urls[0]).toContain("/api/device-center/device/instance/attribute/change/log/page");
    expect(urls[0]).toContain("deviceInstanceId=d1");
    expect(urls[0]).toContain("pageNumber=1");
    expect(urls[0]).toContain("pageSize=10");
  });

  test("security device CRUD hits securitymanagement", async () => {
    const urls: string[] = [];
    const api = createDeviceCenterClient({
      get: async (url) => {
        urls.push(`GET ${url}`);
        return {};
      },
      post: async (url) => {
        urls.push(`POST ${url}`);
        return {};
      },
      put: async (url) => {
        urls.push(`PUT ${url}`);
        return {};
      },
      delete: async (url) => {
        urls.push(`DELETE ${url}`);
        return {};
      },
    });
    await api.getSecurityDevicePage("DOORMANAGE", { pageNumber: 1, pageSize: 10 });
    await api.addBatchSecurityDevice({ applicationCode: "DOORMANAGE", matchedDeviceIds: ["1"] });
    await api.deleteSecurityDevice("9");
    await api.deleteSecurityDeviceBatch(["1", "2"]);
    await api.clearSecurityDevice({ applicationCode: "DOORMANAGE", keyword: "" });
    expect(urls[0]).toContain("GET /api/securitymanagement/getSecurityDevicePage/DOORMANAGE");
    expect(urls[1]).toBe("POST /api/securitymanagement/add-security-device");
    expect(urls[2]).toBe("DELETE /api/securitymanagement/deleteSecurityDevice/9");
    expect(urls[3]).toContain("DELETE /api/securitymanagement/deleteSecurityDeviceBatch");
    expect(urls[4]).toBe("DELETE /api/securitymanagement/delete/condition/security-device");
  });

  test("equipment association APIs keep the legacy device-center payload shape", async () => {
    const urls: string[] = [];
    const api = createDeviceCenterClient(httpStub(urls));
    const rules = [[{ field: "PRODUCT", operator: "IN", value: ["product-1"] }]];
    await api.getTagRule("builtin.app::SECURITY_MONITORING");
    await api.saveTagRule({ code: "builtin.app::SECURITY_MONITORING", name: "安防监控", rules });
    await api.getEquipmentAssociationPage({ pageNumber: 1, pageSize: 20, rules });
    expect(urls[0]).toBe("/api/device-center/tag/rule/builtin.app%3A%3ASECURITY_MONITORING");
    expect(urls[1]).toBe("/api/device-center/tag/rule");
    expect(urls[2]).toBe("/api/device-center/device/instance/rule-condition/page");
  });
});
