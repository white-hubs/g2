import { createFakePlatformContext } from "@g2-composition/contract";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { decrypt } from "../crypto";
import { ensureClientsFromHttp } from "../test-ensure-clients";
import ForgotPassword from "./ForgotPassword";
import SliderCaptcha from "./SliderCaptcha";

async function passCaptcha(wrapper: ReturnType<typeof mount>): Promise<void> {
  const captcha = wrapper.findComponent(SliderCaptcha);
  captcha.vm.completeForTest("test-captcha-verification");
  await flushPromises();
}

function mockCtx(handlers: { get?: ReturnType<typeof vi.fn>; post?: ReturnType<typeof vi.fn>; put?: ReturnType<typeof vi.fn> } = {}) {
  const get = handlers.get ?? vi.fn();
  const post = handlers.post ?? vi.fn();
  const put = handlers.put ?? vi.fn();
  const http = { get, post, put, delete: vi.fn() };
  return {
    ctx: createFakePlatformContext({
      ensureClient: ensureClientsFromHttp(http),
    }),
    get,
    post,
    put,
  };
}

async function goToResetStep(wrapper: ReturnType<typeof mount>, get: ReturnType<typeof vi.fn>): Promise<void> {
  get.mockResolvedValue({ secret: "reset-secret", resetSessionId: "session-1" });
  await wrapper.find("input[placeholder='输入手机号码或邮箱']").setValue("13800138000");
  await wrapper.find("input[placeholder='输入验证码']").setValue("1234");
  await wrapper.find("form").trigger("submit");
  await flushPromises();
}

beforeEach(() => {
  localStorage.clear();
});

async function goToVerifyStep(wrapper: ReturnType<typeof mount>): Promise<void> {
  await wrapper.find("[data-testid='forgot-method-phone']").trigger("click");
}

