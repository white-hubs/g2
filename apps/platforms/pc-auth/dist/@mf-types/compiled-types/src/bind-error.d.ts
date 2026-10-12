import { HttpServiceError } from "@g2-platform/http/client";
/**
 * 手机号/微信登录遇到"账号未绑定"时，旧仓后端约定用 HTTP 409 表示（`login-phone.vue`/
 * `login-wechat.vue` 里的 `token.status === 409` 分支，第 282-286、145-150 行）；`@g2-platform/http`
 * 的 `createHttpClient` 对非 2xx 响应统一 `throw normalizeErrorResponse(...)`（一个 `HttpServiceError`），
 * 不是像旧仓自家 `request()` 封装那样把响应体原样 resolve 出来，所以这里改成"捕获异常再判断
 * `httpStatus === 409`"，而不是照抄旧仓"resolve 出来的对象上读 status 字段"的写法。
 */
export declare function isAccountNotBoundError(error: unknown): error is HttpServiceError;
/**
 * 从 409 响应体里取出后续绑定流程需要的 `tokenId`。
 *
 * 残留不确定性（如实标注，不编造）：旧仓 `login-phone.vue` 直接把 `token.details` 整体
 * 当字符串传给 `emit('bind', token.details)`，再原样传给 `account-bind-modal.vue` 的
 * `tokenId` prop（类型 `String`）——由此推断 `details` 字段本身就是一个字符串 tokenId，
 * 但没有后端接口文档或真实响应样例可核实这个假设，也不排除 `details` 实际是一个对象、
 * 真正的 tokenId 在其某个子字段里。这里按"最直接的读法"实现：`details` 是字符串就直接用，
 * 是对象且有字符串 `tokenId`/`details` 子字段就取那个，否则返回空字符串（不抛错，让调用方
 * 决定如何提示用户），后续需要和后端另行确认真实响应体形状。
 */
export declare function extractBindTokenId(errorDetail: unknown): string;
//# sourceMappingURL=bind-error.d.ts.map