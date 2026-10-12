import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { isLoginAgreementAccepted, setLoginAgreementAccepted } from "../user-agreement";
import UserAgreement from "./UserAgreement";

beforeEach(() => {
  localStorage.clear();
});

/**
 * `Modal`（antdv）内部用 `Teleport to="body"` 挂载，`@vue/test-utils` 的 `wrapper.unmount()`
 * 只会清掉组件本身挂载的容器，不会自动清掉之前测试遗留在 `document.body` 上的 Teleport 内容——
 * 如果不清，"打开二次确认弹窗但不点按钮"这一测试留下的弹窗 DOM 会一直留在 `document.body` 里，
 * 后面测试里用 `document.querySelectorAll(".ant-btn")` 找按钮时可能先匹配到这个失效的旧弹窗。
 */
afterEach(() => {
  document.body.innerHTML = "";
});

describe("UserAgreement", () => {
  test("本地没有缓存时默认未勾选", () => {
    const wrapper = mount(UserAgreement);
    expect((wrapper.find("input[data-testid='agreement-checkbox']").element as HTMLInputElement).checked).toBe(false);
  });

  test("本地有已同意缓存时，挂载后默认勾选", async () => {
    setLoginAgreementAccepted(localStorage, true);
    const wrapper = mount(UserAgreement);
    await wrapper.vm.$nextTick();
    expect((wrapper.find("input[data-testid='agreement-checkbox']").element as HTMLInputElement).checked).toBe(true);
  });

  test("勾选后写入本地存储并 emit acceptedChange(true)", async () => {
    const wrapper = mount(UserAgreement);
    await wrapper.find("input[data-testid='agreement-checkbox']").setValue(true);

    expect(isLoginAgreementAccepted(localStorage)).toBe(true);
    expect(wrapper.emitted("acceptedChange")).toEqual([[true]]);
  });

  test("取消勾选后写入本地存储为未同意并 emit acceptedChange(false)", async () => {
    setLoginAgreementAccepted(localStorage, true);
    const wrapper = mount(UserAgreement);
    await wrapper.vm.$nextTick();
    await wrapper.find("input[data-testid='agreement-checkbox']").setValue(false);

    expect(isLoginAgreementAccepted(localStorage)).toBe(false);
    expect(wrapper.emitted("acceptedChange")).toEqual([[false]]);
  });

  test("勾选区文案对齐原系统：无书名号，链接文案为「用户协议」「隐私政策」", () => {
    const wrapper = mount(UserAgreement);

    expect(wrapper.text().replace(/\s+/gu, "")).toContain("我已阅读并同意用户协议及隐私政策");
    expect(wrapper.find("[data-testid='agreement-link']").text()).toBe("用户协议");
    expect(wrapper.find("[data-testid='privacy-link']").text()).toBe("隐私政策");
    expect(wrapper.text()).not.toContain("《");
    expect(wrapper.text()).not.toContain("》");
  });

  test("点击用户协议链接打开只读协议弹窗（不是二次确认弹窗）", async () => {
    const wrapper = mount(UserAgreement, { props: { agreementUrl: "https://example.com/agreement.html" } });
    await wrapper.find("[data-testid='agreement-link']").trigger("click");
    await wrapper.vm.$nextTick();

    expect(document.body.textContent).toContain("用户协议");
    const iframe = document.querySelector("[data-testid='agreement-iframe']") as HTMLIFrameElement | null;
    expect(iframe?.src).toBe("https://example.com/agreement.html");
  });

  test("点击协议/隐私链接不改变勾选状态（阅读 ≠ 同意）", async () => {
    const wrapper = mount(UserAgreement, {
      props: { agreementUrl: "https://example.com/a", privacyUrl: "https://example.com/p" },
      attachTo: document.body,
    });
    const checkbox = () => wrapper.find("input[data-testid='agreement-checkbox']").element as HTMLInputElement;
    const agreementLink = wrapper.find("[data-testid='agreement-link']").element as HTMLAnchorElement;
    const privacyLink = wrapper.find("[data-testid='privacy-link']").element as HTMLAnchorElement;

    // 链接不得落在 checkbox 的 <label> 内，否则浏览器会把点击当成勾选
    expect(agreementLink.closest("label")).toBeNull();
    expect(privacyLink.closest("label")).toBeNull();

    expect(checkbox().checked).toBe(false);
    agreementLink.click();
    await wrapper.vm.$nextTick();
    expect(checkbox().checked).toBe(false);
    expect(isLoginAgreementAccepted(localStorage)).toBe(false);

    privacyLink.click();
    await wrapper.vm.$nextTick();
    expect(checkbox().checked).toBe(false);
    expect(wrapper.emitted("acceptedChange")).toBeUndefined();
  });

  test("remind() 触发标红抖动状态（通过 class 观察，不校验具体动画细节）", async () => {
    const wrapper = mount(UserAgreement);
    await (wrapper.vm as unknown as { remind: () => Promise<void> }).remind();
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".pc-auth-user-agreement--error").exists()).toBe(true);
    expect(wrapper.find(".pc-auth-user-agreement--shake").exists()).toBe(true);
  });

  test("openAgreementConfirm() 打开二次确认弹窗", async () => {
    const wrapper = mount(UserAgreement);
    (wrapper.vm as unknown as { openAgreementConfirm: () => void }).openAgreementConfirm();
    await wrapper.vm.$nextTick();

    expect(document.body.textContent).toContain("用户协议与隐私政策");
    expect(document.body.textContent).toContain("同意并登录");
  });

  test("二次确认弹窗点击“同意并登录”：勾选框变为已选、写入本地存储、emit confirmAccepted", async () => {
    const wrapper = mount(UserAgreement);
    (wrapper.vm as unknown as { openAgreementConfirm: () => void }).openAgreementConfirm();
    await wrapper.vm.$nextTick();

    const okButton = Array.from(document.querySelectorAll(".ant-btn")).find((el) => el.textContent === "同意并登录");
    expect(okButton).toBeDefined();
    (okButton as HTMLElement).click();
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect((wrapper.find("input[data-testid='agreement-checkbox']").element as HTMLInputElement).checked).toBe(true);
    expect(isLoginAgreementAccepted(localStorage)).toBe(true);
    expect(wrapper.emitted("confirmAccepted")).toHaveLength(1);
    expect(wrapper.emitted("acceptedChange")).toEqual([[true]]);
  });

  test("二次确认弹窗点击“不同意”：勾选框保持未选中、emit confirmRejected", async () => {
    const wrapper = mount(UserAgreement);
    (wrapper.vm as unknown as { openAgreementConfirm: () => void }).openAgreementConfirm();
    await wrapper.vm.$nextTick();

    const cancelButton = Array.from(document.querySelectorAll(".ant-btn")).find((el) => el.textContent === "不同意");
    expect(cancelButton).toBeDefined();
    (cancelButton as HTMLElement).click();
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect((wrapper.find("input[data-testid='agreement-checkbox']").element as HTMLInputElement).checked).toBe(false);
    expect(isLoginAgreementAccepted(localStorage)).toBe(false);
    expect(wrapper.emitted("confirmRejected")).toHaveLength(1);
  });
});
