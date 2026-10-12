import { createFakePlatformContext } from "@g2-composition/contract";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { decrypt } from "../crypto";
import { ensureClientsFromHttp } from "../test-ensure-clients";
import AccountBindModal from "./AccountBindModal";

function mockCtx(post = vi.fn()) {
  const http = { get: vi.fn(), post, put: vi.fn(), delete: vi.fn() };
  return {
    ctx: createFakePlatformContext({
      ensureClient: ensureClientsFromHttp(http),
    }),
    post,
  };
}

function findByTestId(testId: string): Element | null {
  return document.querySelector(`[data-testid='${testId}']`);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("AccountBindModal", () => {
  test("loginType 为 WECHAT 时，展示“验证账号手机绑定”和“验证账号密码绑定”，不展示微信选项", async () => {
    const { ctx } = mockCtx();
    mount(AccountBindModal, {
      props: { ctx, onLoginSuccess: vi.fn(), open: true, loginType: "WECHAT", tokenId: "tok-1" },
    });
    await flushPromises();

    expect(findByTestId("bind-option-phone")).not.toBeNull();
    expect(findByTestId("bind-option-password")).not.toBeNull();
    expect(findByTestId("bind-option-wechat")).toBeNull();
    expect(document.body.textContent).toContain("当前微信未绑定");
  });

  test("loginType 为 SMS 时，展示“验证账号微信绑定”和“验证账号密码绑定”，不展示手机选项", async () => {
    const { ctx } = mockCtx();
    mount(AccountBindModal, {
      props: { ctx, onLoginSuccess: vi.fn(), open: true, loginType: "SMS", tokenId: "tok-1" },
    });
    await flushPromises();

    expect(findByTestId("bind-option-wechat")).not.toBeNull();
    expect(findByTestId("bind-option-password")).not.toBeNull();
    expect(findByTestId("bind-option-phone")).toBeNull();
    expect(document.body.textContent).toContain("当前手机未绑定");
  });

  test("点击“验证账号手机绑定”切到手机号验证表单（PhoneLogin 的 bind 模式）", async () => {
    const { ctx } = mockCtx();
    mount(AccountBindModal, {
      props: { ctx, onLoginSuccess: vi.fn(), open: true, loginType: "WECHAT", tokenId: "tok-1" },
    });
    await flushPromises();

    (findByTestId("bind-option-phone") as HTMLElement).click();
    await flushPromises();

    expect(document.body.querySelector("input[placeholder='手机号']")).not.toBeNull();
    expect(document.body.textContent).toContain("绑定账号");
  });

  test("点击“验证账号微信绑定”切到微信验证界面（WechatLogin 的 bind 模式）", async () => {
    const { ctx } = mockCtx();
    mount(AccountBindModal, {
      props: { ctx, onLoginSuccess: vi.fn(), open: true, loginType: "SMS", tokenId: "tok-1" },
    });
    await flushPromises();

    (findByTestId("bind-option-wechat") as HTMLElement).click();
    await flushPromises();

    expect(document.body.querySelector("[data-testid='wechat-qr-iframe']")).not.toBeNull();
    expect(document.body.textContent).toContain("绑定微信账号");
  });

  test("点击“验证账号密码绑定”切到密码表单，提交后调用绑定接口（密码已加密，不是明文）并触发 onLoginSuccess", async () => {
    const { ctx, post } = mockCtx(vi.fn().mockResolvedValue({ access_token: "token-1", tenants: ["tenant-a"] }));
    const onLoginSuccess = vi.fn();
    mount(AccountBindModal, {
      props: { ctx, onLoginSuccess, open: true, loginType: "SMS", tokenId: "tok-1" },
    });
    await flushPromises();

    (findByTestId("bind-option-password") as HTMLElement).click();
    await flushPromises();

    const usernameInput = document.body.querySelector("input[placeholder='请输入账号']") as HTMLInputElement;
    const passwordInput = document.body.querySelector("input[placeholder='请输入密码']") as HTMLInputElement;
    expect(usernameInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();

    usernameInput.value = "alice";
    usernameInput.dispatchEvent(new Event("input"));
    passwordInput.value = "S3cret!pwd";
    passwordInput.dispatchEvent(new Event("input"));
    await flushPromises();

    (document.body.querySelector("form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();

    expect(post).toHaveBeenCalledTimes(1);
    const [url, body] = post.mock.calls[0] as [
      string,
      { authType: string; bindType: string; tokenId: string; authParam: { username: string; password: string } },
    ];
    expect(url).toBe("/api/ouaa/public/user/auth/bind-login");
    expect(body.authType).toBe("PASSWORD");
    expect(body.bindType).toBe("SMS");
    expect(body.tokenId).toBe("tok-1");
    expect(body.authParam.username).toBe("alice");
    expect(body.authParam.password).not.toBe("S3cret!pwd");
    expect(decrypt(body.authParam.password)).toBe("S3cret!pwd");
    expect(onLoginSuccess).toHaveBeenCalledWith({ token: "token-1", tenant: "tenant-a" });
  });

  test("在验证表单里点击“其它方式?”回到选项列表", async () => {
    const { ctx } = mockCtx();
    mount(AccountBindModal, {
      props: { ctx, onLoginSuccess: vi.fn(), open: true, loginType: "SMS", tokenId: "tok-1" },
    });
    await flushPromises();

    (findByTestId("bind-option-password") as HTMLElement).click();
    await flushPromises();
    expect(findByTestId("bind-option-password")).toBeNull();

    (document.body.querySelector(".pc-auth-account-bind__back") as HTMLElement).click();
    await flushPromises();

    expect(findByTestId("bind-option-password")).not.toBeNull();
  });

  test("关闭再重新打开弹窗时，视图重置回选项列表", async () => {
    const { ctx } = mockCtx();
    const wrapper = mount(AccountBindModal, {
      props: { ctx, onLoginSuccess: vi.fn(), open: true, loginType: "SMS", tokenId: "tok-1" },
    });
    await flushPromises();

    (findByTestId("bind-option-password") as HTMLElement).click();
    await flushPromises();
    expect(findByTestId("bind-option-password")).toBeNull();

    await wrapper.setProps({ open: false });
    await flushPromises();
    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(findByTestId("bind-option-password")).not.toBeNull();
  });
});
