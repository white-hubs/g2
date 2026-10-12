/**
 * 滑块拼图验证码：经 `@g2-client/ouaa` 的 getCaptcha / checkCaptcha
 * （迁移自旧仓 `verifition/api/index.js` + `Verify/VerifySlide.vue`）。
 *
 * 缺口坐标由后端烘焙进图片；前端只负责把滑动距离按旧仓公式缩放到 310 基准宽后，
 * 用 `secretKey` 做 AES-ECB 加密再提交校验。`repCode === "0000"` 才算通过。
 */

import type { OuaaClient } from "@g2-contract/ouaa";

import { aesEncryptEcb } from "./crypto";

export const CAPTCHA_TYPE_BLOCK_PUZZLE = "blockPuzzle";
/** 旧仓 VerifySlide 里把滑动距离换算到该基准宽度再提交（`moveLeftDistance * 310 / imgWidth`）。 */
export const CAPTCHA_COORD_BASE_WIDTH = 310;

export interface CaptchaGetData {
  originalImageBase64: string;
  jigsawImageBase64: string;
  token: string;
  secretKey: string;
}

export interface CaptchaApiResponse<T> {
  repCode: string;
  repMsg?: string;
  repData?: T;
}

export type CaptchaOuaa = Pick<OuaaClient, "getCaptcha" | "checkCaptcha">;

export function isCaptchaSuccess(repCode: string | undefined): boolean {
  return repCode === "0000";
}

/** 把 UI 上的滑动像素距离换算成后端校验用的 x（旧仓 VerifySlide.end 第 254-255 行）。 */
export function scaleSlideDistance(moveLeftPx: number, imgWidthPx: number): number {
  if (imgWidthPx <= 0) {
    return moveLeftPx;
  }
  return (moveLeftPx * CAPTCHA_COORD_BASE_WIDTH) / imgWidthPx;
}

export function buildPointJson(moveLeftPx: number, imgWidthPx: number, secretKey: string): string {
  const x = scaleSlideDistance(moveLeftPx, imgWidthPx);
  const payload = JSON.stringify({ x, y: 5 });
  return secretKey ? aesEncryptEcb(payload, secretKey) : payload;
}

export function buildCaptchaVerification(token: string, moveLeftPx: number, imgWidthPx: number, secretKey: string): string {
  const x = scaleSlideDistance(moveLeftPx, imgWidthPx);
  const raw = `${token}---${JSON.stringify({ x, y: 5 })}`;
  return secretKey ? aesEncryptEcb(raw, secretKey) : raw;
}

export async function fetchCaptchaChallenge(ouaa: CaptchaOuaa): Promise<CaptchaGetData> {
  const res = (await ouaa.getCaptcha({ captchaType: CAPTCHA_TYPE_BLOCK_PUZZLE })) as CaptchaApiResponse<CaptchaGetData>;
  if (!isCaptchaSuccess(res.repCode) || !res.repData) {
    throw new Error(res.repMsg || "获取验证码失败");
  }
  return res.repData;
}

export async function checkCaptchaSlide(
  ouaa: CaptchaOuaa,
  input: { token: string; secretKey: string; moveLeftPx: number; imgWidthPx: number },
): Promise<{ ok: true; captchaVerification: string } | { ok: false; message: string }> {
  const pointJson = buildPointJson(input.moveLeftPx, input.imgWidthPx, input.secretKey);
  const res = (await ouaa.checkCaptcha({
    captchaType: CAPTCHA_TYPE_BLOCK_PUZZLE,
    pointJson,
    token: input.token,
  })) as CaptchaApiResponse<unknown>;
  if (!isCaptchaSuccess(res.repCode)) {
    return { ok: false, message: res.repMsg || "验证失败" };
  }
  return {
    ok: true,
    captchaVerification: buildCaptchaVerification(input.token, input.moveLeftPx, input.imgWidthPx, input.secretKey),
  };
}
