import { describe, expect, test } from "vitest";

import { SHELL_CUBE_ICONFONT_URL } from "./cube-iconfont";

describe("cube-iconfont", () => {
  test("壳层精灵走同源 public 路径，不走 /resource CDN 改写前缀", () => {
    expect(SHELL_CUBE_ICONFONT_URL).toBe("/cube-icon/iconfont.js");
    expect(SHELL_CUBE_ICONFONT_URL.startsWith("/resource")).toBe(false);
  });
});
