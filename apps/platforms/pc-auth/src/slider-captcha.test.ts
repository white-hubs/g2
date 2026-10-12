import { describe, expect, test } from "bun:test";

import { aesEncryptEcb } from "./crypto";
import { CAPTCHA_COORD_BASE_WIDTH, buildCaptchaVerification, buildPointJson, isCaptchaSuccess, scaleSlideDistance } from "./slider-captcha";

describe("scaleSlideDistance", () => {
  test("按旧仓公式把 UI 滑动距离换算到 310 基准宽", () => {
    expect(scaleSlideDistance(165, 330)).toBeCloseTo(155, 5);
    expect(scaleSlideDistance(310, CAPTCHA_COORD_BASE_WIDTH)).toBe(310);
  });

  test("imgWidth 非法时原样返回", () => {
    expect(scaleSlideDistance(100, 0)).toBe(100);
  });
});

describe("buildPointJson / buildCaptchaVerification", () => {
  test("有 secretKey 时用 AES-ECB 加密，密文可与 aesEncryptEcb 对得上", () => {
    const secret = "BtVG6l56uShESf3q";
    const pointJson = buildPointJson(165, 330, secret);
    const expectedPoint = aesEncryptEcb(JSON.stringify({ x: 155, y: 5 }), secret);
    expect(pointJson).toBe(expectedPoint);

    const verification = buildCaptchaVerification("tok-1", 165, 330, secret);
    const expectedVerification = aesEncryptEcb(`tok-1---${JSON.stringify({ x: 155, y: 5 })}`, secret);
    expect(verification).toBe(expectedVerification);
  });

  test("无 secretKey 时返回明文 JSON / token---JSON", () => {
    expect(buildPointJson(100, 310, "")).toBe(JSON.stringify({ x: 100, y: 5 }));
    expect(buildCaptchaVerification("t", 100, 310, "")).toBe(`t---${JSON.stringify({ x: 100, y: 5 })}`);
  });
});

describe("isCaptchaSuccess", () => {
  test("仅 repCode === 0000 视为成功", () => {
    expect(isCaptchaSuccess("0000")).toBe(true);
    expect(isCaptchaSuccess("0001")).toBe(false);
    expect(isCaptchaSuccess(undefined)).toBe(false);
  });
});
