/**
 * 皮肤主色读取：对齐 pc-chrome `applySkinTheme` 写入的 localStorage / CustomEvent。
 * ZhConfigProvider 用此驱动 antdv4 `theme.token.colorPrimary`（CSS-in-JS 不读 --ant-* 变量）。
 */
/** 对齐 `@ghcloud/cube-mf-root` / pc-chrome `MF_ROOT_CHANGE_SKIN_EVENT`。 */
export declare const MF_ROOT_CHANGE_SKIN_EVENT = "mf-root-change-skin";
export declare const SKIN_STORAGE_KEY = "g2-pc-skin";
/** 旧仓 `skinColor` JSON：`{ primaryColor, btnPrimaryBg }`。 */
export declare const LEGACY_SKIN_COLOR_KEY = "skinColor";
/** 开河蓝；与 pc-chrome SKIN_PRESETS[0] 一致。 */
export declare const DEFAULT_SKIN_PRIMARY = "#1890ff";
export declare function readStoredPrimaryColor(storage?: Storage | undefined): string;
export declare function primaryColorFromSkinEvent(detail: unknown): string | null;
//# sourceMappingURL=skin-primary.d.ts.map