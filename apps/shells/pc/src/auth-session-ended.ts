/**
 * Shell 在真正执行登出、整页离开会话前发布（ADR-0053）。
 * 与 auth:logout-requested（请求登出）区分；Platform 可 best-effort 订阅，门面不等待。
 */
export const AUTH_SESSION_ENDED_EVENT = "auth:session-ended";
