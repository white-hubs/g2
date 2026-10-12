import type { KeyValueStorage } from "./remember-me";

/**
 * 短信验证码倒计时纯逻辑，供 `PhoneLogin.vue`（登录/绑定发验证码）和 `ForgotPassword.vue`
 * （找回密码验证身份发验证码）共用。迁移自旧仓 `login-phone.vue`（`verify-code-last-send-time`，
 * 第 378-460 行）与 `login-forget.vue`（`forgetPwdLastSendTime`，第 178-260 行）——两处的
 * 倒计时逻辑几乎逐行相同，只是 `localStorage` key 不同，这里抽成参数化的共享纯函数，
 * 避免同一段"计算剩余秒数/记录发送时间"逻辑抄两遍。
 *
 * `key` 由调用方传入（各自的业务场景用不同 key，互不干扰，同一浏览器同时有多个倒计时不会串）。
 */
export const SMS_CODE_COOLDOWN_SECONDS = 60;

export function recordSmsCodeSentAt(storage: KeyValueStorage, key: string, sentAtMs: number): void {
  storage.setItem(key, String(sentAtMs));
}

export function clearSmsCodeSentAt(storage: KeyValueStorage, key: string): void {
  storage.removeItem(key);
}

/**
 * 返回距上次发送已过去的毫秒数；本地没有记录时返回 null（表示可以立即发送，不在冷却期内）。
 */
function elapsedMsSinceLastSend(storage: KeyValueStorage, key: string, nowMs: number): number | null {
  const raw = storage.getItem(key);
  if (raw === null) {
    return null;
  }
  const sentAtMs = Number.parseInt(raw, 10);
  if (Number.isNaN(sentAtMs)) {
    return null;
  }
  return nowMs - sentAtMs;
}

/**
 * 计算剩余冷却秒数（>0 表示还在冷却期内，不能重新发送；0 表示可以发送）。
 * 冷却期已过时不会自动清除本地记录——调用方（组件的 onMounted/定时器 tick）负责在
 * 观察到 remaining<=0 时调用 `clearSmsCodeSentAt` 清理，与旧仓两处实现的清理时机一致。
 */
export function remainingCooldownSeconds(
  storage: KeyValueStorage,
  key: string,
  nowMs: number,
  cooldownSeconds: number = SMS_CODE_COOLDOWN_SECONDS,
): number {
  const elapsedMs = elapsedMsSinceLastSend(storage, key, nowMs);
  if (elapsedMs === null) {
    return 0;
  }
  const remaining = cooldownSeconds - Math.floor(elapsedMs / 1000);
  return Math.max(remaining, 0);
}
