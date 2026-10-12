import { createFakePlatformContext } from "@g2-composition/contract";
import { HttpServiceError } from "@g2-platform/http/client";
import { type VueWrapper, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { decrypt } from "../crypto";
import { REMEMBERED_LOGIN_STORAGE_KEY, loadRememberedLogin, saveRememberedLogin } from "../remember-me";
import { ensureClientsFromHttp } from "../test-ensure-clients";
import { setLoginAgreementAccepted } from "../user-agreement";
import ForgotPassword from "./ForgotPassword";
import LoginPage from "./LoginPage";
import PhoneLogin from "./PhoneLogin";
import SliderCaptcha from "./SliderCaptcha";
import WechatLogin from "./WechatLogin";

const mountedWrappers: VueWrapper[] = [];

function mountLoginPage(props: InstanceType<typeof LoginPage>["$props"]): VueWrapper {
  const wrapper = mount(LoginPage, { props }) as unknown as VueWrapper;
  mountedWrappers.push(wrapper);
  return wrapper;
}

/** 弹窗滑块用 completeForTest 模拟后端校验通过（会触发账密登录）。 */
async function passCaptcha(container: VueWrapper): Promise<void> {
  const captcha = container.findComponent(SliderCaptcha);
  captcha.vm.completeForTest("test-captcha-verification");
  await flushPromises();
}

function rememberMeCheckbox(wrapper: VueWrapper) {
  const rememberLabel = wrapper.findAll("label").find((label) => label.text().includes("记住我"));
  return rememberLabel?.find(".ant-checkbox-input");
}

beforeEach(() => {
  localStorage.clear();
  setLoginAgreementAccepted(localStorage, true);
});

afterEach(() => {
  while (mountedWrappers.length > 0) {
    mountedWrappers.pop()?.unmount();
  }
});

describe("LoginPage", () => {
  test("渲染账号密码表单与系统标题，提交前禁止空账号", async () => {
    const wrapper = mountLoginPage({ ctx: createFakePlatformContext(), onLoginSuccess: () => {} });
    expect(wrapper.find("[data-testid='system-title']").text()).toContain("华威集团-ghy");
    expect(wrapper.find("input[placeholder='请输入账号']").exists()).toBe(true);
    expect(wrapper.find("input[placeholder='请输入密码']").exists()).toBe(true);
  });

  test("渲染记住我勾选框与其它登录方式入口，不内嵌滑块轨道", () => {
    const wrapper = mountLoginPage({ ctx: createFakePlatformContext(), onLoginSuccess: () => {} });
    expect(wrapper.text()).toContain("记住我");
    expect(wrapper.text()).toContain("其它登录方式");
    expect(wrapper.find("[data-testid='switch-phone']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='switch-wechat']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='captcha-track']").exists()).toBe(false);
  });

  test("未完成滑块验证时点击提交，只打开验证码弹窗，不发起登录请求", async () => {
    const post = vi.fn().mockResolvedValue({
      repCode: "0000",
      repData: {
        originalImageBase64: "bg",
        jigsawImageBase64: "piece",
        token: "tok",
        secretKey: "",
      },
    });
    const http = { get: vi.fn(), post, put: vi.fn(), delete: vi.fn() };
    const ctx = createFakePlatformContext({
      ensureClient: ensureClientsFromHttp(http),
    });
    const wrapper = mountLoginPage({ ctx, onLoginSuccess: vi.fn() });

    await wrapper.find("input[placeholder='请输入账号']").setValue("alice");
    await wrapper.find("input[placeholder='请输入密码']").setValue("S3cret!pwd");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(post).toHaveBeenCalledWith("/api/ouaa/captcha/get", { captchaType: "blockPuzzle" });
    expect(post).not.toHaveBeenCalledWith("/gw-bff/auth/token", expect.anything());
  });

  test("提交登录时走 pwd_simple_code，密码加密且带上 captcha key", async () => {
    const post = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/captcha/")) {
        return Promise.resolve({
          repCode: "0000",
          repData: { originalImageBase64: "a", jigsawImageBase64: "b", token: "t", secretKey: "" },
        });
      }
      return Promise.resolve({ access_token: "token-1", tenants: ["tenant-a"] });
    });
    const http = { get: vi.fn(), post, put: vi.fn(), delete: vi.fn() };
    const ctx = createFakePlatformContext({
      ensureClient: ensureClientsFromHttp(http),
    });
    const onLoginSuccess = vi.fn();
    const wrapper = mountLoginPage({ ctx, onLoginSuccess });

    const plainPassword = "S3cret!pwd";
    await wrapper.find("input[placeholder='请输入账号']").setValue("alice");
    await wrapper.find("input[placeholder='请输入密码']").setValue(plainPassword);
    await wrapper.find("form").trigger("submit");
    await passCaptcha(wrapper);

    const tokenCalls = post.mock.calls.filter((call) => call[0] === "/gw-bff/auth/token");
    expect(tokenCalls).toHaveLength(1);
    const body = tokenCalls[0]?.[1] as {
      username: string;
      password: string;
      grant_type: string;
      captchaType: string;
      key: string;
    };
    expect(body.grant_type).toBe("pwd_simple_code");
    expect(body.captchaType).toBe("BLOCK_PUZZLE");
    expect(body.key).toBe("test-captcha-verification");
    expect(body.username).toBe("alice");
    expect(body.password).not.toBe(plainPassword);
    expect(decrypt(body.password)).toBe(plainPassword);
    expect(onLoginSuccess).toHaveBeenCalledWith({ token: "token-1", tenant: "tenant-a" });
  });

  test("勾选记住我并登录成功后，默认只持久化账号（记住密码开关默认关）", async () => {
    const post = vi.fn().mockResolvedValue({ access_token: "token-1", tenants: ["tenant-a"] });
    const http = { get: vi.fn(), post, put: vi.fn(), delete: vi.fn() };
    const ctx = createFakePlatformContext({
      ensureClient: ensureClientsFromHttp(http),
    });
    const wrapper = mountLoginPage({ ctx, onLoginSuccess: vi.fn() });

    const plainPassword = "Rememb3r!me";
    await wrapper.find("input[placeholder='请输入账号']").setValue("alice");
    await wrapper.find("input[placeholder='请输入密码']").setValue(plainPassword);
    await rememberMeCheckbox(wrapper)?.setValue(true);
    await passCaptcha(wrapper);

    const raw = localStorage.getItem(REMEMBERED_LOGIN_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as { account: string; password?: string };
    expect(parsed.account).toBe("alice");
    expect(parsed.password).toBeUndefined();
  });

  test("下次进入页面时，若本地有记住我缓存，自动回填账号并勾选记住我", async () => {
    saveRememberedLogin(localStorage, { account: "bob", password: "hunter2" }, { rememberPassword: true });

    const wrapper = mountLoginPage({ ctx: createFakePlatformContext(), onLoginSuccess: () => {} });
    await wrapper.vm.$nextTick();

    const accountInput = wrapper.find("input[placeholder='请输入账号']").element as HTMLInputElement;
    const passwordInput = wrapper.find("input[placeholder='请输入密码']").element as HTMLInputElement;
    expect(accountInput.value).toBe("bob");
    expect(passwordInput.value).toBe("hunter2");
    const checkbox = rememberMeCheckbox(wrapper)?.element as HTMLInputElement | undefined;
    expect(checkbox?.checked).toBe(true);
  });

  test("取消勾选记住我后登录成功，清除本地缓存", async () => {
    saveRememberedLogin(localStorage, { account: "bob", password: "hunter2" }, { rememberPassword: true });
    const post = vi.fn().mockResolvedValue({ access_token: "token-1", tenants: ["tenant-a"] });
    const http = { get: vi.fn(), post, put: vi.fn(), delete: vi.fn() };
    const ctx = createFakePlatformContext({
      ensureClient: ensureClientsFromHttp(http),
    });
    const wrapper = mountLoginPage({ ctx, onLoginSuccess: vi.fn() });
    expect(loadRememberedLogin(localStorage)).not.toBeNull();
    await wrapper.vm.$nextTick();

    await rememberMeCheckbox(wrapper)?.setValue(false);
    await passCaptcha(wrapper);

    expect(localStorage.getItem(REMEMBERED_LOGIN_STORAGE_KEY)).toBeNull();
  });

  test("登录失败时用 message.error 展示错误信息，不使用裸文本/alert", async () => {
    const post = vi.fn().mockRejectedValue(new Error("invalid credentials"));
    const http = { get: vi.fn(), post, put: vi.fn(), delete: vi.fn() };
    const ctx = createFakePlatformContext({
      ensureClient: ensureClientsFromHttp(http),
    });
    const wrapper = mountLoginPage({ ctx, onLoginSuccess: vi.fn() });

    await wrapper.find("input[placeholder='请输入账号']").setValue("alice");
    await wrapper.find("input[placeholder='请输入密码']").setValue("wrong-pwd");
    await passCaptcha(wrapper);

    expect(wrapper.find(".pc-auth-login-error").exists()).toBe(false);
    expect(document.body.textContent).toContain("账号或密码错误");
  });

  describe("未同意用户协议时提交账密登录", () => {
    test("拦截提交、不发起登录请求，并弹出二次确认弹窗", async () => {
      setLoginAgreementAccepted(localStorage, false);
      const post = vi.fn().mockResolvedValue({ access_token: "token-1", tenants: ["tenant-a"] });
      const http = { get: vi.fn(), post, put: vi.fn(), delete: vi.fn() };
      const ctx = createFakePlatformContext({
        ensureClient: ensureClientsFromHttp(http),
      });
      const wrapper = mountLoginPage({ ctx, onLoginSuccess: vi.fn() });

      await wrapper.find("input[placeholder='请输入账号']").setValue("alice");
      await wrapper.find("input[placeholder='请输入密码']").setValue("S3cret!pwd");
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(post).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("用户协议与隐私政策");
    });

    test("二次确认弹窗点击“同意并登录”后打开验证码，完成验证后登录", async () => {
      setLoginAgreementAccepted(localStorage, false);
      const post = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/captcha/")) {
          return Promise.resolve({
            repCode: "0000",
            repData: { originalImageBase64: "a", jigsawImageBase64: "b", token: "t", secretKey: "" },
          });
        }
        return Promise.resolve({ access_token: "token-1", tenants: ["tenant-a"] });
      });
      const http = { get: vi.fn(), post, put: vi.fn(), delete: vi.fn() };
      const ctx = createFakePlatformContext({
        ensureClient: ensureClientsFromHttp(http),
      });
      const onLoginSuccess = vi.fn();
      const wrapper = mountLoginPage({ ctx, onLoginSuccess });

      await wrapper.find("input[placeholder='请输入账号']").setValue("alice");
      await wrapper.find("input[placeholder='请输入密码']").setValue("S3cret!pwd");
      await wrapper.find("form").trigger("submit");
      await flushPromises();
      expect(post).not.toHaveBeenCalled();

      const okButton = Array.from(document.querySelectorAll(".ant-btn")).find((el) => el.textContent === "同意并登录");
      expect(okButton).toBeDefined();
      (okButton as HTMLElement).click();
      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 20));

      await passCaptcha(wrapper);
      expect(post.mock.calls.some((call) => call[0] === "/gw-bff/auth/token")).toBe(true);
      expect(onLoginSuccess).toHaveBeenCalledWith({ token: "token-1", tenant: "tenant-a" });
    });
  });

  describe("登录方式切换", () => {
    test("默认展示账密登录", () => {
      const wrapper = mountLoginPage({ ctx: createFakePlatformContext(), onLoginSuccess: vi.fn() });

      expect(wrapper.find("input[placeholder='请输入账号']").exists()).toBe(true);
      expect(wrapper.findComponent(PhoneLogin).exists()).toBe(false);
      expect(wrapper.findComponent(WechatLogin).exists()).toBe(false);
    });

    test("点击“手机”切换到 PhoneLogin", async () => {
      const wrapper = mountLoginPage({ ctx: createFakePlatformContext(), onLoginSuccess: vi.fn() });

      await wrapper.find("[data-testid='switch-phone']").trigger("click");
      await flushPromises();

      expect(wrapper.findComponent(PhoneLogin).exists()).toBe(true);
      expect(wrapper.find("input[placeholder='手机号']").exists()).toBe(true);
    });

    test("点击“微信”切换到 WechatLogin", async () => {
      const wrapper = mountLoginPage({ ctx: createFakePlatformContext(), onLoginSuccess: vi.fn() });

      await wrapper.find("[data-testid='switch-wechat']").trigger("click");
      await flushPromises();

      expect(wrapper.findComponent(WechatLogin).exists()).toBe(true);
      expect(wrapper.text()).toContain("打开微信，扫描二维码登录");
    });

    test("点击“忘记密码？”先进入找回方式，再选手机找回；其它方式可返回登录卡片", async () => {
      const wrapper = mountLoginPage({ ctx: createFakePlatformContext(), onLoginSuccess: vi.fn() });

      await wrapper.find("[data-testid='forgot-password-link']").trigger("click");
      await flushPromises();
      expect(wrapper.findComponent(ForgotPassword).exists()).toBe(true);
      expect(wrapper.text()).toContain("找回方式");
      expect(wrapper.find("input[placeholder='请输入账号']").exists()).toBe(false);

      await wrapper.find("[data-testid='forgot-method-phone']").trigger("click");
      expect(wrapper.text()).toContain("验证身份");

      await wrapper.find("[data-testid='forgot-password-back']").trigger("click");
      expect(wrapper.text()).toContain("找回方式");

      await wrapper.find("[data-testid='forgot-password-back']").trigger("click");
      expect(wrapper.find("input[placeholder='请输入账号']").exists()).toBe(true);
    });
  });

  describe("手机号/微信登录触发账号绑定弹窗", () => {
    test("PhoneLogin 返回 409 时，LoginPage 打开 AccountBindModal 并传入 loginType=SMS", async () => {
      const boundError = new HttpServiceError(409, "409", "not bound", { details: "bind-token-1" });
      const post = vi.fn().mockRejectedValue(boundError);
      const http = { get: vi.fn(), post, put: vi.fn(), delete: vi.fn() };
      const ctx = createFakePlatformContext({
        ensureClient: ensureClientsFromHttp(http),
      });
      const wrapper = mountLoginPage({ ctx, onLoginSuccess: vi.fn() });

      await wrapper.find("[data-testid='switch-phone']").trigger("click");

      const phoneLogin = wrapper.findComponent(PhoneLogin);
      await phoneLogin.find("input[placeholder='手机号']").setValue("13800138000");
      await phoneLogin.find("input[placeholder='验证码']").setValue("1234");
      await phoneLogin.find("form").trigger("submit");
      await flushPromises();

      expect(document.body.textContent).toContain("当前手机未绑定");
    });
  });
});
