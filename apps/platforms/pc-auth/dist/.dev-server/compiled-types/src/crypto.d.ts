/**
 * `keyOverride`：迁移自旧仓 `src/utils/crypto.js` 的 `encrypt(word, keyParam)` ——`keyParam` 同时当
 * 密钥和偏移量用，可选，不传时回退到固定密钥 `comguheyuncloud1`。找回密码流程（`login-change.vue`
 * 第 176-177 行 `Crypto.encrypt(formState.password, props.data?.secret)`）会传入后端在
 * `getPasswordToken` 响应里给的会话级 `secret`，与登录加密使用的固定密钥是两套不同的场景，
 * 因此这里用可选参数扩展而不是新开一个函数——参数默认值保证现有调用方（`LoginPage.vue`/
 * `remember-me.ts`）行为不变。
 */
export declare function encrypt(plaintext: string, keyOverride?: string): string;
export declare function decrypt(ciphertext: string, keyOverride?: string): string;
/**
 * 迁移自旧仓 `verifition/utils/ase.js` 的 `aesEncrypt`：滑块验证码校验用 AES-ECB（密钥由
 * `/api/ouaa/captcha/get` 响应的 `secretKey` 下发），与登录密码的 AES-CBC 固定密钥是两套算法。
 * 默认密钥 `XwKsGlMcdPMEhR1B` 仅在后端未返回 `secretKey` 时使用（与旧仓一致）。
 */
export declare function aesEncryptEcb(plaintext: string, keyWord?: string): string;
//# sourceMappingURL=crypto.d.ts.map