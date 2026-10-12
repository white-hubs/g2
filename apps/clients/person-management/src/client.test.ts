import { describe, expect, test } from "bun:test";

import { type HttpClient, createPersonManagementClient } from "./client";

interface Call {
  method: string;
  url: string;
  body?: unknown;
  init?: RequestInit;
}

function recorder(response?: unknown) {
  const result = response === undefined ? { code: 200, data: { records: [], total: 0, pages: 0 } } : response;
  const calls: Call[] = [];
  const http: HttpClient = {
    get: async (url, init) => {
      calls.push({ method: "GET", url, init });
      return result;
    },
    post: async (url, body, init) => {
      calls.push({ method: "POST", url, body, init });
      return result;
    },
    put: async (url, body, init) => {
      calls.push({ method: "PUT", url, body, init });
      return result;
    },
    delete: async (url, init) => {
      calls.push({ method: "DELETE", url, init });
      return result;
    },
  };
  return { calls, client: createPersonManagementClient(http) };
}

describe("person-management client", () => {
  test("uses legacy staff paging names and G2 API prefix", async () => {
    const { calls, client } = recorder();
    await client.pageStaff({ pageNumber: 2, pageSize: 20, keyword: "张三", organizationId: "dep-1", archiveStatus: "PERFECTED" });
    expect(calls[0]?.url).toBe(
      "/api/personnel/staff/page?pageNumber=2&pageSize=20&keyword=%E5%BC%A0%E4%B8%89&organizationId=dep-1&archiveStatus=PERFECTED",
    );
  });

  test("requests staff detail with legacy id query and encryption header", async () => {
    const { calls, client } = recorder({ code: 200, data: { id: "a/b", name: "张三" } });
    expect(await client.getStaff("a/b", false)).toMatchObject({ id: "a/b", name: "张三" });
    expect(calls[0]).toEqual({
      method: "GET",
      url: "/api/personnel/staff/a%2Fb?id=a%2Fb",
      init: { headers: { encryption: "false" } },
    });
  });

  test("keeps the personnel category SDK endpoints and request bodies", async () => {
    const { calls, client } = recorder();
    await client.pagePersonnelCategories({ pageNumber: 1, pageSize: 10, name: "正式" });
    await client.savePersonnelCategory({ id: "cat-1", name: "正式", remark: "正式职工" });
    await client.deletePersonnelCategory("cat/1");
    expect(calls.map(({ method, url }) => `${method} ${url}`)).toEqual([
      "GET /api/personnel/staff-type/page?pageNumber=1&pageSize=10&name=%E6%AD%A3%E5%BC%8F",
      "POST /api/personnel/staff-type/save-or-update",
      "DELETE /api/personnel/staff-type/delete?id=cat%2F1",
    ]);
    expect(calls[1]?.body).toEqual({ id: "cat-1", name: "正式", remark: "正式职工" });
  });

  test("preserves statistics type, period, detail id, and Blob export", async () => {
    const file = new Blob(["xlsx"]);
    const calls: Call[] = [];
    const http: HttpClient = {
      get: async (url) => {
        calls.push({ method: "GET", url });
        return { code: 200, data: { records: [], total: 0, pages: 0 } };
      },
      post: async (url, body) => {
        calls.push({ method: "POST", url, body });
        return file;
      },
      put: async () => ({}),
      delete: async () => ({}),
    };
    const client = createPersonManagementClient(http);
    await client.getPersonnelStatistics("probation-assess", { period: "2026-01-01,2026-02-01", pageNumber: 1, pageSize: 10 });
    await client.getPersonnelStatisticsDetail("probation-assess", "a/b", { period: "2026-01-01,2026-02-01", pageNumber: 2, pageSize: 20 });
    expect(await client.exportPersonnelStatistics("probation-assess", { period: "2026-01-01,2026-02-01" })).toBe(file);
    expect(calls.map(({ method, url }) => `${method} ${url}`)).toEqual([
      "GET /api/personnel/statistics/probation-assess?period=2026-01-01%2C2026-02-01&pageNumber=1&pageSize=10",
      "GET /api/personnel/statistics/probation-assess/detail/a%2Fb?period=2026-01-01%2C2026-02-01&pageNumber=2&pageSize=20",
      "POST /api/personnel/statistics/probation-assess/export",
    ]);
    expect(calls[2]?.body).toEqual({ period: "2026-01-01,2026-02-01" });
  });

  test("uses form flow and FIELD_CONFIG dictionary paths", async () => {
    const { calls, client } = recorder({ code: 200, data: [] });
    await client.listApprovalTypes();
    await client.listFlowFormFields("PERSONNEL_RECRUIT");
    await client.getDictionaryByItem({ itemCode: "FIELD_CONFIG", code: "roster" });
    await client.getDictionaryItemByCode({ code: "FIELD_CONFIG" });
    expect(calls.map(({ method, url }) => `${method} ${url}`)).toEqual([
      "GET /api/personnel/approval/biz/type",
      "GET /api/personnel/approval/biz/form/field?type=PERSONNEL_RECRUIT",
      "GET /api/dictionary/getDataDictionaryByItem?itemCode=FIELD_CONFIG&code=roster",
      "GET /api/dictionary/getDictionaryItemByCode/FIELD_CONFIG",
    ]);
  });

  test("keeps approval paging filters and mobile permission payload", async () => {
    const calls: Call[] = [];
    const http: HttpClient = {
      get: async (url) => {
        calls.push({ method: "GET", url });
        return url.includes("/historical/page")
          ? { code: 200, data: { records: [], total: 0, pages: 0 } }
          : { code: 200, data: { consumePm: true, doorDeviceList: [], parkingInfos: [] } };
      },
      post: async (url, body) => {
        calls.push({ method: "POST", url, body });
        return { code: 200, data: true };
      },
      put: async () => ({}),
      delete: async () => ({}),
    };
    const client = createPersonManagementClient(http);
    await client.getFlowProcessPage({
      pageNumber: 2,
      pageSize: 15,
      type: "WAITING",
      businessType: "PERSONNEL_RECRUIT",
      status: "RUNNING",
      submitTime: "2026-09-01,2026-09-30",
    });
    expect(await client.getUserPermissionMobile("13800000000")).toEqual({ consumePm: true, doorDeviceList: [], parkingInfos: [] });
    const body = { mobile: "13800000000", consumePm: false, doorDeviceList: [], parkingInfos: [] };
    await client.updateUserPermissionMobile(body);
    expect(calls[0]?.url).toBe(
      "/api/flow/process/instance/historical/page?pageNumber=2&pageSize=15&type=WAITING&businessType=PERSONNEL_RECRUIT&status=RUNNING&submitTime=2026-09-01%2C2026-09-30",
    );
    expect(calls[1]?.url).toBe("/api/third-party/user/permission/mobile?mobile=13800000000");
    expect(calls[2]).toEqual({ method: "POST", url: "/api/third-party/user/permission/modify", body });
  });

  test("uses the original approval record list and GET export endpoints", async () => {
    const file = new Blob(["report"]);
    const calls: Call[] = [];
    const http: HttpClient = {
      get: async (url) => {
        calls.push({ method: "GET", url });
        return url.endsWith("/export?applicationCode=PERSONNELMANAGEMENT&status=FINISHED")
          ? file
          : { code: 200, data: { records: [], total: 0, pages: 0 } };
      },
      post: async () => ({}),
      put: async () => ({}),
      delete: async () => ({}),
    };
    const client = createPersonManagementClient(http);
    await client.pageApprovalRecords({
      pageNumber: 1,
      pageSize: 10,
      applicationCode: "PERSONNELMANAGEMENT",
      username: "张三",
      submitTime: "2026-09-01,2026-09-30",
    });
    expect(await client.exportApprovalRecords({ applicationCode: "PERSONNELMANAGEMENT", status: "FINISHED" })).toBe(file);
    expect(calls.map((call) => call.url)).toEqual([
      "/api/flow/process/instance/historical/allPage?pageNumber=1&pageSize=10&applicationCode=PERSONNELMANAGEMENT&username=%E5%BC%A0%E4%B8%89&submitTime=2026-09-01%2C2026-09-30",
      "/api/flow/process/instance/historical/export?applicationCode=PERSONNELMANAGEMENT&status=FINISHED",
    ]);
  });

  test("preserves tenant override for dictionary reads and writes", async () => {
    const { calls, client } = recorder({ code: 200, data: [] });
    await client.getDictionaryByItem({ itemCode: "FIELD_CONFIG", tenant: "tenant-2" });
    await client.createDataDictionary({ itemCode: "FIELD_CONFIG", code: "roster", tenant: "tenant-2" });
    await client.updateDataDictionary({ id: "entry-1", itemCode: "FIELD_CONFIG", name: "花名册", tenant: "tenant-2" });
    expect(calls.map((call) => call.init)).toEqual([
      { headers: { tenant: "tenant-2" } },
      { headers: { tenant: "tenant-2" } },
      { headers: { tenant: "tenant-2" } },
    ]);
    expect(calls[0]?.url).toContain("tenant=tenant-2");
  });

  test("uploads staff as multipart form and preserves export binary", async () => {
    const calls: Call[] = [];
    const file = new Blob(["roster"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const http: HttpClient = {
      get: async () => ({}),
      post: async (url, body) => {
        calls.push({ method: "POST", url, body });
        return url.endsWith("/import") ? { code: 200, data: [{ row: 2, column: 3, colName: "手机号", msg: "格式错误" }] } : file;
      },
      put: async () => ({}),
      delete: async () => ({}),
    };
    const client = createPersonManagementClient(http);
    expect(await client.importStaff(file)).toEqual([{ row: 2, column: 3, colName: "手机号", msg: "格式错误" }]);
    expect(calls[0]?.url).toBe("/api/personnel/staff/template/import");
    expect(calls[0]?.body).toBeInstanceOf(FormData);
    const uploadBody = calls[0]?.body;
    if (uploadBody instanceof FormData) {
      expect(uploadBody.get("file")).toBeInstanceOf(Blob);
    }
    expect(await client.exportStaffTemplate()).toBe(file);
    expect(calls[1]?.url).toBe("/api/personnel/staff/template/export");
  });

  test("surfaces API errors without mistaking business codes for envelopes", async () => {
    const raw = recorder({ id: "user-1", code: 58_197_260, name: "张三" });
    expect(await raw.client.getStaff("user-1")).toMatchObject({ code: 58_197_260, name: "张三" });
    const failed = recorder({ code: 500, data: null, message: "服务暂不可用" });
    await expect(failed.client.pageStaff({ pageNumber: 1, pageSize: 10 })).rejects.toThrow("服务暂不可用");
  });

  test("uses the original door and parking association endpoints", async () => {
    const { calls, client } = recorder({ code: 200, data: { records: [], total: 0, pages: 0 } });
    await client.pageDoorDevices({ pageNumber: 1, pageSize: 10, keyword: "一号门", doorArea: "zone-1", type: "door-1" });
    await client.pageParkingLots({ pageNumber: 2, pageSize: 10, keyword: "东门" });
    expect(calls[0]?.url).toBe(
      "/api/door/getDoorDevicePage?pageNumber=1&pageSize=10&keyword=%E4%B8%80%E5%8F%B7%E9%97%A8&doorArea=zone-1&type=door-1",
    );
    expect(calls[1]?.url).toBe("/api/park-management/parking-infos-page?pageNumber=2&pageSize=10&keyword=%E4%B8%9C%E9%97%A8");
  });
});
