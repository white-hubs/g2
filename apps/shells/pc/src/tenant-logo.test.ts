import * as loggerPlatformApi from "@g2-platform/logger/api";
import * as resourcePlatformApi from "@g2-platform/resource/api";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import { bindLibraryPlatformApisFromModules, configureStaticResourceBase } from "./library-platform-apis";
import { logoIdFromTenantInfo, logoUrlFromFileInfo, unwrapBusinessPayload } from "./tenant-logo";

beforeAll(() => {
  bindLibraryPlatformApisFromModules(loggerPlatformApi, resourcePlatformApi);
});

afterEach(() => {
  configureStaticResourceBase(undefined);
});

describe("tenant-logo helpers", () => {
  test("unwrapBusinessPayload 兼容 data 包一层", () => {
    expect(unwrapBusinessPayload({ code: 200, data: { logoId: "abc" } })).toEqual({ logoId: "abc" });
    expect(unwrapBusinessPayload({ logoId: "abc" })).toEqual({ logoId: "abc" });
  });

  test("logoIdFromTenantInfo", () => {
    expect(logoIdFromTenantInfo({ code: 200, data: { logoId: "file-1" } } as never)).toBe("file-1");
    expect(logoIdFromTenantInfo({})).toBe("");
  });

  test("logoUrlFromFileInfo 经静态资源前缀解析", () => {
    configureStaticResourceBase("https://r.kaiheai.com");
    expect(logoUrlFromFileInfo({ path: "/resource/v1/tenant/a.png" })).toBe("https://r.kaiheai.com/v1/tenant/a.png");
    expect(logoUrlFromFileInfo({ code: 200, data: { path: "/resource/v1/x.png" } } as never)).toBe("https://r.kaiheai.com/v1/x.png");
    expect(logoUrlFromFileInfo({ path: "null" })).toBe("");
  });
});
