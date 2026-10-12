import { describe, expect, test } from "bun:test";

import { WECHAT_APPID, buildWechatQrConnectUrl, shouldHandleWechatCallback } from "./wechat-login";

describe("buildWechatQrConnectUrl", () => {
  test("拼出的 URL 指向微信开放平台 qrconnect 端点，携带全部必要参数", () => {
    const url = buildWechatQrConnectUrl({
      appid: WECHAT_APPID,
      scope: "snsapi_login",
      redirectUri: "https://example.com/login",
      state: "STATE",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://open.weixin.qq.com/connect/qrconnect");
    expect(parsed.searchParams.get("appid")).toBe(WECHAT_APPID);
    expect(parsed.searchParams.get("scope")).toBe("snsapi_login");
    expect(parsed.searchParams.get("redirect_uri")).toBe("https://example.com/login");
    expect(parsed.searchParams.get("state")).toBe("STATE");
    expect(parsed.searchParams.get("login_type")).toBe("jssdk");
    expect(parsed.searchParams.get("style")).toBe("black");
    expect(parsed.searchParams.get("self_redirect")).toBe("default");
    expect(parsed.searchParams.get("stylelite")).toBe("1");
  });

  test("theme 参数可覆盖默认的 black", () => {
    const url = buildWechatQrConnectUrl({
      appid: WECHAT_APPID,
      scope: "snsapi_login",
      redirectUri: "https://example.com/login",
      state: "STATE",
      theme: "white",
    });
    expect(new URL(url).searchParams.get("style")).toBe("white");
  });

  test("redirect_uri 含查询参数/特殊字符时会被正确编码", () => {
    const url = buildWechatQrConnectUrl({
      appid: WECHAT_APPID,
      scope: "snsapi_login",
      redirectUri: "https://example.com/login?tokenId=abc&x=1",
      state: "STATE",
    });
    expect(url).toContain("redirect_uri=https%3A%2F%2Fexample.com%2Flogin%3FtokenId%3Dabc%26x%3D1");
    expect(new URL(url).searchParams.get("redirect_uri")).toBe("https://example.com/login?tokenId=abc&x=1");
  });
});

describe("shouldHandleWechatCallback", () => {
  test("有合法 code 且 state 匹配、且是新 code 时返回 true", () => {
    expect(shouldHandleWechatCallback({ code: "code-1", state: "STATE" }, "STATE", null)).toBe(true);
  });

  test("没有 code 时返回 false", () => {
    expect(shouldHandleWechatCallback({ code: null, state: "STATE" }, "STATE", null)).toBe(false);
    expect(shouldHandleWechatCallback({ code: "", state: "STATE" }, "STATE", null)).toBe(false);
  });

  test("state 不匹配时返回 false（防 CSRF）", () => {
    expect(shouldHandleWechatCallback({ code: "code-1", state: "OTHER" }, "STATE", null)).toBe(false);
  });

  test("code 与上次处理过的相同（如用户刷新页面）时返回 false，避免重复换 token", () => {
    expect(shouldHandleWechatCallback({ code: "code-1", state: "STATE" }, "STATE", "code-1")).toBe(false);
  });
});
