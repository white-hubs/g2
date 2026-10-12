/**
 * 对齐 `@ghcloud/cube-theme` 的 antd3 legacy 色板（themes-legacy/antd3/*）。
 * 子应用 less（antd3-varlable.less）依赖 `--cube-theme-var--*`，不能只写主色。
 */
export type SkinThemeVarMap = Record<string, string>;
/** key = SkinPreset.key */
export declare const ANTD3_SKIN_THEME_VARS: Record<string, SkinThemeVarMap>;
export declare function resolveAntd3ThemeVars(skinKey: string): SkinThemeVarMap;
/** 生成注入到 document 的主题 CSS（变量 + 子应用桥接）。 */
export declare function buildSkinThemeCss(skinKey: string, chromePrimary: string): string;
//# sourceMappingURL=skin-theme-vars.d.ts.map