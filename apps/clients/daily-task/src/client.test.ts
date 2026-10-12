import { expect, test } from "bun:test";

import { CubeDailyTaskService } from "./client";

test("daily-task client sends plan requests through the direct API path", async () => {
  const urls: string[] = [];
  const http = {
    get: async (url: string) => {
      urls.push(url);
      return { records: [], total: 0 };
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  };

  const client = new CubeDailyTaskService(http);
  await client.getDailyPlanPage({
    dailyType: "DAILY_TASK",
    pageNumber: 1,
    pageSize: 10,
  });

  expect(urls).toEqual(["/api/daily-task/daily/plan/page?dailyType=DAILY_TASK&pageNumber=1&pageSize=10"]);
});
