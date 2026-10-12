import { describe, expect, test } from "bun:test";

import { createTechnicalBulletinClient } from "./client";

function recorder() {
  const calls: { body?: unknown; method: string; url: string }[] = [];
  const http = {
    get: async (url: string) => {
      calls.push({ method: "GET", url });
      return url.includes("/announcement/") ? { id: "n-1" } : { records: [], total: 0, pages: 0 };
    },
    post: async (url: string, body?: unknown) => {
      calls.push({ body, method: "POST", url });
      return true;
    },
    put: async (url: string, body?: unknown) => {
      calls.push({ body, method: "PUT", url });
      return true;
    },
    delete: async (url: string) => {
      calls.push({ method: "DELETE", url });
      return true;
    },
  };
  return { calls, client: createTechnicalBulletinClient(http) };
}

describe("@g2-client/technical-bulletin", () => {
  test("公告列表沿用后端真实 GET 分页接口和旧参数名", async () => {
    const { calls, client } = recorder();
    await client.pageAnnouncements({
      pageNumber: 2,
      pageSize: 20,
      keyword: "安全通知",
      type: "type-1",
      status: "DISPLAY",
      period: "2026-09-01,2026-09-29",
    });
    expect(calls).toEqual([
      {
        method: "GET",
        url: "/api/management/announcement/page?pageNumber=2&pageSize=20&keyword=%E5%AE%89%E5%85%A8%E9%80%9A%E7%9F%A5&type=type-1&status=DISPLAY&period=2026-09-01%2C2026-09-29",
      },
    ]);
  });

  test("公告删除、批量删除、显隐置顶使用 bulletin service 当前契约", async () => {
    const { calls, client } = recorder();
    await client.deleteAnnouncement("notice/1");
    await client.deleteAnnouncements(["n-1", "n-2"]);
    await client.updateVisibility([{ id: "n-1", isTopping: true, status: "DISPLAY" }]);
    expect(calls).toEqual([
      { method: "DELETE", url: "/api/management/announcement/notice%2F1" },
      { method: "DELETE", url: "/api/management/announcement/bath?ids=n-1%2Cn-2" },
      {
        body: [{ id: "n-1", isTopping: true, status: "DISPLAY" }],
        method: "POST",
        url: "/api/management/announcement/update/hide-top",
      },
    ]);
  });

  test("配置与通知人员接口完整保留旧服务路径", async () => {
    const { calls, client } = recorder();
    await client.listNoticeTypes({ keyword: "制度" });
    await client.createModelType({ modelType: "ANNOUNCEMENT_TAG", typeName: "重要" });
    await client.updateModelType("label/1", { modelType: "ANNOUNCEMENT_TAG", typeName: "紧急" });
    await client.deleteModelType("label/1");
    await client.listDepartments({ pageNumber: 1, pageSize: 10, name: "安全部" });
    await client.pageUsers({ pageNumber: 1, pageSize: 10, keyword: "张三" });
    await client.listDeliveryRecords("bulletin/1");
    expect(calls.map((item) => `${item.method} ${item.url}`)).toEqual([
      "GET /api/management/getList/ANNOUNCEMENT?keyword=%E5%88%B6%E5%BA%A6",
      "POST /api/management/addModelTypeCommand",
      "PUT /api/management/updateModelTypeCommand/label%2F1",
      "DELETE /api/management/removeModelType/label%2F1",
      "GET /api/ouaa/authenticated/organizations/list?pageNumber=1&pageSize=10&name=%E5%AE%89%E5%85%A8%E9%83%A8",
      "GET /api/ouaa/authenticated/user-under-tenant/page?pageNumber=1&pageSize=10&keyword=%E5%BC%A0%E4%B8%89&enable=true",
      "GET /api/message2/msg-record/targets/bulletin%2F1",
    ]);
  });
});
