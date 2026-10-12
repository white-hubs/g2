import { describe, expect, test } from "bun:test";

import { displayNameFromAccessToken, displayNameFromUserInfo, legacyUserInfoFromProfile, userIdFromAccessToken } from "./user-profile";

function makeJwt(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `hdr.${body}.sig`;
}

describe("displayNameFromUserInfo", () => {
  test("优先使用 name", () => {
    expect(displayNameFromUserInfo({ name: "超级管理员3", username: "17311369782" })).toBe("超级管理员3");
  });

  test("name 为空时回退 username", () => {
    expect(displayNameFromUserInfo({ name: "", username: "17311369782" })).toBe("17311369782");
    expect(displayNameFromUserInfo({ username: "alice" })).toBe("alice");
  });

  test("兼容旧仓 axios 未解包形态 { code:200, data:{ name } }", () => {
    expect(
      displayNameFromUserInfo({
        code: 200,
        data: { name: "超级管理员3", username: "17311369782" },
      }),
    ).toBe("超级管理员3");
  });

  test("兼容 data 包一层与 nickName/realName", () => {
    expect(displayNameFromUserInfo({ data: { name: "超级管理员3", username: "17311369782" } })).toBe("超级管理员3");
    expect(displayNameFromUserInfo({ nickName: "小王" })).toBe("小王");
    expect(displayNameFromUserInfo({ data: { realName: "张三" } })).toBe("张三");
  });

  test("无效输入返回空串", () => {
    expect(displayNameFromUserInfo(null)).toBe("");
    expect(displayNameFromUserInfo(undefined)).toBe("");
    expect(displayNameFromUserInfo({})).toBe("");
    expect(displayNameFromUserInfo({ name: 1, username: null })).toBe("");
  });
});

describe("displayNameFromAccessToken", () => {
  test("优先 JWT name，而不是 user_name 手机号", () => {
    const token = makeJwt({ name: "超级管理员3", user_name: "17311369782", sub: "client_2" });
    expect(displayNameFromAccessToken(token)).toBe("超级管理员3");
  });

  test("无 name 时回退 user_name，再 sub", () => {
    expect(displayNameFromAccessToken(makeJwt({ user_name: "17311369782", sub: "client_2" }))).toBe("17311369782");
    expect(displayNameFromAccessToken(makeJwt({ sub: "client_2" }))).toBe("client_2");
  });

  test("畸形 token 返回空串", () => {
    expect(displayNameFromAccessToken("")).toBe("");
    expect(displayNameFromAccessToken("not-a-jwt")).toBe("");
  });
});

describe("userIdFromAccessToken", () => {
  test("从 JWT id 取出字符串（兼容数字 id，且保留雪花精度）", () => {
    expect(userIdFromAccessToken(makeJwt({ id: "1478636886984523777" }))).toBe("1478636886984523777");
    // 直接拼 payload，避免 JSON.stringify 把超大数字弄丢精度后再测
    const body = Buffer.from('{"id":1478636886984523777,"name":"x"}', "utf8").toString("base64url");
    expect(userIdFromAccessToken(`hdr.${body}.sig`)).toBe("1478636886984523777");
  });

  test("无 id 或畸形 token 返回空串", () => {
    expect(userIdFromAccessToken(makeJwt({ name: "x" }))).toBe("");
    expect(userIdFromAccessToken("")).toBe("");
  });
});

describe("legacyUserInfoFromProfile", () => {
  test("解包 { code, data } 并保留含 id 的用户对象", () => {
    expect(
      legacyUserInfoFromProfile({
        code: 200,
        data: { id: "u1", name: "超级管理员3", username: "17311369782" },
      }),
    ).toEqual({ id: "u1", name: "超级管理员3", username: "17311369782" });
  });

  test("顶层已有 id 时原样返回；无 id 返回 null", () => {
    expect(legacyUserInfoFromProfile({ id: "u2", name: "a" })).toEqual({ id: "u2", name: "a" });
    expect(legacyUserInfoFromProfile({ name: "no-id" })).toBeNull();
    expect(legacyUserInfoFromProfile(null)).toBeNull();
  });
});
