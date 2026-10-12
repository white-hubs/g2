/**
 * 与 `@g2-platform/pc-chrome` 约定同一事件名：壳发布、chrome 用 message.error 展示。
 * 不静态 import pc-ui（公共 UI 须 Profile 动态装，见 ADR-0050）。
 *
 * 注意：网关/微服务发现类 503（如 todoCenter 无实例）的弹窗**不**走此事件，属子应用旧拦截器；
 * 见 `@g2-platform/http` `HttpServiceError` 上的 TODO(migration · UX)（顶部轻量横幅方向）。
 */
export const SHELL_NAVIGATE_ERROR_EVENT = "shell:navigate-error";
