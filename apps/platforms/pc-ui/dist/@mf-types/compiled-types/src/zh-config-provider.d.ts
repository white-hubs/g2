import type { ThemeTokens } from "@g2-platform/theme-contract";
import type { ThemeConfig } from "ant-design-vue/es/config-provider/context";
import zhCN from "ant-design-vue/es/locale/zh_CN";
import "dayjs/locale/zh-cn";
/**
 * 通用组件只能从语义 Token 读取颜色。组件级覆盖让弹层、表格和日期选择器
 * 即使挂载到 body（Teleport）也使用与页面相同的亮/暗主题。
 */
export declare function createAntdThemeConfig(tokens: ThemeTokens): ThemeConfig;
/**
 * 对齐旧仓 CubeConfigProvider：默认中文 locale + 跟随 chrome 换肤的 antdv4 Design Token。
 * antdv4 CSS-in-JS 不读 `--ant-*` / `--cube-theme-var--*`，必须把 `colorPrimary` 传入 theme.token。
 */
export declare const ZhConfigProvider: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export { zhCN };
//# sourceMappingURL=zh-config-provider.d.ts.map