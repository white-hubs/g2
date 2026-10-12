import { createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("@g2-domain/daily-task install", () => {
  test("预装 pcUi 与 dailyTaskClient", async () => {
    const loaded: string[] = [];
    const runtimeLoaded: string[] = [];
    const ensured: string[] = [];
    const ctx = createFakeDomainContext({
      loadRuntimeCommon: async (name, exposedPath) => {
        runtimeLoaded.push(`${name}:${exposedPath}`);
        return {};
      },
      loadPlatform: async (name, exposedPath) => {
        loaded.push(`${name}:${exposedPath}`);
        return {};
      },
      ensureClient: async (name) => {
        ensured.push(name);
        return {};
      },
    });
    await domainModule.install?.(createFakeApp(), ctx, {});
    expect(runtimeLoaded).toEqual(["pcUi:index"]);
    expect(loaded).toEqual(["pcUi:platform"]);
    expect(ensured).toEqual(["dailyTaskClient"]);
  });
});
