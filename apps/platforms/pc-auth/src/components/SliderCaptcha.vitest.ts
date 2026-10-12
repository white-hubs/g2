import { createFakePlatformContext } from "@g2-composition/contract";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, test, vi } from "vitest";

import { ensureClientsFromHttp } from "../test-ensure-clients";
import SliderCaptcha from "./SliderCaptcha";

function mountCaptcha(post: ReturnType<typeof vi.fn>) {
  const http = { get: vi.fn(), post, put: vi.fn(), delete: vi.fn() };
  const ctx = createFakePlatformContext({
    ensureClient: ensureClientsFromHttp(http),
  });
  // Teleport 挂到 body，需要 attachTo 才能在 document 上查到弹层
  return mount(SliderCaptcha, {
    props: { ctx, imgWidth: 330, imgHeight: 155, sliderSize: 50 },
    attachTo: document.body,
  });
}

describe("SliderCaptcha", () => {
  test("show() 打开弹窗并请求 /api/ouaa/captcha/get", async () => {
    const post = vi.fn().mockResolvedValue({
      repCode: "0000",
      repData: {
        originalImageBase64: "bg",
        jigsawImageBase64: "piece",
        token: "tok-1",
        secretKey: "key-1",
      },
    });
    const wrapper = mountCaptcha(post);

    expect(document.querySelector("[data-testid='captcha-mask']")).toBeNull();
    await wrapper.vm.show();
    await flushPromises();

    expect(document.querySelector("[data-testid='captcha-mask']")).not.toBeNull();
    expect(post).toHaveBeenCalledWith("/api/ouaa/captcha/get", { captchaType: "blockPuzzle" });
    expect(document.querySelector("[data-testid='captcha-track']")).not.toBeNull();
    wrapper.unmount();
  });

  test("松手后调用 check，成功则 emit success 并带 captchaVerification", async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({
        repCode: "0000",
        repData: {
          originalImageBase64: "bg",
          jigsawImageBase64: "piece",
          token: "tok-1",
          secretKey: "",
        },
      })
      .mockResolvedValueOnce({ repCode: "0000", repData: {} });
    const wrapper = mountCaptcha(post);
    await wrapper.vm.show();
    await flushPromises();

    wrapper.vm.handlePointerDown({ clientX: 0 });
    wrapper.vm.handlePointerMove({ clientX: 120 });
    await wrapper.vm.handlePointerUp();
    await flushPromises();

    expect(post).toHaveBeenCalledWith("/api/ouaa/captcha/check", expect.objectContaining({ captchaType: "blockPuzzle", token: "tok-1" }));
    expect(wrapper.emitted("success")?.[0]?.[0]).toEqual(expect.objectContaining({ captchaVerification: expect.any(String) }));
    wrapper.unmount();
  });

  test("completeForTest 直接触发 success，供登录页单测绕过真实拖动", async () => {
    const wrapper = mountCaptcha(vi.fn());
    wrapper.vm.completeForTest("mock-key");
    expect(wrapper.emitted("success")?.[0]?.[0]).toEqual({ captchaVerification: "mock-key" });
    wrapper.unmount();
  });

  test("校验失败后 tip 立刻可见，换题后仍保留失败提示直至再次拖动", async () => {
    vi.useFakeTimers();
    const post = vi
      .fn()
      .mockResolvedValueOnce({
        repCode: "0000",
        repData: {
          originalImageBase64: "bg",
          jigsawImageBase64: "piece",
          token: "tok-1",
          secretKey: "",
        },
      })
      .mockResolvedValueOnce({ repCode: "6110", repMsg: "验证失败" })
      .mockResolvedValueOnce({
        repCode: "0000",
        repData: {
          originalImageBase64: "bg2",
          jigsawImageBase64: "piece2",
          token: "tok-2",
          secretKey: "",
        },
      });
    const wrapper = mountCaptcha(post);
    await wrapper.vm.show();
    await flushPromises();

    wrapper.vm.handlePointerDown({ clientX: 0 });
    wrapper.vm.handlePointerMove({ clientX: 120 });
    await wrapper.vm.handlePointerUp();
    await flushPromises();

    const tip = () => document.querySelector("[data-testid='captcha-tip']");
    expect(tip()?.textContent).toMatch(/验证失败/);
    expect(wrapper.emitted("fail")).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(900);
    await flushPromises();
    expect(tip()?.textContent).toMatch(/验证失败/);

    vi.useRealTimers();
    wrapper.unmount();
  });

  test("视觉对齐旧 VerifySlide：圆形蓝柄 + 右下刷新图标，无「向右滑动」文案", async () => {
    const post = vi.fn().mockResolvedValue({
      repCode: "0000",
      repData: {
        originalImageBase64: "bg",
        jigsawImageBase64: "piece",
        token: "tok-1",
        secretKey: "key-1",
      },
    });
    const wrapper = mountCaptcha(post);
    await wrapper.vm.show();
    await flushPromises();

    const slider = document.querySelector("[data-testid='captcha-slider']");
    expect(slider?.classList.contains("pc-auth-slider-captcha__slider--round")).toBe(true);
    expect(document.querySelector("[data-testid='captcha-refresh']")?.getAttribute("aria-label")).toBe("刷新");
    expect(document.body.textContent).not.toContain("向右滑动完成验证");
    expect(document.body.textContent).not.toMatch(/^\s*刷新\s*$/m);

    wrapper.unmount();
  });
});
