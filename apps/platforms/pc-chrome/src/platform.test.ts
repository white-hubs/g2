import { assertPlatformModule, createFakePlatformContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { installPcChromePcUi } from "./pc-ui-runtime";
import { platformModule } from "./platform";

describe("pc-chrome platform module", () => {
  test("符合 PlatformModule 契约，暴露 topBar/sideMenu；不再暴露 chrome.tabs（原系统为子应用页面标题条）", () => {
    const result = assertPlatformModule(platformModule);
    expect(result.ok).toBe(true);
    expect(Object.keys(platformModule.slots ?? {})).toEqual(["chrome.topBar", "chrome.sideMenu"]);
  });

  test("loads pcUi Runtime Common through the Shell-provided runtime loader", async () => {
    const loaded: string[] = [];
    const context = createFakePlatformContext({
      loadRuntimeCommon: async (name, exposedPath) => {
        loaded.push(`runtime:${name}:${exposedPath}`);
        return { ConfigProvider: { config: () => undefined }, message: { error: () => undefined } };
      },
    });

    await installPcChromePcUi(context);

    expect(loaded).toEqual(["runtime:pcUi:index"]);
  });
});