describe("ForgotPassword", () => {
  test("默认渲染找回方式选择：手机找回 / 微信找回", () => {
    const { ctx } = mockCtx();
    const wrapper = mount(ForgotPassword, { props: { ctx } });

    expect(wrapper.text()).toContain("找回方式");
    expect(wrapper.text()).toContain("验证账号手机找回");
    expect(wrapper.text()).toContain("验证账号微信找回");
    expect(wrapper.find("input[placeholder='输入手机号码或邮箱']").exists()).toBe(false);
  });

  test("方法步展示「返回登录」并 emit back；子步展示「换一种方式」回到方法步", async () => {
    const { ctx } = mockCtx();
    const wrapper = mount(ForgotPassword, { props: { ctx } });

    const methodBack = wrapper.find("[data-testid='forgot-password-back']");
    expect(methodBack.exists()).toBe(true);
    expect(methodBack.text()).toBe("返回登录");
    await methodBack.trigger("click");
    expect(wrapper.emitted("back")).toHaveLength(1);

    await goToVerifyStep(wrapper);
    const stepBack = wrapper.find("[data-testid='forgot-password-back']");
    expect(stepBack.text()).toBe("换一种方式");
    await stepBack.trigger("click");
    expect(wrapper.text()).toContain("找回方式");
    expect(wrapper.find("[data-testid='forgot-password-back']").text()).toBe("返回登录");
  });

  test("选择手机找回后进入验证身份步骤", async () => {
    const { ctx } = mockCtx();
    const wrapper = mount(ForgotPassword, { props: { ctx } });

    await goToVerifyStep(wrapper);

    expect(wrapper.text()).toContain("验证身份");
    expect(wrapper.find("input[placeholder='输入手机号码或邮箱']").exists()).toBe(true);
    expect(wrapper.find("input[placeholder='输入验证码']").exists()).toBe(true);
    expect(wrapper.text()).toContain("获取验证码");
    expect(wrapper.findComponent(SliderCaptcha).exists()).toBe(true);
  });

  test("账号格式不合法时点击获取验证码，不发起请求", async () => {
    const { ctx, post } = mockCtx();
    const wrapper = mount(ForgotPassword, { props: { ctx } });
    await goToVerifyStep(wrapper);

    await wrapper.find("input[placeholder='输入手机号码或邮箱']").setValue("not-a-phone-or-email");
    const getCodeButton = wrapper.findAll("button").find((btn) => btn.text().includes("获取验证码"));
    await getCodeButton?.trigger("click");
    await flushPromises();

    expect(post).not.toHaveBeenCalled();
  });

  test("点击获取验证码先打开滑块弹窗，未完成验证前不发短信", async () => {
    const post = vi.fn().mockResolvedValue({
      repCode: "0000",
      repData: { originalImageBase64: "a", jigsawImageBase64: "b", token: "t", secretKey: "" },
    });
    const { ctx } = mockCtx({ post });
    const wrapper = mount(ForgotPassword, { props: { ctx } });
    await goToVerifyStep(wrapper);

    await wrapper.find("input[placeholder='输入手机号码或邮箱']").setValue("13800138000");
    const getCodeButton = wrapper.findAll("button").find((btn) => btn.text().includes("获取验证码"));
    await getCodeButton?.trigger("click");
    await flushPromises();

    expect(post).toHaveBeenCalledWith("/api/ouaa/captcha/get", { captchaType: "blockPuzzle" });
    expect(post).not.toHaveBeenCalledWith("/api/ouaa/sms/code/send", expect.anything());
  });

  test("账号+滑块验证通过后发送短信接口（RESET_PASSWORD）并进入倒计时", async () => {
    const { ctx, post } = mockCtx({ post: vi.fn().mockResolvedValue({}) });
    const wrapper = mount(ForgotPassword, { props: { ctx } });
    await goToVerifyStep(wrapper);

    await wrapper.find("input[placeholder='输入手机号码或邮箱']").setValue("13800138000");
    const getCodeButton = wrapper.findAll("button").find((btn) => btn.text().includes("获取验证码"));
    await getCodeButton?.trigger("click");
    await passCaptcha(wrapper);

    expect(post).toHaveBeenCalledWith("/api/ouaa/sms/code/send", {
      tel: "13800138000",
      sendSmsCodeType: "RESET_PASSWORD",
      captchaVerification: "test-captcha-verification",
    });
    expect(wrapper.text()).toContain("秒后重新获取");
  });

  test("提交“下一步”成功后调用换取重置凭证接口（GET 带 query），并切换到修改密码步骤", async () => {
    const { ctx, get } = mockCtx();
    const wrapper = mount(ForgotPassword, { props: { ctx } });
    await goToVerifyStep(wrapper);

    await goToResetStep(wrapper, get);

    expect(get).toHaveBeenCalledWith("/api/ouaa/retrieve-password/token?tel=13800138000&code=1234");
    expect(wrapper.text()).toContain("修改密码");
    expect(wrapper.find("input[placeholder='请输入密码']").exists()).toBe(true);
    expect(wrapper.find("input[placeholder='再一次输入密码']").exists()).toBe(true);
  });

  test("修改密码步骤提交成功：新密码用验证身份返回的 secret 加密，带上 resetSessionId，并 emit done", async () => {
    const { ctx, get, put } = mockCtx({ put: vi.fn().mockResolvedValue({}) });
    const wrapper = mount(ForgotPassword, { props: { ctx } });
    await goToVerifyStep(wrapper);
    await goToResetStep(wrapper, get);

    await wrapper.find("input[placeholder='请输入密码']").setValue("NewS3cret!pwd");
    await wrapper.find("input[placeholder='再一次输入密码']").setValue("NewS3cret!pwd");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(put).toHaveBeenCalledTimes(1);
    const [url, body] = put.mock.calls[0] as [string, { newPassword: string; confirmPassword: string; resetSessionId: string }];
    expect(url).toBe("/api/ouaa/retrieve-password/reset");
    expect(body.resetSessionId).toBe("session-1");
    expect(body.newPassword).not.toBe("NewS3cret!pwd");
    expect(decrypt(body.newPassword, "reset-secret")).toBe("NewS3cret!pwd");
    expect(decrypt(body.confirmPassword, "reset-secret")).toBe("NewS3cret!pwd");
    expect(wrapper.emitted("done")).toHaveLength(1);
  });

  test("修改密码接口失败时用 message 展示错误信息，不 emit done", async () => {
    const { ctx, get } = mockCtx({ put: vi.fn().mockRejectedValue(new Error("boom")) });
    const wrapper = mount(ForgotPassword, { props: { ctx } });
    await goToVerifyStep(wrapper);
    await goToResetStep(wrapper, get);

    await wrapper.find("input[placeholder='请输入密码']").setValue("NewS3cret!pwd");
    await wrapper.find("input[placeholder='再一次输入密码']").setValue("NewS3cret!pwd");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.emitted("done")).toBeUndefined();
    expect(document.body.textContent).toContain("修改密码失败");
  });

  test("找回方式步骤点击“其它方式?”触发 back 事件", async () => {
    const { ctx } = mockCtx();
    const wrapper = mount(ForgotPassword, { props: { ctx } });

    await wrapper.find(".pc-auth-forgot-password__back").trigger("click");

    expect(wrapper.emitted("back")).toHaveLength(1);
  });

  test("验证身份步骤点击“其它方式?”回到找回方式（不 emit back）", async () => {
    const { ctx } = mockCtx();
    const wrapper = mount(ForgotPassword, { props: { ctx } });
    await goToVerifyStep(wrapper);

    await wrapper.find(".pc-auth-forgot-password__back").trigger("click");

    expect(wrapper.text()).toContain("找回方式");
    expect(wrapper.emitted("back")).toBeUndefined();
  });

  test("修改密码步骤点击“其它方式?”回到验证身份步骤（不 emit back）", async () => {
    const { ctx, get } = mockCtx();
    const wrapper = mount(ForgotPassword, { props: { ctx } });
    await goToVerifyStep(wrapper);
    await goToResetStep(wrapper, get);
    expect(wrapper.text()).toContain("修改密码");

    await wrapper.find(".pc-auth-forgot-password__back").trigger("click");

    expect(wrapper.text()).toContain("验证身份");
    expect(wrapper.emitted("back")).toBeUndefined();
  });
});
