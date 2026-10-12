import CryptoJS from "crypto-js";

/**
 * 迁移自旧仓 legacy/bimops-fe-web-migrate/src/utils/crypto.js 的 AES-CBC 加解密。
 * 密钥/偏移量固定为 "comguheyuncloud1"（旧仓硬编码值，未提供服务端协商密钥的机制）；
 * 这里原样保留，因为后端解密逻辑不会随这次前端迁移变化，密钥一旦不一致后端会解密失败。
 *
 * 仅供本包（`@g2-platform/pc-auth`）登录场景内部使用，不通过 package exports 对外暴露——
 * `crypto-js` 完全封装在这一层，消费方（LoginPage.vue 等）只拿到 encrypt/decrypt 这两个
 * 自建函数，不直接依赖 `crypto-js`（ADR-0040，见 tooling/dependency-governance/whitelist.json
 * 的 encapsulatedBy.crypto-js 登记）。
 *
 * 残留风险：本次迁移没有后端源码访问权限，无法重新核对网关 `pwd_encrypt` 端当前
 * 实际期望的密钥来源是否仍是这个旧仓硬编码值（也可能后端已切换为协商密钥或其它算法）。
 * 这里的假设是「前端沿用旧仓 encrypt 逻辑，后端契约未变」；一旦密钥不一致，登录会在
 * 服务端解密失败并报错，不会静默明文泄露，但需要与后端另行确认才能消除这个不确定性。
 */
const FIXED_KEY = "comguheyuncloud1";

function keyBytesFor(keyOverride: string | undefined): CryptoJS.lib.WordArray {
  return CryptoJS.enc.Utf8.parse(keyOverride ?? FIXED_KEY);
}

/**
 * `keyOverride`：迁移自旧仓 `src/utils/crypto.js` 的 `encrypt(word, keyParam)` ——`keyParam` 同时当
 * 密钥和偏移量用，可选，不传时回退到固定密钥 `comguheyuncloud1`。找回密码流程（`login-change.vue`
 * 第 176-177 行 `Crypto.encrypt(formState.password, props.data?.secret)`）会传入后端在
 * `getPasswordToken` 响应里给的会话级 `secret`，与登录加密使用的固定密钥是两套不同的场景，
 * 因此这里用可选参数扩展而不是新开一个函数——参数默认值保证现有调用方（`LoginPage.vue`/
 * `remember-me.ts`）行为不变。
 */
export function encrypt(plaintext: string, keyOverride?: string): string {
  const keyBytes = keyBytesFor(keyOverride);
  const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(plaintext), keyBytes, {
    iv: keyBytes,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString();
}

export function decrypt(ciphertext: string, keyOverride?: string): string {
  const keyBytes = keyBytesFor(keyOverride);
  const decrypted = CryptoJS.AES.decrypt(ciphertext, keyBytes, {
    iv: keyBytes,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * 迁移自旧仓 `verifition/utils/ase.js` 的 `aesEncrypt`：滑块验证码校验用 AES-ECB（密钥由
 * `/api/ouaa/captcha/get` 响应的 `secretKey` 下发），与登录密码的 AES-CBC 固定密钥是两套算法。
 * 默认密钥 `XwKsGlMcdPMEhR1B` 仅在后端未返回 `secretKey` 时使用（与旧仓一致）。
 */
export function aesEncryptEcb(plaintext: string, keyWord = "XwKsGlMcdPMEhR1B"): string {
  const key = CryptoJS.enc.Utf8.parse(keyWord);
  const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(plaintext), key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString();
}
