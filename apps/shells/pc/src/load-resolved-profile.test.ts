import { afterEach, describe, expect, mock, test } from "bun:test";

import { defaultProfileUrl, loadResolvedProfile } from "./load-resolved-profile";

describe("loadResolvedProfile", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("returns parsed profile on ok response", async () => {
    const profile = {
      facade: "pc" as const,
      env: "dev",
      client: [],
      platform: [],
      inline: [],
      remotes: [],
    };
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify(profile), { status: 200 }))) as unknown as typeof fetch;

    await expect(loadResolvedProfile("/compositions/dev.resolved.json")).resolves.toEqual(profile);
    expect(globalThis.fetch).toHaveBeenCalledWith("/compositions/dev.resolved.json", {
      cache: "no-store",
      credentials: "same-origin",
    });
  });

  test("throws on non-ok response", async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response("not found", { status: 404 }))) as unknown as typeof fetch;

    await expect(loadResolvedProfile("/compositions/missing.json")).rejects.toThrow(
      "failed to load resolved profile: 404 /compositions/missing.json",
    );
  });
});

describe("defaultProfileUrl", () => {
  test("falls back to the local dev resolved path when env unset", () => {
    expect(defaultProfileUrl()).toBe("/compositions/dev.resolved.json");
  });
});
