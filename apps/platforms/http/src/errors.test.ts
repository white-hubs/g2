import { describe, expect, test } from "bun:test";

import { HttpServiceError, normalizeErrorResponse } from "./errors";

describe("HttpServiceError / normalizeErrorResponse", () => {
  test("从新式后端错误 JSON（{code, message}）归一化", () => {
    const error = normalizeErrorResponse(401, { code: "AUTH_EXPIRED", message: "token expired" });
    expect(error).toBeInstanceOf(HttpServiceError);
    expect(error.errorCode).toBe("AUTH_EXPIRED");
    expect(error.errorMessage).toBe("token expired");
    expect(error.httpStatus).toBe(401);
  });

  test("从旧式后端错误 JSON（{error_description}）归一化", () => {
    const error = normalizeErrorResponse(500, { error_description: "boom" });
    expect(error.errorCode).toBe("500");
    expect(error.errorMessage).toBe("boom");
  });

  test("既没有已知字段时，用 http status 兜底", () => {
    const error = normalizeErrorResponse(503, {});
    expect(error.errorCode).toBe("503");
    expect(error.errorMessage).toContain("503");
  });

  test("errorDetail 保留原始响应体供上层需要时展开", () => {
    const body = { code: "X", message: "y", details: { field: "phone" } };
    const error = normalizeErrorResponse(400, body);
    expect(error.errorDetail).toEqual(body);
  });
});
