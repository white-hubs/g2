import { describe, expect, test } from "bun:test";

import { checkRuntimeRemote } from "./remote-check";

const manifest = {
  metaData: { remoteEntry: { name: "remoteEntry.js", path: "" } },
  shared: [],
  remotes: [],
  exposes: [
    { name: "info", path: "./info", assets: { js: { sync: ["assets/info-a1b2c3.js"] }, css: { sync: [] } } },
    { name: "index", path: "./index", assets: { js: { sync: ["assets/index-d4e5f6.js"] }, css: { sync: ["assets/index-123abc.css"] } } },
  ],
};

function createFetcher(overrides: { cors?: string; cache?: string; missing?: string } = {}): typeof fetch {
  const manifestUrl = "https://cdn.example.test/pcUi/2026.09.28.1/mf-manifest.json";
  const infoUrl = new URL("assets/info-a1b2c3.js", manifestUrl).toString();
  const bodies = new Map([
    [manifestUrl, JSON.stringify(manifest)],
    [infoUrl, "var e=`2026.09.28.1`,t=`1.4.0`,n={};export{t as apiVersion,n as compatibility,e as runtimeVersion};"],
  ]);
  return async (input) => {
    const url = String(input);
    if (overrides.missing === url) return new Response("missing", { status: 404 });
    const contentType = url.endsWith(".json") ? "application/json" : url.endsWith(".css") ? "text/css" : "text/javascript";
    const defaultCache = url.endsWith("mf-manifest.json")
      ? "no-cache"
      : url.endsWith("remoteEntry.js")
        ? "public, max-age=300"
        : "public, max-age=31536000, immutable";
    const headers = new Headers({
      "access-control-allow-origin": overrides.cors ?? "http://shell.example.test",
      "cache-control": overrides.cache ?? defaultCache,
      "content-type": contentType,
    });
    return new Response(bodies.get(url) ?? "/* chunk */", { status: 200, headers });
  };
}

describe("checkRuntimeRemote", () => {
  test("accepts revalidated manifests and short-cached remote entries while requiring immutable content assets", async () => {
    const baseFetcher = createFetcher();
    const fetcher: typeof fetch = async (input, init) => {
      const response = await baseFetcher(input, init);
      const url = String(input);
      const headers = new Headers(response.headers);
      if (url.endsWith("mf-manifest.json")) headers.set("cache-control", "no-cache");
      else if (url.endsWith("remoteEntry.js")) headers.set("cache-control", "public, max-age=300");
      return new Response(await response.text(), { status: response.status, headers });
    };

    await expect(
      checkRuntimeRemote({
        manifestUrl: "https://cdn.example.test/pcUi/2026.09.28.1/mf-manifest.json",
        origin: "http://shell.example.test",
        requireImmutable: true,
        fetcher,
      }),
    ).resolves.toMatchObject({ runtimeVersion: "2026.09.28.1", apiVersion: "1.4.0", resourcesChecked: 5 });
  });

  test("validates manifest, info versions, all chunks, CORS and immutable cache headers", async () => {
    const result = await checkRuntimeRemote({
      manifestUrl: "https://cdn.example.test/pcUi/2026.09.28.1/mf-manifest.json",
      origin: "http://shell.example.test/path",
      expectedRuntimeVersion: "2026.09.28.1",
      expectedApiVersion: "1.x",
      requireImmutable: true,
      fetcher: createFetcher(),
    });

    expect(result).toEqual({
      manifestUrl: "https://cdn.example.test/pcUi/2026.09.28.1/mf-manifest.json",
      runtimeVersion: "2026.09.28.1",
      apiVersion: "1.4.0",
      resourcesChecked: 5,
    });
  });

  test("rejects version drift against the requested runtime pointer", async () => {
    await expect(
      checkRuntimeRemote({
        manifestUrl: "https://cdn.example.test/pcUi/2026.09.28.1/mf-manifest.json",
        origin: "http://shell.example.test",
        expectedRuntimeVersion: "2026.09.28.2",
        fetcher: createFetcher(),
      }),
    ).rejects.toThrow(/runtimeVersion 应为/);
    await expect(
      checkRuntimeRemote({
        manifestUrl: "https://cdn.example.test/pcUi/2026.09.28.1/mf-manifest.json",
        origin: "http://shell.example.test",
        expectedApiVersion: "2.x",
        fetcher: createFetcher(),
      }),
    ).rejects.toThrow(/apiVersion 1.4.0 不满足 2.x/);
  });

  test("rejects missing CORS headers, short cache lifetime and unavailable chunks", async () => {
    const options = {
      manifestUrl: "https://cdn.example.test/pcUi/2026.09.28.1/mf-manifest.json",
      origin: "http://shell.example.test",
    };
    await expect(checkRuntimeRemote({ ...options, fetcher: createFetcher({ cors: "https://other.example.test" }) })).rejects.toThrow(
      /Access-Control-Allow-Origin/,
    );
    await expect(checkRuntimeRemote({ ...options, fetcher: createFetcher({ cache: "public, max-age=60" }) })).rejects.toThrow(/max-age/);
    await expect(checkRuntimeRemote({ ...options, fetcher: createFetcher({ cache: "no-cache" }) })).rejects.toThrow(/content-hash/);
    await expect(checkRuntimeRemote({ ...options, fetcher: createFetcher({ cache: "public, max-age=301" }) })).rejects.toThrow(
      /不超过 300 秒/,
    );
    await expect(
      checkRuntimeRemote({
        ...options,
        fetcher: createFetcher({ missing: "https://cdn.example.test/pcUi/2026.09.28.1/assets/index-d4e5f6.js" }),
      }),
    ).rejects.toThrow(/HTTP 404/);
  });
});
