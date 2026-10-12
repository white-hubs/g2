import { expect, test } from "bun:test";

import { createSafetyPersonnelClient } from "./client";

test("@g2-client/safety-personnel pageCertificates hits expected path", async () => {
  const urls: string[] = [];
  const http = {
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
  };
  const api = createSafetyPersonnelClient(http);
  await (api.pageCertificates as (...a: unknown[]) => Promise<unknown>)("");
  expect(urls.some((u) => u.includes("/gw-bff/safety-personnel/certificates"))).toBe(true);
});

test("key personnel report query keeps person id in path and pagination in query", async () => {
  const urls: string[] = [];
  const http = {
    get: async (url: string) => {
      urls.push(url);
      return {};
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  };
  const client = createSafetyPersonnelClient(http);
  await client.pageKeyPersonReports({ personId: 8, pageNumber: 2, pageSize: 20, "period.begin": "2026-09-01" });
  expect(urls[0]).toBe("/gw-bff/safety-personnel/key-personnel/persons/8/reports?pageNumber=2&pageSize=20&period.begin=2026-09-01");
});

test("resume filters and export body are preserved, including empty optional queries", async () => {
  const gets: string[] = [];
  const posts: { url: string; body: unknown }[] = [];
  const client = createSafetyPersonnelClient({
    get: async (url) => {
      gets.push(url);
      return [];
    },
    post: async (url, body) => {
      posts.push({ url, body });
      return new Blob(["export"]);
    },
    put: async () => ({}),
    delete: async () => ({}),
  });
  const query = { startDate: "2026-09-01", endDate: "2026-09-21" };
  await client.getPersonResumeTimeline("p1", query);
  await client.getPersonResumeByType("p1", "alarm", query);
  await client.exportPersonResume("p1", query);
  expect(gets).toEqual([
    "/gw-bff/safety-personnel/persons/p1/resume/timeline?startDate=2026-09-01&endDate=2026-09-21",
    "/gw-bff/safety-personnel/persons/p1/resume/alarm?startDate=2026-09-01&endDate=2026-09-21",
  ]);
  expect(posts[0]).toEqual({ url: "/gw-bff/safety-personnel/persons/p1/resume/export", body: query });
  await client.getPersonResumeTimeline("p1");
  expect(gets[2]).toBe("/gw-bff/safety-personnel/persons/p1/resume/timeline");
});

test("person, area and supervisor options retain encoded search keywords", async () => {
  const urls: string[] = [];
  const client = createSafetyPersonnelClient({
    get: async (url) => {
      urls.push(url);
      return [];
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  });
  await client.getKeyPersonOptions("张 & 李");
  await client.getKeyPersonAreaOptions("一号库");
  await client.getKeyPersonSupervisorOptions("监管员");
  expect(urls.map((url) => new URL(url, "http://localhost").searchParams.get("keyword"))).toEqual(["张 & 李", "一号库", "监管员"]);
});
