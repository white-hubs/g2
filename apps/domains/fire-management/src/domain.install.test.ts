import { createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";
import { APPLICATION_CODE_KEY, DOMAIN_CONTEXT_KEY } from "./domain-context";

describe("@g2-domain/fire-management install", () => {
  test("loads pcUi/pcPlayer and provides DomainContext + applicationCode", async () => {
    const loaded: string[] = [];
    const ensured: string[] = [];
    const provided: Array<[unknown, unknown]> = [];
    const ctx = createFakeDomainContext({
      loadRuntimeCommon: async (name: string, exposedPath: string) => {
        loaded.push(`runtime:${name}:${exposedPath}`);
        return {};
      },
      loadPlatform: async (name: string, exposedPath: string) => {
        loaded.push(`${name}:${exposedPath}`);
        return {};
      },
      ensureClient: async (name: string) => {
        ensured.push(name);
        return {};
      },
    });
    const app = createFakeApp();
    app.provide = ((key: unknown, value: unknown) => {
      provided.push([key, value]);
    }) as typeof app.provide;

    await domainModule.install?.(app, ctx, { applicationCode: "FIRECONTROL" });
    expect(loaded).toEqual(["runtime:pcUi:index", "pcUi:platform", "pcPlayer:platform"]);
    expect(ensured).toEqual(["fireManagementClient"]);
    expect(provided.some(([k, v]) => k === DOMAIN_CONTEXT_KEY && v === ctx)).toBe(true);
    expect(provided.some(([k, v]) => k === APPLICATION_CODE_KEY && v === "FIRECONTROL")).toBe(true);
  });
});
