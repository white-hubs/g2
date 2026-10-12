/**
 * 浏览器/布局库常见的无害运行时噪声（不应记为崩溃，也不应触发 qiankun 加载失败）。
 * 典型：`ResizeObserver loop completed with undelivered notifications.`
 */
export function isBenignRuntimeNoise(message: unknown): boolean {
  const text = normalizeErrorText(message);
  return /ResizeObserver loop/iu.test(text) || /Failed to set an indexed property \[\d+\] on ['"]CSSStyleDeclaration['"]/iu.test(text);
}

export function normalizeErrorText(message: unknown): string {
  if (typeof message === "string") {
    return message;
  }
  if (message instanceof Error) {
    return message.message;
  }
  if (message && typeof message === "object") {
    const record = message as { message?: unknown; reason?: unknown; error?: unknown };
    if (record.message != null) {
      return String(record.message);
    }
    if (record.reason != null) {
      return normalizeErrorText(record.reason);
    }
    if (record.error != null) {
      return normalizeErrorText(record.error);
    }
  }
  return String(message ?? "");
}
