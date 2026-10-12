import { describe, expect, test } from "bun:test";

import { buildAuthHeaders } from "./auth-headers";
import { BIMOPS_PC_TERMINAL } from "./legacy-constants";

describe("buildAuthHeaders", () => {
  test("未登录也带 terminal（对齐旧仓 request 拦截器）", () => {
    expect(buildAuthHeaders({})).toEqual({ terminal: BIMOPS_PC_TERMINAL });
  });

  test("已登录带 Authorization、tenant、terminal", () => {
    expect(buildAuthHeaders({ token: "tok", tenant: "58197260" })).toEqual({
      Authorization: "Bearer tok",
      tenant: "58197260",
      terminal: BIMOPS_PC_TERMINAL,
    });
  });

  test("允许覆盖 terminal", () => {
    expect(buildAuthHeaders({ token: "t", tenant: "tn", terminal: "other-web" }).terminal).toBe("other-web");
  });
});
