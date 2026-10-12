/**
 * 微信扫码登录二维码地址构建，迁移自旧仓
 * `legacy/bimops-fe-web-migrate/src/views/login/components/vue-next-wxlogin/wxlogin.vue` 的
 * `setSrc` computed（第 41-56 行）：往微信开放平台的 `qrconnect` 端点拼 appid。
 *
 * appid / redirect_uri 与 cube-test（`login-wechat.vue`）一致，保证二维码可正常渲染；
 * 扫码回调仍落到微信开放平台登记过的域名（cube-test `/login`）。本地 g2 开发态若需接回调，
 * 可在消费方通过 `WechatLogin` 的 `appid` / `redirectUri` props 覆盖。
 */
export declare const WECHAT_APPID = "wxcb94649fa1496d1f";
/** @deprecated 使用 `WECHAT_APPID`；保留别名避免外部 import 瞬时断裂。 */
export declare const WECHAT_APPID_PLACEHOLDER = "wxcb94649fa1496d1f";
/** 与旧仓 / cube-test 一致的授权回调地址（微信开放平台已登记）。 */
export declare const WECHAT_REDIRECT_URI = "https://cube-test.guhecloud.com:3000/login";
export interface WechatQrConnectParams {
    appid: string;
    /** 网页应用固定为 snsapi_login。 */
    scope: string;
    /** 重定向地址，未编码的原始 URL——函数内部负责 UrlEncode，调用方不需要预先编码。 */
    redirectUri: string;
    /** 防 CSRF 用的状态值，授权后原样带回。 */
    state: string;
    /** "black" | "white"，默认 black。 */
    theme?: string;
}
export declare function buildWechatQrConnectUrl(params: WechatQrConnectParams): string;
/**
 * 微信扫码回调后 URL 上会带 `code`/`state` 查询参数（微信开放平台重定向回 `redirect_uri` 时附加）。
 * 迁移自旧仓 `login-wechat.vue` 的 `checkWxLoginCode`（第 174-192 行）。
 */
export interface WechatCallbackQuery {
    code: string | null;
    state: string | null;
}
export declare function shouldHandleWechatCallback(query: WechatCallbackQuery, expectedState: string, lastHandledCode: string | null): boolean;
//# sourceMappingURL=wechat-login.d.ts.map