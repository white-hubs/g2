import { afterEach, describe, expect, test } from "bun:test";

import { STATIC_RESOURCE_PATH_PREFIX, configureStaticResourceBase, resolveStaticResourceUrl } from "./resolve-static-resource-url";

afterEach(() => {
  configureStaticResourceBase(undefined);
});

describe("resolveStaticResourceUrl", () => {
  test("未配置 base 时 /resource 路径原样返回（同源 / 代理）", () => {
    expect(resolveStaticResourceUrl("/resource/v1/foo.png")).toBe("/resource/v1/foo.png");
  });

  test("配置 base 后：/resource/* → {base}/*（剥掉 /resource 前缀）", () => {
    expect(resolveStaticResourceUrl("/resource/v1/bimops-fe-web-migrate/icons/image/icon-search.png", "https://r.kaiheai.com")).toBe(
      "https://r.kaiheai.com/v1/bimops-fe-web-migrate/icons/image/icon-search.png",
    );
    expect(resolveStaticResourceUrl("/resource/v1/foo.png", "https://r.kaiheai.com/")).toBe("https://r.kaiheai.com/v1/foo.png");
  });

  test("已是绝对 URL / data / blob 时不改写", () => {
    expect(resolveStaticResourceUrl("https://cdn.example.com/a.png", "https://r.kaiheai.com")).toBe("https://cdn.example.com/a.png");
    expect(resolveStaticResourceUrl("data:image/png;base64,xx", "https://r.kaiheai.com")).toBe("data:image/png;base64,xx");
    expect(resolveStaticResourceUrl("blob:http://localhost/1", "https://r.kaiheai.com")).toBe("blob:http://localhost/1");
  });

  test("非 /resource 相对路径不改写", () => {
    expect(resolveStaticResourceUrl("/api/ouaa/x", "https://r.kaiheai.com")).toBe("/api/ouaa/x");
    expect(resolveStaticResourceUrl("icons/a.png", "https://r.kaiheai.com")).toBe("icons/a.png");
  });

  test("空串 / 非法输入原样返回", () => {
    expect(resolveStaticResourceUrl("", "https://r.kaiheai.com")).toBe("");
  });

  test("configureStaticResourceBase 写入全局后，无第二参时使用该配置（跨 MF bundle 经 globalThis）", () => {
    configureStaticResourceBase("https://r.kaiheai.com");
    expect(resolveStaticResourceUrl("/resource/v1/x.png")).toBe("https://r.kaiheai.com/v1/x.png");
    configureStaticResourceBase("");
    expect(resolveStaticResourceUrl("/resource/v1/x.png")).toBe("/resource/v1/x.png");
  });

  test("STATIC_RESOURCE_PATH_PREFIX 固定为 /resource", () => {
    expect(STATIC_RESOURCE_PATH_PREFIX).toBe("/resource");
  });
});
