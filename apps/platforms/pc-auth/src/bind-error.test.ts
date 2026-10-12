import { HttpServiceError } from "@g2-platform/http/client";
import { describe, expect, test } from "bun:test";

import { extractBindTokenId, isAccountNotBoundError } from "./bind-error";

describe("isAccountNotBoundError", () => {
  test("httpStatus 为 409 的 HttpServiceError 判定为账号未绑定", () => {
    const error = new HttpServiceError(409, "409", "account not bound", { details: "token-abc" });
    expect(isAccountNotBoundError(error)).toBe(true);
  });

  test("httpStatus 不是 409 时判定为 false", () => {
    const error = new HttpServiceError(401, "401", "unauthorized", {});
    expect(isAccountNotBoundError(error)).toBe(false);
  });

  test("非 HttpServiceError（如普通 Error/网络异常）判定为 false", () => {
    expect(isAccountNotBoundError(new Error("network error"))).toBe(false);
    expect(isAccountNotBoundError("plain string")).toBe(false);
    expect(isAccountNotBoundError(null)).toBe(false);
  });
});

describe("extractBindTokenId", () => {
  test("响应体 details 字段是字符串时直接取用", () => {
    expect(extractBindTokenId({ details: "token-abc" })).toBe("token-abc");
  });

  test("响应体 details 是对象且带字符串 tokenId 子字段时取该子字段", () => {
    expect(extractBindTokenId({ details: { tokenId: "token-nested" } })).toBe("token-nested");
  });

  test("响应体 details 是对象且带字符串 details 子字段时取该子字段", () => {
    expect(extractBindTokenId({ details: { details: "token-nested-2" } })).toBe("token-nested-2");
  });

  test("响应体不是对象、为 null、或没有可用 details 时返回空字符串（不抛错）", () => {
    expect(extractBindTokenId(null)).toBe("");
    expect(extractBindTokenId("plain string")).toBe("");
    expect(extractBindTokenId({})).toBe("");
    expect(extractBindTokenId({ details: 123 })).toBe("");
    expect(extractBindTokenId({ details: {} })).toBe("");
  });
});
