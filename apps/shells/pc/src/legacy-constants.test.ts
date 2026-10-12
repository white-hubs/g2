import { describe, expect, test } from "bun:test";

import { BIMOPS_PC_TERMINAL, LEGACY_FOOTER_COPYRIGHT, LEGACY_IMAGE_FALLBACK_SOURCE_PATH } from "./legacy-constants";

describe("legacy-constants", () => {
  test("LEGACY_FOOTER_COPYRIGHT 原样对齐旧仓 config.js 的 copyright 导出", () => {
    expect(LEGACY_FOOTER_COPYRIGHT).toBe("Copyright ©2007-2021 www.guhecloud.com, All Rights Reserved.成都古河云科技有限公司 技术支持");
  });

  test("LEGACY_IMAGE_FALLBACK_SOURCE_PATH 指向旧仓 fallback 常量的真实定义位置", () => {
    expect(LEGACY_IMAGE_FALLBACK_SOURCE_PATH).toBe("legacy/bimops-fe-web-migrate/src/config.js");
  });

  test("BIMOPS_PC_TERMINAL 对齐旧仓 window.config.terminal / CubeTerminalEnum.BUSINESS", () => {
    expect(BIMOPS_PC_TERMINAL).toBe("bimops-manage-web");
  });
});
