/**
 * PC chrome 主题色：对齐旧仓 `use-site-setting`。
 * - chrome 消费 `--g2-color-primary`
 * - 遗留子应用（workbench/problems 等）消费 `--cube-theme-var--*`（见 cube-theme antd3-varlable.less）
 * - 另写 `--ant-*` / `localStorage.skinColor`，对齐旧仓兼容路径
 */
import { type ThemeMode, type UserTheme } from "@g2-platform/theme-contract";
import { LEGACY_SKIN_COLOR_KEY, MF_ROOT_CHANGE_SKIN_EVENT, SKIN_STORAGE_KEY } from "./pc-ui-runtime";
export interface SkinPreset {
    key: string;
    label: string;
    color: string;
    mode: ThemeMode;
}
/** 固定内置主题；其他颜色通过“自定义主题”创建。 */
export declare const SKIN_PRESETS: SkinPreset[];
export { SKIN_STORAGE_KEY, LEGACY_SKIN_COLOR_KEY, MF_ROOT_CHANGE_SKIN_EVENT };
export declare function resolveSkinPreset(key: string | null | undefined): SkinPreset;
export declare function readStoredSkinKey(storage?: Storage | undefined): string;
/**
 * 应用主题色：body class + CSS 变量 + 本地持久化。
 * chrome 样式应消费 `--g2-color-primary`，勿再写死 `#1578ff`。
 */
export declare function applySkinTheme(key: string, options?: {
    document?: Document;
    storage?: Storage | undefined;
}): SkinPreset;
/** 自定义完整主题仍沿用旧应用桥接 CSS，同时用完整 Token 覆盖其色板。 */
export declare function applyCustomTheme(theme: UserTheme, options?: {
    document?: Document;
    storage?: Storage | undefined;
}): UserTheme;
/** Platform install / 刷新后恢复上次主题。 */
export declare function restoreSkinTheme(options?: {
    document?: Document;
    storage?: Storage | undefined;
}): SkinPreset;
//# sourceMappingURL=skin-theme.d.ts.map