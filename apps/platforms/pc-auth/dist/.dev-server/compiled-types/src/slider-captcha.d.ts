/**
 * 滑块拼图验证码：经 `@g2-client/ouaa` 的 getCaptcha / checkCaptcha
 * （迁移自旧仓 `verifition/api/index.js` + `Verify/VerifySlide.vue`）。
 *
 * 缺口坐标由后端烘焙进图片；前端只负责把滑动距离按旧仓公式缩放到 310 基准宽后，
 * 用 `secretKey` 做 AES-ECB 加密再提交校验。`repCode === "0000"` 才算通过。
 */
import type { OuaaClient } from "@g2-contract/ouaa";
export declare const CAPTCHA_TYPE_BLOCK_PUZZLE = "blockPuzzle";
/** 旧仓 VerifySlide 里把滑动距离换算到该基准宽度再提交（`moveLeftDistance * 310 / imgWidth`）。 */
export declare const CAPTCHA_COORD_BASE_WIDTH = 310;
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
export declare function isCaptchaSuccess(repCode: string | undefined): boolean;
/** 把 UI 上的滑动像素距离换算成后端校验用的 x（旧仓 VerifySlide.end 第 254-255 行）。 */
export declare function scaleSlideDistance(moveLeftPx: number, imgWidthPx: number): number;
export declare function buildPointJson(moveLeftPx: number, imgWidthPx: number, secretKey: string): string;
export declare function buildCaptchaVerification(token: string, moveLeftPx: number, imgWidthPx: number, secretKey: string): string;
export declare function fetchCaptchaChallenge(ouaa: CaptchaOuaa): Promise<CaptchaGetData>;
export declare function checkCaptchaSlide(ouaa: CaptchaOuaa, input: {
    token: string;
    secretKey: string;
    moveLeftPx: number;
    imgWidthPx: number;
}): Promise<{
    ok: true;
    captchaVerification: string;
} | {
    ok: false;
    message: string;
}>;
//# sourceMappingURL=slider-captcha.d.ts.map