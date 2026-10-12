import { describe, expect, test } from "bun:test";

import { createTodoCenterClient } from "./client";

describe("todo-center client", () => {
  test("reads the legacy todo statistics endpoint and unwraps the API envelope", async () => {
    const requested: string[] = [];
    const client = createTodoCenterClient({
      get: async (url) => {
        requested.push(url);
        return { code: 200, data: 7 };
      },
    });

    await expect(client.getTodoTaskCount()).resolves.toBe(7);
    expect(requested).toEqual(["/api/todo/todo-task-statistics"]);
  });

  test("preserves list filters and validates paginated records", async () => {
    const requested: string[] = [];
    const client = createTodoCenterClient({
      get: async (url) => {
        requested.push(url);
        return { data: { records: [], total: 0, pages: 0 } };
      },
    });

    await expect(
      client.pageTodoTasks({ pageNumber: 2, pageSize: 20, keyword: "巡检", period: "2026-10-01,2026-10-10", todoTagCode: "INSPECT" }),
    ).resolves.toEqual({ records: [], total: 0, pages: 0 });
    expect(requested[0]).toContain("/api/todo/todo-tasks?");
    expect(requested[0]).toContain("keyword=%E5%B7%A1%E6%A3%80");
    expect(requested[0]).toContain("period=2026-10-01%2C2026-10-10");
    expect(requested[0]).toContain("todoTagCode=INSPECT");
  });
});
