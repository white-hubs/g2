import { describe, expect, test } from "bun:test";

import type { KeyValueStorage } from "./remember-me";
import { SMS_CODE_COOLDOWN_SECONDS, clearSmsCodeSentAt, recordSmsCodeSentAt, remainingCooldownSeconds } from "./sms-countdown";

function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

const KEY = "test:sms-sent-at";

describe("recordSmsCodeSentAt/remainingCooldownSeconds/clearSmsCodeSentAt", () => {
  test("本地没有发送记录时，剩余冷却秒数为 0（可以立即发送）", () => {
    const storage = createMemoryStorage();
    expect(remainingCooldownSeconds(storage, KEY, Date.now())).toBe(0);
  });

  test("刚发送后，剩余冷却秒数约等于完整冷却时长", () => {
    const storage = createMemoryStorage();
    const now = 1_700_000_000_000;
    recordSmsCodeSentAt(storage, KEY, now);
    expect(remainingCooldownSeconds(storage, KEY, now)).toBe(SMS_CODE_COOLDOWN_SECONDS);
  });

  test("发送 10 秒后，剩余冷却秒数减少 10", () => {
    const storage = createMemoryStorage();
    const sentAt = 1_700_000_000_000;
    recordSmsCodeSentAt(storage, KEY, sentAt);
    expect(remainingCooldownSeconds(storage, KEY, sentAt + 10_000)).toBe(SMS_CODE_COOLDOWN_SECONDS - 10);
  });

  test("超过冷却时长后，剩余秒数钳制为 0，不会是负数", () => {
    const storage = createMemoryStorage();
    const sentAt = 1_700_000_000_000;
    recordSmsCodeSentAt(storage, KEY, sentAt);
    expect(remainingCooldownSeconds(storage, KEY, sentAt + 120_000)).toBe(0);
  });

  test("clearSmsCodeSentAt 清除记录后视为可以立即发送", () => {
    const storage = createMemoryStorage();
    const now = Date.now();
    recordSmsCodeSentAt(storage, KEY, now);
    clearSmsCodeSentAt(storage, KEY);
    expect(remainingCooldownSeconds(storage, KEY, now)).toBe(0);
  });

  test("本地记录是非法数字字符串时按无记录处理，不抛错", () => {
    const storage = createMemoryStorage();
    storage.setItem(KEY, "not-a-number");
    expect(remainingCooldownSeconds(storage, KEY, Date.now())).toBe(0);
  });

  test("不同 key 的倒计时互不干扰", () => {
    const storage = createMemoryStorage();
    const now = 1_700_000_000_000;
    recordSmsCodeSentAt(storage, "key-a", now);
    expect(remainingCooldownSeconds(storage, "key-b", now)).toBe(0);
    expect(remainingCooldownSeconds(storage, "key-a", now)).toBe(SMS_CODE_COOLDOWN_SECONDS);
  });

  test("支持自定义冷却时长", () => {
    const storage = createMemoryStorage();
    const sentAt = 1_700_000_000_000;
    recordSmsCodeSentAt(storage, KEY, sentAt);
    expect(remainingCooldownSeconds(storage, KEY, sentAt + 5_000, 30)).toBe(25);
  });
});
