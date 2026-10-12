import { createFakePlatformContext } from "@g2-composition/contract";
import { HttpServiceError } from "@g2-platform/http/client";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ensureClientsFromHttp } from "../test-ensure-clients";
import { WECHAT_APPID, WECHAT_REDIRECT_URI } from "../wechat-login";
import WechatLogin from "./WechatLogin";

function mockCtx(post = vi.fn()) {
  const http = { get: vi.fn(), post, put: vi.fn(), delete: vi.fn() };
  return {
    ctx: createFakePlatformContext({
      ensureClient: ensureClientsFromHttp(http),
    }),
    post,
  };
}

function setLocation(pathAndQuery: string): void {
  window.history.pushState({}, "", pathAndQuery);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setLocation("/login");
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("WechatLogin", () => {
  test("渲染二维码 iframe（真实 appid + cube-test redirect）与扫码提示", () => {
    const { ctx } = mockCtx();
    const wrapper = mount(WechatLogin, { props: { ctx, onLoginSuccess: vi.fn() } });

    expect(wrapper.text()).toContain("打开微信，扫描二维码登录");
    expect(wrapper.find("[data-testid='wechat-appid-placeholder-warning']").exists()).toBe(false);
    const iframe = wrapper.find("[data-testid='wechat-qr-iframe']").element as HTMLIFrameElement;
    expect(iframe.src).toContain("https://open.weixin.qq.com/connect/qrconnect");
    expect(iframe.src).toContain(`appid=${WECHAT_APPID}`);
    expect(iframe.src).toContain(encodeURIComponent(WECHAT_REDIRECT_URI));
  });

  test("URL 上没有 code 参数时，不发起登录请求，直接展示二维码", async () => {
    const { ctx, post } = mockCtx();
    const wrapper = mount(WechatLogin, { props: { ctx, onLoginSuccess: vi.fn() } });
    await flushPromises();

    expect(post).not.toHaveBeenCalled();
    expect(wrapper.find("[data-testid='wechat-qr-iframe']").exists()).toBe(true);
  });

  test("URL 带上匹配的 code/state 回调参数时，自动用 code 换 token 并调用 onLoginSuccess", async () => {
    sessionStorage.setItem("g2-pc-auth:wechat-login:state", "expected-state");
    setLocation("/login?code=wx-code-1&state=expected-state");
    const { ctx, post } = mockCtx(vi.fn().mockResolvedValue({ access_token: "token-1", tenants: ["tenant-a"] }));
    const onLoginSuccess = vi.fn();
    mount(WechatLogin, { props: { ctx, onLoginSuccess } });
    await flushPromises();

    expect(post).toHaveBeenCalledWith("/gw-bff/auth/token", {
      grant_type: "wechat-v2",
      code: "wx-code-1",
      registerNewUser: false,
    });
    expect(onLoginSuccess).toHaveBeenCalledWith({ token: "token-1", tenant: "tenant-a" });
  });

  test("state 不匹配时不处理回调（防 CSRF）", async () => {
    sessionStorage.setItem("g2-pc-auth:wechat-login:state", "expected-state");
    setLocation("/login?code=wx-code-1&state=wrong-state");
    const { ctx, post } = mockCtx();
    mount(WechatLogin, { props: { ctx, onLoginSuccess: vi.fn() } });
    await flushPromises();

    expect(post).not.toHaveBeenCalled();
  });

  test("同一个 code 已经处理过时（本地存储命中），刷新页面不会重复换 token", async () => {
    localStorage.setItem("g2-pc-auth:wechat-login:last-code", "wx-code-1");
    sessionStorage.setItem("g2-pc-auth:wechat-login:state", "expected-state");
    setLocation("/login?code=wx-code-1&state=expected-state");
    const { ctx, post } = mockCtx();
    mount(WechatLogin, { props: { ctx, onLoginSuccess: vi.fn() } });
    await flushPromises();

    expect(post).not.toHaveBeenCalled();
  });

  test("换 token 遇到 409（账号未绑定）时 emit bind 事件并带上 tokenId", async () => {
    sessionStorage.setItem("g2-pc-auth:wechat-login:state", "expected-state");
    setLocation("/login?code=wx-code-1&state=expected-state");
    const error = new HttpServiceError(409, "409", "not bound", { details: "bind-token-xyz" });
    const { ctx } = mockCtx(vi.fn().mockRejectedValue(error));
    const wrapper = mount(WechatLogin, { props: { ctx, onLoginSuccess: vi.fn() } });
    await flushPromises();

    expect(wrapper.emitted("bind")).toEqual([[{ tokenId: "bind-token-xyz" }]]);
  });

  describe("绑定模式（bind=true）", () => {
    test("标题变为“绑定微信账号”，点击“其它方式?”触发 back 事件", async () => {
      const { ctx } = mockCtx();
      const wrapper = mount(WechatLogin, { props: { ctx, onLoginSuccess: vi.fn(), bind: true, tokenId: "tok-1" } });

      expect(wrapper.text()).toContain("绑定微信账号");
      await wrapper.find(".pc-auth-wechat-login__back").trigger("click");
      expect(wrapper.emitted("back")).toHaveLength(1);
    });

    test("绑定模式下换 token 调用绑定接口，携带 tokenId", async () => {
      sessionStorage.setItem("g2-pc-auth:wechat-login:state", "expected-state");
      setLocation("/login?code=wx-code-1&state=expected-state");
      const { ctx, post } = mockCtx(vi.fn().mockResolvedValue({ access_token: "token-1", tenants: ["tenant-a"] }));
      const onLoginSuccess = vi.fn();
      mount(WechatLogin, { props: { ctx, onLoginSuccess, bind: true, tokenId: "tok-1" } });
      await flushPromises();

      expect(post).toHaveBeenCalledWith("/api/ouaa/public/user/auth/bind-login", {
        authType: "WECHAT",
        bindType: "WECHAT",
        tokenId: "tok-1",
        authParam: { code: "wx-code-1" },
      });
      expect(onLoginSuccess).toHaveBeenCalledWith({ token: "token-1", tenant: "tenant-a" });
    });
  });
});
