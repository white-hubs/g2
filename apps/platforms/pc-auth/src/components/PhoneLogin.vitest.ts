import { createFakePlatformContext } from "@g2-composition/contract";
import { HttpServiceError } from "@g2-platform/http/client";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ensureClientsFromHttp } from "../test-ensure-clients";
import { setLoginAgreementAccepted } from "../user-agreement";
import PhoneLogin from "./PhoneLogin";
import SliderCaptcha from "./SliderCaptcha";

async function passCaptcha(wrapper: ReturnType<typeof mount>): Promise<void> {
  const captcha = wrapper.findComponent(SliderCaptcha);
  captcha.vm.completeForTest("test-captcha-verification");
  await flushPromises();
}

function mockCtx(post = vi.fn()) {
  const http = { get: vi.fn(), post, put: vi.fn(), delete: vi.fn() };
  return {
    ctx: createFakePlatformContext({
      ensureClient: ensureClientsFromHttp(http),
    }),
    post,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("PhoneLogin", () => {
  test("渲染对齐原系统：标题「手机登录」、占位无字段 label、无记住我", () => {
    const { ctx } = mockCtx();
    const wrapper = mount(PhoneLogin, { props: { ctx, onLoginSuccess: vi.fn() } });

    expect(wrapper.text()).toContain("手机登录");
    expect(wrapper.text()).not.toContain("手机号登录");
    expect(wrapper.text()).not.toContain("记住我");
    expect(wrapper.find("input[placeholder='手机号']").exists()).toBe(true);
    expect(wrapper.find("input[placeholder='验证码']").exists()).toBe(true);
    expect(wrapper.text()).toContain("获取验证码");
    expect(wrapper.findComponent(SliderCaptcha).exists()).toBe(true);
    // FormItem 不渲染「* 手机号 / * 验证码」标签行
    expect(wrapper.find(".ant-form-item-label").exists()).toBe(false);
  });

  test("手机号格式不合法时点击获取验证码，不发起请求", async () => {
    const { ctx, post } = mockCtx();
    const wrapper = mount(PhoneLogin, { props: { ctx, onLoginSuccess: vi.fn() } });
    setLoginAgreementAccepted(localStorage, true);

    await wrapper.find("input[placeholder='手机号']").setValue("123");
    const getCodeButton = wrapper.findAll("button").find((btn) => btn.text().includes("获取验证码"));
    await getCodeButton?.trigger("click");
    await flushPromises();

    expect(post).not.toHaveBeenCalled();
  });

  test("点击获取验证码先打开滑块弹窗（请求 captcha/get），未完成验证前不发短信", async () => {
    const post = vi.fn().mockResolvedValue({
      repCode: "0000",
      repData: { originalImageBase64: "a", jigsawImageBase64: "b", token: "t", secretKey: "" },
    });
    const { ctx } = mockCtx(post);
    const wrapper = mount(PhoneLogin, { props: { ctx, onLoginSuccess: vi.fn() } });
    setLoginAgreementAccepted(localStorage, true);

    await wrapper.find("input[placeholder='手机号']").setValue("13800138000");
    const getCodeButton = wrapper.findAll("button").find((btn) => btn.text().includes("获取验证码"));
    await getCodeButton?.trigger("click");
    await flushPromises();

    expect(post).toHaveBeenCalledWith("/api/ouaa/captcha/get", { captchaType: "blockPuzzle" });
    expect(post).not.toHaveBeenCalledWith("/api/ouaa/sms/code/send", expect.anything());
  });

  test("手机号合法且滑块通过后发送短信接口并进入 60 秒倒计时", async () => {
    const post = vi.fn().mockResolvedValue({});
    const { ctx } = mockCtx(post);
    const wrapper = mount(PhoneLogin, { props: { ctx, onLoginSuccess: vi.fn() } });
    setLoginAgreementAccepted(localStorage, true);

    await wrapper.find("input[placeholder='手机号']").setValue("13800138000");
    const getCodeButton = wrapper.findAll("button").find((btn) => btn.text().includes("获取验证码"));
    await getCodeButton?.trigger("click");
    await passCaptcha(wrapper);

    expect(post).toHaveBeenCalledWith("/api/ouaa/sms/code/send", {
      tel: "13800138000",
      captchaVerification: "test-captcha-verification",
    });
    expect(wrapper.text()).toContain("60秒");
  });

  test("未同意用户协议时点击获取验证码，弹出二次确认弹窗，不直接发请求", async () => {
    const { ctx, post } = mockCtx();
    const wrapper = mount(PhoneLogin, { props: { ctx, onLoginSuccess: vi.fn() } });

    await wrapper.find("input[placeholder='手机号']").setValue("13800138000");
    const getCodeButton = wrapper.findAll("button").find((btn) => btn.text().includes("获取验证码"));
    await getCodeButton?.trigger("click");
    await flushPromises();

    expect(post).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("用户协议与隐私政策");
  });

  test("提交登录成功后调用 onLoginSuccess", async () => {
    const { ctx, post } = mockCtx(vi.fn().mockResolvedValue({ access_token: "token-1", tenants: ["tenant-a"] }));
    const onLoginSuccess = vi.fn();
    const wrapper = mount(PhoneLogin, { props: { ctx, onLoginSuccess } });
    setLoginAgreementAccepted(localStorage, true);

    await wrapper.find("input[placeholder='手机号']").setValue("13800138000");
    await wrapper.find("input[placeholder='验证码']").setValue("1234");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(post).toHaveBeenCalledWith("/gw-bff/auth/token", {
      grant_type: "sms",
      mobile: "13800138000",
      code: "1234",
      registerNewUser: false,
    });
    expect(onLoginSuccess).toHaveBeenCalledWith({ token: "token-1", tenant: "tenant-a" });
  });

  test("登录接口返回 409（账号未绑定）时 emit bind 事件并带上 tokenId，不提示登录失败", async () => {
    const error = new HttpServiceError(409, "409", "not bound", { details: "bind-token-abc" });
    const { ctx, post } = mockCtx(vi.fn().mockRejectedValue(error));
    const wrapper = mount(PhoneLogin, { props: { ctx, onLoginSuccess: vi.fn() } });
    setLoginAgreementAccepted(localStorage, true);

    await wrapper.find("input[placeholder='手机号']").setValue("13800138000");
    await wrapper.find("input[placeholder='验证码']").setValue("1234");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(post).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("bind")).toEqual([[{ tokenId: "bind-token-abc" }]]);
  });

  test("登录失败（非 409）时用 message 展示错误信息", async () => {
    const { ctx } = mockCtx(vi.fn().mockRejectedValue(new Error("boom")));
    const wrapper = mount(PhoneLogin, { props: { ctx, onLoginSuccess: vi.fn() } });
    setLoginAgreementAccepted(localStorage, true);

    await wrapper.find("input[placeholder='手机号']").setValue("13800138000");
    await wrapper.find("input[placeholder='验证码']").setValue("1234");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(document.body.textContent).toContain("登录失败");
  });

  describe("绑定模式（bind=true）", () => {
    test("标题变为“绑定账号”，不显示协议勾选框", () => {
      const { ctx } = mockCtx();
      const wrapper = mount(PhoneLogin, { props: { ctx, onLoginSuccess: vi.fn(), bind: true, tokenId: "tok-1" } });

      expect(wrapper.text()).toContain("绑定账号");
      expect(wrapper.find("[data-testid='agreement-checkbox']").exists()).toBe(false);
    });

    test("提交时调用绑定接口，携带 tokenId/bindType，成功后调用 onLoginSuccess", async () => {
      const { ctx, post } = mockCtx(vi.fn().mockResolvedValue({ access_token: "token-1", tenants: ["tenant-a"] }));
      const onLoginSuccess = vi.fn();
      const wrapper = mount(PhoneLogin, {
        props: { ctx, onLoginSuccess, bind: true, tokenId: "tok-1", bindType: "WECHAT" },
      });

      await wrapper.find("input[placeholder='手机号']").setValue("13800138000");
      await wrapper.find("input[placeholder='验证码']").setValue("1234");
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(post).toHaveBeenCalledWith("/api/ouaa/public/user/auth/bind-login", {
        authType: "SMS",
        bindType: "WECHAT",
        tokenId: "tok-1",
        authParam: { mobile: "13800138000", code: "1234" },
      });
      expect(onLoginSuccess).toHaveBeenCalledWith({ token: "token-1", tenant: "tenant-a" });
    });

    test("点击“其它方式?”触发 back 事件", async () => {
      const { ctx } = mockCtx();
      const wrapper = mount(PhoneLogin, { props: { ctx, onLoginSuccess: vi.fn(), bind: true, tokenId: "tok-1" } });

      await wrapper.find(".pc-auth-phone-login__back").trigger("click");

      expect(wrapper.emitted("back")).toHaveLength(1);
    });
  });
});
