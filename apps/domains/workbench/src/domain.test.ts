import { createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("@g2-domain/workbench Runtime Common", () => {
  test("loads pcUi Runtime Common before platform initialization", async () => {
    const calls: string[] = [];
    const context = createFakeDomainContext({
      loadRuntimeCommon: async (name, entry) => {
        calls.push(`runtime:${name}:${entry}`);
        return {};
      },
      loadPlatform: async (name, entry) => {
        calls.push(`platform:${name}:${entry}`);
        return name === "resourcePlatform" ? { resolveStaticResourceUrl: (path: string) => path } : {};
      },
      ensureClient: async <T>(name: string): Promise<T> => {
        calls.push(`client:${name}`);
        return {} as T;
      },
    });

    await domainModule.install?.(createFakeApp(), context);

    expect(calls).toEqual(["runtime:pcUi:index", "platform:pcUi:platform", "platform:resourcePlatform:api", "client:workbenchClient"]);
  });
});
