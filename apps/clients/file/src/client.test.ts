import { createFakePlatformContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { create, createFileClient } from "./client";

describe("createFileClient", () => {
  test("getFile GET /api/file/file/{id}", async () => {
    const urls: string[] = [];
    const client = createFileClient({
      post: async () => undefined,
      get: async (url) => {
        urls.push(url);
        return { path: "/resource/logo.png" };
      },
    });
    const result = await client.getFile("logo-1");
    expect(urls).toEqual(["/api/file/file/logo-1"]);
    expect(result).toEqual({ path: "/resource/logo.png" });
  });
});

describe("create(ctx)", () => {
  test("经 loadPlatform(httpPlatform) 后可 getFile", async () => {
    const urls: string[] = [];
    const ctx = createFakePlatformContext({
      loadPlatform: async (name, exposed) => {
        expect(name).toBe("httpPlatform");
        expect(exposed).toBe("client");
        return {
          createHttpClientForPlatform: () => ({
            get: async (url: string) => {
              urls.push(url);
              return { path: "/r/x" };
            },
          }),
        };
      },
    });
    const client = await create(ctx);
    await client.getFile("f2");
    expect(urls).toEqual(["/api/file/file/f2"]);
  });
});

test("scene attachment uses multipart and preserves temporary-upload policy", async () => {
  const calls: { url: string; body?: unknown }[] = [];
  const client = createFileClient({
    get: async () => ({}),
    post: async (url, body) => {
      calls.push({ url, body });
      return { id: "file-1", path: "/file.png" };
    },
  });
  const file = new Blob(["evidence"]);
  await client.uploadSceneFile({ file, businessKey: "maintain", sceneCode: "DUTY_RECORD", useTemporary: true });
  expect(calls[0].url).toBe("/api/file/upload/temporary");
  const form = calls[0].body as FormData;
  expect(form.get("sceneCode")).toBe("DUTY_RECORD");
  expect(form.get("businessKey")).toBe("maintain");
  expect(await (form.get("file") as Blob).text()).toBe("evidence");
  await client.uploadSceneFile({ file, businessKey: "maintain", sceneCode: "DUTY_RECORD" });
  expect(calls[1].url).toBe("/api/file/file");
  await client.persistSceneFiles("DUTY_RECORD", ["file-1"]);
  expect(calls[2]).toEqual({
    url: "/api/file/induce/single/body",
    body: { sceneCode: "DUTY_RECORD", fileIdList: ["file-1"] },
  });
});

test("business upload uses BFF multipart without losing bytes and rejects missing paths", async () => {
  const calls: { url: string; body?: unknown }[] = [];
  const client = createFileClient({
    get: async () => undefined,
    post: async (url, body) => {
      calls.push({ url, body });
      return { data: { id: "background", path: "/image.png" } };
    },
  });
  const file = new Blob([new Uint8Array([0, 255, 137])], { type: "image/png" });
  expect(await client.uploadBusinessFile({ file, businessKey: "mdata" })).toEqual({ id: "background", path: "/image.png" });
  expect(calls[0]?.url).toBe("/gw-bff/file/upload");
  const form = calls[0]?.body;
  expect(form instanceof FormData).toBe(true);
  if (!(form instanceof FormData)) throw new Error("multipart form expected");
  const uploaded = form.get("file");
  if (!(uploaded instanceof Blob)) throw new Error("blob expected");
  expect([...new Uint8Array(await uploaded.arrayBuffer())]).toEqual([0, 255, 137]);
  expect(form.get("businessKey")).toBe("mdata");
  const malformed = createFileClient({ get: async () => undefined, post: async () => ({ id: "file" }) });
  await expect(malformed.uploadBusinessFile({ file, businessKey: "mdata" })).rejects.toThrow("文件地址");
});
