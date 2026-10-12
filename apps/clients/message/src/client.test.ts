import { createFakePlatformContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { create, createMessageClient } from "./client";

interface FakeHttpResponses {
  get?: (url: string) => unknown;
  post?: (url: string) => unknown;
  put?: (url: string) => unknown;
}

function createFakeHttpClient(responses: FakeHttpResponses = {}): {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  calls: { method: string; url: string; body?: unknown }[];
} {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  return {
    calls,
    get: async (url: string) => {
      calls.push({ method: "GET", url });
      return responses.get?.(url);
    },
    post: async (url: string, body?: unknown) => {
      calls.push({ method: "POST", url, body });
      return responses.post?.(url);
    },
    put: async (url: string, body?: unknown) => {
      calls.push({ method: "PUT", url, body });
      return responses.put?.(url);
    },
  };
}

describe("createMessageClient", () => {
  describe("getMessageList", () => {
    test("GET /api/message2/msg-records，分页参数原样透传成 query string", async () => {
      const http = createFakeHttpClient({ get: () => ({ code: 200, data: { list: [], total: 0 } }) });
      const client = createMessageClient(http);
      const result = await client.getMessageList({ pageNo: 1, pageSize: 20 });
      expect(http.calls).toEqual([{ method: "GET", url: "/api/message2/msg-records?pageNo=1&pageSize=20" }]);
      expect(result).toEqual({ list: [], total: 0 });
    });

    test("参数里 undefined/null 被过滤，不拼进 query string", async () => {
      const http = createFakeHttpClient();
      const client = createMessageClient(http);
      await client.getMessageList({ pageNo: 1, keyword: undefined, channelType: null });
      expect(http.calls).toEqual([{ method: "GET", url: "/api/message2/msg-records?pageNo=1" }]);
    });

    test("数组参数按 key 重复出现，不带下标", async () => {
      const http = createFakeHttpClient();
      const client = createMessageClient(http);
      await client.getMessageList({ status: ["UNREAD", "READ"] });
      expect(http.calls).toEqual([{ method: "GET", url: "/api/message2/msg-records?status=UNREAD&status=READ" }]);
    });

    test("响应体 code 不是 200 时原样返回整个响应体", async () => {
      const http = createFakeHttpClient({ get: () => ({ code: 500, message: "boom" }) });
      const client = createMessageClient(http);
      const result = await client.getMessageList({});
      expect(result).toEqual({ code: 500, message: "boom" });
    });
  });

  describe("getUnreadCount", () => {
    test("传入 channelType 时拼进路径最后一段", async () => {
      const http = createFakeHttpClient({ get: () => ({ code: 200, data: 3 }) });
      const client = createMessageClient(http);
      const result = await client.getUnreadCount("CHANNEL_SITE");
      expect(http.calls).toEqual([{ method: "GET", url: "/api/message2/msg-record/un-read/total/CHANNEL_SITE" }]);
      expect(result).toBe(3);
    });

    test("不传 channelType 时省略该路径段", async () => {
      const http = createFakeHttpClient({ get: () => ({ code: 200, data: 0 }) });
      const client = createMessageClient(http);
      await client.getUnreadCount();
      expect(http.calls).toEqual([{ method: "GET", url: "/api/message2/msg-record/un-read/total" }]);
    });

    test("data 为 null 时归一化为 true", async () => {
      const http = createFakeHttpClient({ get: () => ({ code: 200, data: null }) });
      const client = createMessageClient(http);
      const result = await client.getUnreadCount();
      expect(result).toBe(true);
    });
  });

  describe("markAllAsRead", () => {
    test("PUT /api/message2/msg-record/read-all/CHANNEL_SITE", async () => {
      const http = createFakeHttpClient({ put: () => ({ code: 200, data: null }) });
      const client = createMessageClient(http);
      const result = await client.markAllAsRead();
      expect(http.calls).toEqual([{ method: "PUT", url: "/api/message2/msg-record/read-all/CHANNEL_SITE", body: undefined }]);
      expect(result).toBe(true);
    });
  });

  describe("markAsRead", () => {
    test("ids 用逗号拼接进 query string", async () => {
      const http = createFakeHttpClient({ put: () => ({ code: 200, data: null }) });
      const client = createMessageClient(http);
      await client.markAsRead(["id-1", "id-2"]);
      expect(http.calls).toEqual([{ method: "PUT", url: "/api/message2/msg-record/read-batch?ids=id-1,id-2", body: undefined }]);
    });

    test("单个 id 时也能正确拼接", async () => {
      const http = createFakeHttpClient();
      const client = createMessageClient(http);
      await client.markAsRead(["only-id"]);
      expect(http.calls).toEqual([{ method: "PUT", url: "/api/message2/msg-record/read-batch?ids=only-id", body: undefined }]);
    });
  });
});

describe("create(ctx)", () => {
  test("经 loadPlatform(httpPlatform) 构建 HttpClient 后返回业务 API", async () => {
    const http = createFakeHttpClient({ get: () => ({ code: 200, data: 1 }) });
    const ctx = createFakePlatformContext({
      loadPlatform: async (name, exposed) => {
        expect(name).toBe("httpPlatform");
        expect(exposed).toBe("client");
        return { createHttpClientForPlatform: () => http };
      },
    });
    const client = await create(ctx);
    const result = await client.getUnreadCount("CHANNEL_SITE");
    expect(result).toBe(1);
    expect(http.calls).toEqual([{ method: "GET", url: "/api/message2/msg-record/un-read/total/CHANNEL_SITE" }]);
  });
});

describe("duty scene configuration", () => {
  test("filters delivery channels by scene and persists the complete scene payload", async () => {
    const http = createFakeHttpClient({
      get: (url) =>
        url.endsWith("sat-msg-channels")
          ? [
              { channelCode: "SITE", channelName: "站内信" },
              { channelCode: "SMS", channelName: "短信" },
            ]
          : { channelCodes: ["SITE"] },
      post: () => "ok",
    });
    const client = createMessageClient(http);
    expect(await client.sceneNotificationMethod("SAFETY_PERSONNEL::DUTY_SCORE_LEVEL")).toEqual([{ label: "站内信", value: "SITE" }]);
    const payload = {
      businessType: "SAFETY_PERSONNEL_DUTY",
      sceneConfigDTOS: [{ sceneCode: "SAFETY_PERSONNEL::DUTY_DISPATCH_SIGN", value: "3", noticeWays: [{ noticeWay: "SITE" }] }],
    };
    await client.addMessageConfig(payload);
    expect(http.calls.at(-1)).toEqual({ method: "POST", url: "/api/bracing/message/addConfig", body: payload });
  });
});
