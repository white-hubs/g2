/**
 * localStorage key 迁移自旧仓 `legacy/bimops-fe-web-migrate/src/views/login/components/login-form.vue`
 * 第 297 行 `localStorage.setItem("cube-login-info", ...)`：只是换成带命名空间前缀的 key（避免与旧仓
 * 遗留脚本或其它平台的 key 冲突），存储语义完全一致——账号明文 + 密码 AES 密文（复用 `./crypto`）。
 *
 * 这个字符串同时是 `apps/shells/pc/src/auth-logout-handler.ts` 清除缓存时用到的约定值：那边不静态
 * import 这个模块（Shell 不应该对 `@g2-platform/pc-auth` 这个独立发版的 MF remote产生构建期耦合，
 * 见该文件顶部注释里 `AUTH_LOGOUT_REQUESTED_EVENT` 的同款理由），两边都各自持有这个字符串常量。
 *
 * 记住密码由环境开关控制（默认关）：`VITE_PC_AUTH_REMEMBER_PASSWORD=true` 时才持久化密码密文。
 */
export declare const REMEMBERED_LOGIN_STORAGE_KEY = "g2-pc-auth:remembered-login";
export interface RememberedLogin {
    account: string;
    password: string;
}
export interface SaveRememberedLoginOptions {
    /** 是否持久化密码（AES）。默认跟随 {@link isRememberPasswordEnabled}。 */
    rememberPassword?: boolean;
}
/** 与 `Storage`（`localStorage`/`sessionStorage`）结构一致的最小接口，方便单测传入内存实现。 */
export interface KeyValueStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
/** 环境/构建开关：默认关闭记住密码；仅 `true` / `"true"` / `"1"` 开启。 */
export declare function isRememberPasswordEnabled(flag?: unknown): boolean;
/** 勾选"记住我"时调用：账号明文；密码仅在开关开启时 AES 后存储。 */
export declare function saveRememberedLogin(storage: KeyValueStorage, login: RememberedLogin, options?: SaveRememberedLoginOptions): void;
/** 页面加载时调用：读不到缓存或账号非法时返回 null；无密码字段时 password 为空串。 */
export declare function loadRememberedLogin(storage: KeyValueStorage): RememberedLogin | null;
/** 取消勾选"记住我"再次提交，或登出时调用：清空本地缓存。 */
export declare function clearRememberedLogin(storage: KeyValueStorage): void;
//# sourceMappingURL=remember-me.d.ts.map