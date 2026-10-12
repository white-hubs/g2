/**
 * 皮肤主色读取：对齐 pc-chrome `applySkinTheme` 写入的 localStorage / CustomEvent。
 * ZhConfigProvider 用此驱动 antdv4 `theme.token.colorPrimary`（CSS-in-JS 不读 --ant-* 变量）。
 */

/** 对齐 `@ghcloud/cube-mf-root` / pc-chrome `MF_ROOT_CHANGE_SKIN_EVENT`。 */
export const MF_ROOT_CHANGE_SKIN_EVENT = "mf-root-change-skin";

export const SKIN_STORAGE_KEY = "g2-pc-skin";
/** 旧仓 `skinColor` JSON：`{ primaryColor, btnPrimaryBg }`。 */
export const LEGACY_SKIN_COLOR_KEY = "skinColor";

/** 开河蓝；与 pc-chrome SKIN_PRESETS[0] 一致。 */
export const DEFAULT_SKIN_PRIMARY = "#1890ff";

/** 与 pc-chrome `SKIN_PRESETS` 主色对齐；仅作 storage key → 色 的回落表。 */
const PRESET_PRIMARY_BY_KEY: Record<string, string> = {
  "kaihe-blue": "#1890ff",
  "aurora-green": "#00BA8B",
  sunset: "#fa8c16",
  "gongan-blue": "#1D1E72",
};

function defaultStorage(): Storage | undefined {
  try {
    return typeof localStorage !== "undefined" ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

export function readStoredPrimaryColor(storage: Storage | undefined = defaultStorage()): string {
  if (!storage) {
    return DEFAULT_SKIN_PRIMARY;
  }

  try {
    const legacy = storage.getItem(LEGACY_SKIN_COLOR_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { primaryColor?: unknown };
      if (typeof parsed.primaryColor === "string" && parsed.primaryColor.trim()) {
        return parsed.primaryColor.trim();
      }
    }
  } catch {
    // 损坏的 skinColor：回落 g2-pc-skin
  }

  const key = storage.getItem(SKIN_STORAGE_KEY);
  if (key && PRESET_PRIMARY_BY_KEY[key]) {
    return PRESET_PRIMARY_BY_KEY[key]!;
  }

  return DEFAULT_SKIN_PRIMARY;
}

export function primaryColorFromSkinEvent(detail: unknown): string | null {
  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }
  return null;
}
