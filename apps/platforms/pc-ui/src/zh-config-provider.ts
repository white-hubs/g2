import type { ThemeTokens } from "@g2-platform/theme-contract";
import { ConfigProvider } from "ant-design-vue";
import type { ThemeConfig } from "ant-design-vue/es/config-provider/context";
import zhCN from "ant-design-vue/es/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { defineComponent, h } from "vue";

import { useThemeTokens } from "./use-theme-tokens";

dayjs.locale("zh-cn");

/**
 * `colorBgMask` 是遮罩颜色，不能直接使用不透明的十六进制色值；否则 Modal
 * 打开时会把整个页面覆盖成纯黑。主题契约中保留基础遮罩色，由这里统一附加透明度。
 */
function maskColor(color: string, opacity = 0.45): string {
  const normalized = color.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

/**
 * 通用组件只能从语义 Token 读取颜色。组件级覆盖让弹层、表格和日期选择器
 * 即使挂载到 body（Teleport）也使用与页面相同的亮/暗主题。
 */
export function createAntdThemeConfig(tokens: ThemeTokens): ThemeConfig {
  return {
    token: {
      colorPrimary: tokens.primary,
      colorPrimaryActive: tokens.primaryActive,
      colorPrimaryHover: tokens.primaryHover,
      colorBgBase: tokens.surfaceBg,
      colorBgContainer: tokens.surfaceBg,
      colorBgContainerDisabled: tokens.fillSecondary,
      colorBgElevated: tokens.elevatedBg,
      colorBgLayout: tokens.pageBg,
      colorBgMask: maskColor(tokens.maskBg),
      colorBgTextHover: tokens.fillSecondary,
      colorBorder: tokens.border,
      colorBorderSecondary: tokens.borderSecondary,
      colorFillAlter: tokens.tableHeaderBg,
      colorFillSecondary: tokens.fillSecondary,
      colorFillContentHover: tokens.primarySoft,
      colorInfo: tokens.info,
      colorLink: tokens.primary,
      colorLinkActive: tokens.primaryActive,
      colorLinkHover: tokens.primaryHover,
      colorSuccess: tokens.success,
      colorText: tokens.text,
      colorTextDescription: tokens.textSecondary,
      colorTextDisabled: tokens.textTertiary,
      colorTextLightSolid: tokens.buttonText,
      colorTextPlaceholder: tokens.placeholder,
      colorWarning: tokens.warning,
      colorError: tokens.danger,
      controlItemBgActive: tokens.primarySoft,
      controlItemBgActiveHover: tokens.primarySoft,
      controlItemBgHover: tokens.fillSecondary,
      controlOutline: tokens.focusRing,
    },
    components: {
      Button: {
        colorPrimary: tokens.primary,
        colorPrimaryActive: tokens.primaryActive,
        colorPrimaryHover: tokens.primaryHover,
        colorTextLightSolid: tokens.buttonText,
      },
      Checkbox: { colorPrimary: tokens.primary, colorPrimaryHover: tokens.primaryHover, colorPrimaryActive: tokens.primaryActive },
      DatePicker: {
        colorBgContainer: tokens.surfaceBg,
        colorBgElevated: tokens.elevatedBg,
        colorPrimary: tokens.primary,
        colorPrimaryHover: tokens.primaryHover,
      },
      Dropdown: { colorBgElevated: tokens.elevatedBg, colorFillContentHover: tokens.fillSecondary },
      Input: {
        colorBgContainer: tokens.inputBg,
        colorBorder: tokens.border,
        colorPrimary: tokens.primary,
        controlOutline: tokens.focusRing,
      },
      Modal: { colorBgElevated: tokens.elevatedBg, colorText: tokens.text, colorBorderSecondary: tokens.borderSecondary },
      Pagination: { colorBgContainer: tokens.surfaceBg, colorPrimary: tokens.primary, colorText: tokens.text },
      Popover: { colorBgElevated: tokens.elevatedBg, colorText: tokens.text },
      Select: {
        colorBgContainer: tokens.inputBg,
        colorBgElevated: tokens.elevatedBg,
        colorPrimary: tokens.primary,
        colorPrimaryHover: tokens.primaryHover,
      },
      Table: {
        colorBgContainer: tokens.tableRowBg,
        colorFillAlter: tokens.tableHeaderBg,
        colorFillContentHover: tokens.fillSecondary,
        colorBorderSecondary: tokens.borderSecondary,
        colorText: tokens.text,
      },
      Tabs: {
        colorPrimary: tokens.primary,
        colorPrimaryHover: tokens.primaryHover,
        colorText: tokens.text,
        colorTextDescription: tokens.textSecondary,
      },
      Tree: { colorBgContainer: tokens.surfaceBg, colorPrimary: tokens.primary, controlItemBgActive: tokens.primarySoft },
    },
  };
}

/**
 * 对齐旧仓 CubeConfigProvider：默认中文 locale + 跟随 chrome 换肤的 antdv4 Design Token。
 * antdv4 CSS-in-JS 不读 `--ant-*` / `--cube-theme-var--*`，必须把 `colorPrimary` 传入 theme.token。
 */
export const ZhConfigProvider = defineComponent({
  name: "ZhConfigProvider",
  setup(_, { slots }) {
    const tokens = useThemeTokens();

    return () =>
      h(
        ConfigProvider,
        {
          locale: zhCN,
          theme: createAntdThemeConfig(tokens.value),
        },
        () => slots.default?.(),
      );
  },
});

export { zhCN };
