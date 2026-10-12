import { describe, expect, test } from "bun:test";

import { createMeetRoomClient } from "./client";

function recorder() {
  const calls: { body?: unknown; method: string; url: string }[] = [];
  const http = {
    get: async (url: string) => {
      calls.push({ method: "GET", url });
      return url.includes("page") || url.includes("appointment") || url.includes("getConferenceInfo") ? { records: [], total: 0 } : [];
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
  return { calls, client: createMeetRoomClient(http) };
}

describe("@g2-client/meet-room", () => {
  test("会议室列表和状态接口保持旧路径及参数", async () => {
    const { calls, client } = recorder();
    await client.pageConferenceRooms({ pageNumber: 2, pageSize: 20, name: "一号", areaName: "园区/A区" });
    await client.setConferenceRoomStatus("room/1", 0);
    expect(calls).toEqual([
      {
        method: "GET",
        url: "/api/conference/getConferenceInfo?pageNumber=2&pageSize=20&name=%E4%B8%80%E5%8F%B7&areaName=%E5%9B%AD%E5%8C%BA%2FA%E5%8C%BA",
      },
      { method: "PUT", url: "/api/conference/conference/room%2F1?status=0" },
    ]);
  });

  test("预约网格、记录、详情与取消使用旧会议服务路径", async () => {
    const { calls, client } = recorder();
    const query = { pageNumber: 1, pageSize: 10, keyword: "会议室", date: "2026-09-30" };
    await client.pageAppointmentRooms(query);
    await client.pageAppointmentRecords({ ...query, status: "APPOINTMENT" });
    await client.getBookRoom("book/1");
    await client.cancelBookRoom("book/1", "计划调整");
    expect(calls.map((item) => `${item.method} ${item.url}`)).toEqual([
      "GET /api/conference/appointment?pageNumber=1&pageSize=10&keyword=%E4%BC%9A%E8%AE%AE%E5%AE%A4&date=2026-09-30",
      "GET /api/conference/book-room/appointmentPage?pageNumber=1&pageSize=10&keyword=%E4%BC%9A%E8%AE%AE%E5%AE%A4&date=2026-09-30&status=APPOINTMENT",
      "GET /api/conference/bookroom/book%2F1",
      "DELETE /api/conference/book-room-cancel/book%2F1?isCancel=true&cancelReason=%E8%AE%A1%E5%88%92%E8%B0%83%E6%95%B4",
    ]);
  });

  test("业务设置与会议屏接口完整保留", async () => {
    const { calls, client } = recorder();
    await client.pageConferenceGoods({ pageNumber: 1, pageSize: 10, goodsName: "投影仪" });
    await client.pageConferenceTypes({ pageNumber: 1, pageSize: 10, keyword: "周会" });
    await client.pageRoomTypes({ pageNumber: 1, pageSize: 10, status: true });
    await client.listFieldConfigurations({ pageNumber: 1, pageSize: 100, fieldName: "会议" });
    await client.listRoomScreenConfigs({ keyword: "大屏" });
    expect(calls.map((item) => item.url)).toEqual([
      "/api/conference/conference-goods/page?pageNumber=1&pageSize=10&goodsName=%E6%8A%95%E5%BD%B1%E4%BB%AA",
      "/api/conference/conference-type-page?pageNumber=1&pageSize=10&keyword=%E5%91%A8%E4%BC%9A",
      "/api/conference/conference-room/type/conference-type-page?pageNumber=1&pageSize=10&status=true",
      "/api/conference/required/field/configuration?pageNumber=1&pageSize=100&fieldName=%E4%BC%9A%E8%AE%AE",
      "/api/conference/room/screen/config/list?keyword=%E5%A4%A7%E5%B1%8F",
    ]);
  });
});
