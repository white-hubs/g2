import { createFakeBus } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { MF_ROOT_TO_APPLICATION_EVENT, installMfRootToApplicationBridge } from "./mf-root-to-application-bridge";
import { NAVIGATE_INTENT_EVENT } from "./navigate-intent-handler";

describe("installMfRootToApplicationBridge", () => {
  test("cube 总线 mf-root-to-application 转发为 navigate-intent", () => {
    const bus = createFakeBus();
    const handlers = new Map<string, Set<(data: string) => void>>();
    const cubeBus = {
      publish: () => undefined,
      subscribe: (event: string, handler: (data: string) => void) => {
        if (!handlers.has(event)) {
          handlers.set(event, new Set());
        }
        handlers.get(event)!.add(handler);
      },
      unsubscribe: (event: string, handler: (data: string) => void) => {
        handlers.get(event)?.delete(handler);
      },
    };
    const targetWindow = {
      __CUBE_EVENT_BUS_INSTANCE__: cubeBus,
    } as unknown as Window;

    installMfRootToApplicationBridge(targetWindow, bus);

    const eventInfo = JSON.stringify({
      origin: "test",
      event: MF_ROOT_TO_APPLICATION_EVENT,
      data: { code: "hazard", path: "/ops/hazard-gov" },
    });
    for (const handler of handlers.get(MF_ROOT_TO_APPLICATION_EVENT) ?? []) {
      handler(eventInfo);
    }

    expect(bus.published).toEqual([
      {
        event: NAVIGATE_INTENT_EVENT,
        payload: { code: "hazard", path: "/ops/hazard-gov" },
      },
    ]);
  });

  test("页面无 cube 总线时会挂上兼容单例并完成转发", async () => {
    const bus = createFakeBus();
    const targetWindow = {} as Window;
    installMfRootToApplicationBridge(targetWindow, bus);

    const cubeBus = (targetWindow as Window & { __CUBE_EVENT_BUS_INSTANCE__?: { publish: (e: string, m: string) => void } })
      .__CUBE_EVENT_BUS_INSTANCE__;
    expect(cubeBus).toBeDefined();

    void cubeBus!.publish(
      MF_ROOT_TO_APPLICATION_EVENT,
      JSON.stringify({ origin: "wb", event: MF_ROOT_TO_APPLICATION_EVENT, data: { code: "hazard" } }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(bus.published).toEqual([
      {
        event: NAVIGATE_INTENT_EVENT,
        payload: { code: "hazard" },
      },
    ]);
  });
});
