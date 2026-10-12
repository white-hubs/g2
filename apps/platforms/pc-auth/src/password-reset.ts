import { isValidPhoneNumber } from "./phone";

/**
 * 找回密码「验证身份」步骤的账号格式校验，迁移自旧仓 `login-forget.vue` 的 `validateAccount`
 * （第 124-140 行）：手机号或邮箱二选一即可，正则原样保留。
 */
const EMAIL_PATTERN = /^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/;

export function isValidAccountForPasswordRecovery(value: string): boolean {
  if (value === "") {
    return false;
  }
  return isValidPhoneNumber(value) || EMAIL_PATTERN.test(value);
}

/**
 * 新密码强度校验，迁移自旧仓 `login-change.vue` 的 `validatePassword`（第 121-135 行）：
 * 必须同时包含大写字母、小写字母、数字、指定特殊字符集合（`~!@#$%^&*,.&<=[`，注意集合里不含
 * `]`——旧仓正则字面就是这样写的，这里如实保留，不额外补一个 `]` 进去），且主体部分至少 7 位
 * （四个零宽 lookahead 各自不消耗字符，`{7,}` 是主体长度下限；旧仓 UI 文案写"大于8位"，但正则
 * 实际写的是 `{7,}`，两者不一致——这是旧仓本身的文案/正则不一致，原样保留正则行为，不擅自改成 8）。
 * 旧仓正则原文里的 `\a`（如 `[\a-zA-Z...]`）在 JS 正则中不是合法转义，会被当作字面字符 "a" 处理，
 * 且它出现的位置正好是 "a-z" 范围的起点，所以对最终匹配结果没有影响——这里去掉 `\a` 直接写成
 * `a-z`，效果与旧仓正则完全一致，只是不逐字节保留这个在 JS 里语义正确但容易让人误读的写法。
 */
const PASSWORD_STRENGTH_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[~!@#$%^&*,.&<=[])[a-zA-Z\d~!@#$%^&*,.&<=[]{7,}$/;

export function isPasswordStrongEnough(value: string): boolean {
  return PASSWORD_STRENGTH_PATTERN.test(value);
}

export function doPasswordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}
