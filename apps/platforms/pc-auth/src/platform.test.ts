import { assertPlatformModule, createFakePlatformContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { installPcAuthPcUi } from "./pc-ui-runtime";
import { platformModule } from "./platform";

describe("pc-auth platform module", () => {
  test("符合 PlatformModule 契约，暴露 auth.login 与 auth.verifyAuth 两个 slot", () => {
    const result = assertPlatformModule(platformModule);
    expect(result.ok).toBe(true);
    expect(Object.keys(platformModule.slots ?? {})).toEqual(["auth.login", "auth.verifyAuth"]);
  });

  test("label 标识自己", () => {
    expect(platformModule.label).toBe("pc-auth");
  });

  test("从 Shell Runtime Common 加载 PC UI", async () => {
    const loaded: string[] = [];
    const context = createFakePlatformContext({
      loadRuntimeCommon: async <T>(name: string, exposedPath: string): Promise<T> => {
        loaded.push(`${name}:${exposedPath}`);
        return {} as T;
      },
    });

    await installPcAuthPcUi(context);

    expect(loaded).toEqual(["pcUi:index"]);
  });
});
