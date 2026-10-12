import { describe, expect, test } from "bun:test";
import CryptoJS from "crypto-js";

import { aesEncryptEcb, decrypt, encrypt } from "./crypto";

/**
 * 迁移自旧仓 legacy/bimops-fe-web-migrate/src/utils/crypto.js 的 encrypt/decrypt，
 * 固定密钥/偏移量 "comguheyuncloud1" 与旧仓保持一致（见 crypto.ts 顶部注释）。
 */
describe("encrypt/decrypt", () => {
  test("加密后可用 decrypt 还原为原始明文", () => {
    const plaintext = "Sup3r$ecret!";
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  test("加密结果不是明文本身，且是合法密文格式（AES-CBC/CryptoJS 默认 OpenSSL Base64 序列化）", () => {
    const plaintext = "Sup3r$ecret!";
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(ciphertext.length).toBeGreaterThan(0);
    expect(/^[A-Za-z0-9+/]+=*$/.test(ciphertext)).toBe(true);
  });

  test("空字符串可加解密还原", () => {
    const ciphertext = encrypt("");
    expect(ciphertext).not.toBe("");
    expect(decrypt(ciphertext)).toBe("");
  });

  test("含特殊字符/多字节字符（中文、emoji、控制字符）的密码可加解密还原", () => {
    const plaintext = "密码!@#$%^&*()_+ 空格\t换行\n中文🔒emoji\"'\\";
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  test("同一明文两次加密结果一致（无随机 salt，因为密钥/IV 固定——这是与后端 pwd_encrypt 约定保持一致所必需的取舍，不是可加密质量意义上的最优实践）", () => {
    const plaintext = "same-input";
    expect(encrypt(plaintext)).toBe(encrypt(plaintext));
  });

  test("与旧仓固定密钥/偏移量 comguheyuncloud1 保持一致：独立构造的 CryptoJS 调用能解出 encrypt() 的产出", () => {
    const plaintext = "check-fixed-key";
    const ciphertext = encrypt(plaintext);
    const keyBytes = CryptoJS.enc.Utf8.parse("comguheyuncloud1");
    const decrypted = CryptoJS.AES.decrypt(ciphertext, keyBytes, {
      iv: keyBytes,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    expect(decrypted.toString(CryptoJS.enc.Utf8)).toBe(plaintext);
  });

  /**
   * 找回密码流程（`ForgotPassword.vue` 第三步）需要用后端下发的会话级 secret 加密新密码，
   * 迁移自旧仓 `crypto.js` 的可选 `keyParam` 用法（见 crypto.ts 顶部注释）。
   */
  describe("encrypt/decrypt 传入自定义 keyOverride（找回密码场景）", () => {
    test("传入 keyOverride 时，用该密钥加解密可还原明文", () => {
      const plaintext = "new-Passw0rd!";
      const customKey = "abcdefG1234567AA";
      const ciphertext = encrypt(plaintext, customKey);
      expect(decrypt(ciphertext, customKey)).toBe(plaintext);
    });

    test("传入 keyOverride 时，加密结果与用固定密钥加密的结果不同", () => {
      const plaintext = "new-Passw0rd!";
      const withFixedKey = encrypt(plaintext);
      const withCustomKey = encrypt(plaintext, "abcdefG1234567AA");
      expect(withCustomKey).not.toBe(withFixedKey);
    });

    test("加密时传 keyOverride，解密时不传（回退固定密钥）无法还原出原始明文", () => {
      const plaintext = "new-Passw0rd!";
      const ciphertext = encrypt(plaintext, "abcdefG1234567AA");
      expect(decrypt(ciphertext)).not.toBe(plaintext);
    });
  });
});

describe("aesEncryptEcb", () => {
  test("与 CryptoJS AES-ECB/Pkcs7 直接计算结果一致（对齐旧仓 ase.js）", () => {
    const word = JSON.stringify({ x: 100, y: 5 });
    const key = "BtVG6l56uShESf3q";
    const expected = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(word), CryptoJS.enc.Utf8.parse(key), {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }).toString();
    expect(aesEncryptEcb(word, key)).toBe(expected);
  });
});
