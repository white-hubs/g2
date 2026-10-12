import { expect, test } from "bun:test";

import { createSecureEduClient } from "./client";

test("secure education client only calls the BFF and preserves query parameters", async () => {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const exportFile = new Blob(["xlsx"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const client = createSecureEduClient({
    get: async (url) => {
      calls.push({ method: "GET", url });
      return { records: [], total: 0 };
    },
    post: async (url, body) => {
      calls.push({ method: "POST", url, body });
      return url.includes("download=true") ? exportFile : undefined;
    },
    put: async (url, body) => {
      calls.push({ method: "PUT", url, body });
      return undefined;
    },
    delete: async (url) => {
      calls.push({ method: "DELETE", url });
      return undefined;
    },
  });

  await client.get("/api/safety-education/headquarters/cultivate-task/page", { pageNumber: 2, pageSize: 10, keyword: "安全 & 培训" });
  await client.put("/api/safety-education/exam-task/published/42", { id: "42" });
  expect(await client.download("/api/safety-education/headquarters/exam-user/records/export", { period: "4" })).toBe(exportFile);
  expect(client.downloadUrl("/api/safety-education/exam-question-bank/template")).toBe(
    "/gw-bff/secure-edu/api/safety-education/exam-question-bank/template",
  );
  expect(calls).toEqual([
    {
      method: "GET",
      url: "/gw-bff/secure-edu/api/safety-education/headquarters/cultivate-task/page?pageNumber=2&pageSize=10&keyword=%E5%AE%89%E5%85%A8%20%26%20%E5%9F%B9%E8%AE%AD",
    },
    { method: "PUT", url: "/gw-bff/secure-edu/api/safety-education/exam-task/published/42", body: { id: "42" } },
    {
      method: "POST",
      url: "/gw-bff/secure-edu/api/safety-education/headquarters/exam-user/records/export?download=true",
      body: { period: "4" },
    },
  ]);
});
