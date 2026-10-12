import { assertPlatformModule, createFakePlatformContext } from "@g2-composition/contract";
import { setRuntimeCommonLoader } from "@g2-runtime/common-loader";
import { describe, expect, test } from "bun:test";

import { loadPcMapPcUi } from "./pc-ui-runtime";
import { platformModule } from "./platform-module";

describe("pc-map platform module", () => {
  test("lazy Runtime Common consumers load pcUi once without Platform.install", async () => {
    const loaded: string[] = [];
    const ui = { Button: {}, Input: {}, Modal: {}, Spin: {}, message: {} };
    setRuntimeCommonLoader(async (name, exposed) => {
      loaded.push(`${name}:${exposed}`);
      return ui;
    });
    const [first, second] = await Promise.all([loadPcMapPcUi(), loadPcMapPcUi()]);
    expect(first).toBe(ui);
    expect(second).toBe(ui);
    expect(await loadPcMapPcUi()).toBe(ui);
    expect(loaded).toEqual(["pcUi:index"]);
  });

  test("loads pcUi Runtime Common through the Shell-provided runtime loader", async () => {
    const loaded: string[] = [];
    const context = createFakePlatformContext({
      loadRuntimeCommon: async (name, exposedPath) => {
        loaded.push(`runtime:${name}:${exposedPath}`);
        return {
          Button: {},
          Input: {},
          Modal: {},
          Spin: {},
          message: { error: () => undefined, warning: () => undefined },
        };
      },
    });

    const result = assertPlatformModule(platformModule);
    expect(result.ok).toBe(true);
    await platformModule.install?.({} as never, {} as never, context);

    expect(loaded).toEqual(["runtime:pcUi:index"]);
  });
});
