import { expect, test } from "bun:test";

import { createSecurityOpinionClient, type HttpClient } from "./client";

test("@g2-client/security-opinion pageOpinions hits expected path", async () => {
  const urls: string[] = [];
  const http: HttpClient = {
    get: async <T>(url: string) => {
      urls.push(url);
      return {} as T;
    },
    post: async <T>(url: string) => {
      urls.push(url);
      return {} as T;
    },
    put: async <T>(url: string) => {
      urls.push(url);
      return {} as T;
    },
    delete: async <T>(url: string) => {
      urls.push(url);
      return {} as T;
    },
  };
  const api = createSecurityOpinionClient(http);
  await (api.pageOpinions as (...a: unknown[]) => Promise<unknown>)("");
  expect(urls.some((u) => u.includes("/gw-bff/security-opinion/opinions"))).toBe(true);
});
