import { describe, expect, test } from "bun:test";

import { bindLibraryPlatformApis, configureStaticResourceBase, createLogger, resolveStaticResourceUrl } from "./library-platform-apis";

describe("bindLibraryPlatformApis", () => {
  test("经 loadPlatform 绑定后，壳侧可创建 logger 并配置静态资源前缀（非 workspace 静态依赖）", async () => {
    const loaded: string[] = [];
    await bindLibraryPlatformApis(async (platformName, exposedPath) => {
      loaded.push(`${platformName}:${exposedPath}`);
      if (platformName === "loggerPlatform" && exposedPath === "api") {
        return {
          createLogger: (scope: string) => ({
            debug: () => undefined,
            info: () => undefined,
            warn: () => undefined,
            error: () => undefined,
            scope,
          }),
        };
      }
      if (platformName === "resourcePlatform" && exposedPath === "api") {
        let configuredBase: string | undefined;
        return {
          configureStaticResourceBase: (base: string | undefined) => {
            configuredBase = base;
          },
          resolveStaticResourceUrl: (path: string) => (configuredBase ? `bound:${path}` : path),
          BIMOPS_AI_ENTRY_ICON: "/i.png",
          BIMOPS_CUBE_ICON: "/c.png",
          BIMOPS_ICON_SEARCH: "/s.png",
          BIMOPS_ICON_SKIN: "/k.png",
          bimopsAppIconPath: (code: string) => `/a/${code}`,
        };
      }
      throw new Error(`unexpected ${platformName}/${exposedPath}`);
    });

    expect(loaded).toEqual(["loggerPlatform:api", "resourcePlatform:api"]);
    const logger = createLogger("shell-test");
    expect(typeof logger.info).toBe("function");
    configureStaticResourceBase("https://cdn.example");
    expect(resolveStaticResourceUrl("/resource/x")).toBe("bound:/resource/x");
  });
});
