import type { KeyValueStorage } from "./remember-me";

/**
 * 迁移自旧仓 `legacy/bimops-fe-web-migrate/src/views/login/components/user-aggrement.vue`
 * 的 `AGREEMENT_STORAGE_KEY`/`isLoginAgreementAccepted`/`setLoginAgreementAccepted`：本地记住"是否已
 * 同意用户协议及隐私政策"，跨会话保留。key 改用带命名空间前缀的形式，与 `remember-me.ts` 的
 * `REMEMBERED_LOGIN_STORAGE_KEY` 同一约定（避免与旧仓遗留脚本或其它平台的 `localStorage` key 冲突）。
 *
 * `KeyValueStorage` 参数复用 `remember-me.ts` 的定义而不是各自重复声明一份形状相同的接口，
 * 供 `bun test` 传入内存实现，Vue 组件调用时传 `window.localStorage`。
 */
export const AGREEMENT_ACCEPTED_STORAGE_KEY = "g2-pc-auth:agreement-accepted";

export function isLoginAgreementAccepted(storage: KeyValueStorage): boolean {
  return storage.getItem(AGREEMENT_ACCEPTED_STORAGE_KEY) === "true";
}

export function setLoginAgreementAccepted(storage: KeyValueStorage, accepted: boolean): void {
  storage.setItem(AGREEMENT_ACCEPTED_STORAGE_KEY, accepted ? "true" : "false");
}
