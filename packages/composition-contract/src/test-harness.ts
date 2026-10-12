import type { App } from "vue";
import type { Router } from "vue-router";

import type { DomainContext, EventBus, PlatformContext } from "./types";

export interface FakeBus extends EventBus {
  published: { event: string; payload: unknown }[];
}

export function createFakeBus(): FakeBus {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  const published: FakeBus["published"] = [];
  return {
    published,
    publish(event, payload) {
      published.push({ event, payload });
      for (const handler of handlers.get(event) ?? []) {
        handler(payload);
      }
    },
    subscribe(event, handler) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler);
      return () => handlers.get(event)?.delete(handler);
    },
  };
}

export function createFakePlatformContext(overrides: Partial<PlatformContext> = {}): PlatformContext {
  return {
    bus: overrides.bus ?? createFakeBus(),
    getAuthHeaders: overrides.getAuthHeaders ?? (() => ({})),
    loadPlatform:
      overrides.loadPlatform ??
      (async () => {
        throw new Error("createFakePlatformContext: loadPlatform not stubbed for this test, pass an override");
      }),
    loadRuntimeCommon:
      overrides.loadRuntimeCommon ??
      (async () => {
        throw new Error("createFakePlatformContext: loadRuntimeCommon not stubbed for this test, pass an override");
      }),
    ensureClient:
      overrides.ensureClient ??
      (async () => {
        throw new Error("createFakePlatformContext: ensureClient not stubbed for this test, pass an override");
      }),
  };
}

export function createFakeDomainContext(overrides: Partial<DomainContext> = {}): DomainContext {
  const platform = createFakePlatformContext(overrides);
  return {
    ...platform,
    loadRuntimeCommon:
      overrides.loadRuntimeCommon ??
      (async () => {
        throw new Error("createFakeDomainContext: loadRuntimeCommon not stubbed for this test, pass an override");
      }),
    loadPageLibrary:
      overrides.loadPageLibrary ??
      (async () => {
        throw new Error("createFakeDomainContext: loadPageLibrary not stubbed for this test, pass an override");
      }),
    getFunctionCodes: overrides.getFunctionCodes ?? (() => new Set()),
  };
}

/** 极简 fake App，仅满足 install(app, router, ctx) 签名调用需要；不做真实 Vue 挂载。 */
export function createFakeApp(): App {
  return {
    use: () => undefined,
    provide: () => undefined,
    component: () => undefined,
    config: { globalProperties: {} },
  } as unknown as App;
}

export function createFakeRouter(): Router {
  const routes: unknown[] = [];
  return {
    addRoute: (route: unknown) => routes.push(route),
    removeRoute: () => undefined,
    beforeEach: () => () => undefined,
    push: async () => undefined,
  } as unknown as Router;
}
