/**
 * 手机号格式校验，迁移自旧仓 `login-phone.vue` 表单规则（第 187-192 行）的正则
 * `/^1[3-9]\d{9}$/`，原样保留（大陆手机号号段规则，不引入额外的国际号码校验范围）。
 */
const CHINA_MAINLAND_MOBILE_PATTERN = /^1[3-9]\d{9}$/;

export function isValidPhoneNumber(value: string): boolean {
  return CHINA_MAINLAND_MOBILE_PATTERN.test(value);
}
