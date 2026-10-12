import { BUILT_IN_THEMES } from "@g2-platform/theme-contract";
import { describe, expect, test } from "bun:test";

import { ZhConfigProvider, createAntdThemeConfig } from "./zh-config-provider";

describe("ZhConfigProvider", () => {
  test("导出皮肤感知的 ConfigProvider 包装（驱动 antdv4 colorPrimary）", () => {
    expect(ZhConfigProvider).toBeDefined();
    expect((ZhConfigProvider as { name?: string }).name).toBe("ZhConfigProvider");
  });

  test("将亮暗主题映射到表单、表格、弹层和导航组件", () => {
    for (const theme of BUILT_IN_THEMES) {
      const config = createAntdThemeConfig(theme.tokens);
      expect(config.token?.colorBgLayout).toBe(theme.tokens.pageBg);
      expect(config.token?.colorTextLightSolid).toBe(theme.tokens.buttonText);
      expect(config.components?.Button?.colorTextLightSolid).toBe(theme.tokens.buttonText);
      expect(config.components?.Input?.colorBgContainer).toBe(theme.tokens.inputBg);
      expect(config.components?.Table?.colorFillAlter).toBe(theme.tokens.tableHeaderBg);
      expect(config.components?.Modal?.colorBgElevated).toBe(theme.tokens.elevatedBg);
      expect(config.token?.colorBgMask).toBe("rgba(0, 0, 0, 0.45)");
      expect(config.components?.DatePicker?.colorPrimary).toBe(theme.tokens.primary);
      expect(config.components?.Tabs?.colorPrimary).toBe(theme.tokens.primary);
      expect(config.components?.Tree?.controlItemBgActive).toBe(theme.tokens.primarySoft);
    }
  });
});
