/**
 * PC chrome 主题色：对齐旧仓 `use-site-setting`。
 * - chrome 消费 `--g2-color-primary`
 * - 遗留子应用（workbench/problems 等）消费 `--cube-theme-var--*`（见 cube-theme antd3-varlable.less）
 * - 另写 `--ant-*` / `localStorage.skinColor`，对齐旧仓兼容路径
 */

import {
  BUILT_IN_THEMES,
  THEME_STORAGE_KEY,
  applyTheme,
  createTheme,
  restoreTheme,
  type ThemeMode,
  type UserTheme,
} from "@g2-platform/theme-contract";

import { getPcChromePcUi, LEGACY_SKIN_COLOR_KEY, MF_ROOT_CHANGE_SKIN_EVENT, SKIN_STORAGE_KEY } from "./pc-ui-runtime";
import { buildSkinThemeCss } from "./skin-theme-vars";

interface CubeEventBus {
  publish: (event: string, msg: string) => void | Promise<void>;
}

export interface SkinPreset {
  key: string;
  label: string;
  color: string;
  mode: ThemeMode;
}

/** 固定内置主题；其他颜色通过“自定义主题”创建。 */
export const SKIN_PRESETS: SkinPreset[] = [
  { key: "kaihe-blue", label: "开河蓝", color: "#1890ff", mode: "light" },
  { key: "midnight", label: "夜幕黑", color: "#5aa4ff", mode: "dark" },
  { key: "warm-orange", label: "暖阳橙", color: "#f08a24", mode: "light" },
  { key: "forest-green", label: "森林绿", color: "#22a06b", mode: "light" },
];

export { SKIN_STORAGE_KEY, LEGACY_SKIN_COLOR_KEY, MF_ROOT_CHANGE_SKIN_EVENT };

const STYLE_ELEMENT_ID = "g2-skin-theme-style";

export function resolveSkinPreset(key: string | null | undefined): SkinPreset {
  return SKIN_PRESETS.find((skin) => skin.key === key) ?? SKIN_PRESETS[0]!;
}

function defaultStorage(): Storage | undefined {
  try {
    return typeof localStorage !== "undefined" ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

export function readStoredSkinKey(storage: Storage | undefined = defaultStorage()): string {
  return resolveSkinPreset(storage?.getItem(SKIN_STORAGE_KEY)).key;
}

function ensureStyleElement(doc: Document): HTMLStyleElement {
  let el = doc.querySelector(`#${STYLE_ELEMENT_ID}`) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement("style");
    el.id = STYLE_ELEMENT_ID;
    doc.head.append(el);
  }
  return el;
}

/**
 * antd 的部分浮层会直接挂到 body。除了写主题契约变量外，还要在每次主题
 * 恢复或切换后同步其运行时注册的主色与宿主桥接样式；否则首次打开浮层时会
 * 保留 antd 的默认蓝色，手动再次应用主题才会刷新。
 */
function syncThemeRuntime(skinKey: string, theme: UserTheme, doc: Document): void {
  ensureStyleElement(doc).textContent = buildSkinThemeCss(skinKey, theme.tokens.primary);

  try {
    getPcChromePcUi().ConfigProvider.config({ theme: { primaryColor: theme.tokens.primary } });
  } catch {
    // 测试环境可能未完整安装 antd，忽略
  }

  notifySkinChange(theme.tokens.primary, doc.defaultView ?? window);
}

/**
 * 应用主题色：body class + CSS 变量 + 本地持久化。
 * chrome 样式应消费 `--g2-color-primary`，勿再写死 `#1578ff`。
 */
export function applySkinTheme(key: string, options: { document?: Document; storage?: Storage | undefined } = {}): SkinPreset {
  const doc = options.document ?? document;
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const skin = resolveSkinPreset(key);

  for (const preset of SKIN_PRESETS) {
    doc.body.classList.toggle(`g2-skin-${preset.key}`, preset.key === skin.key);
  }

  // 内置主题使用完整 Token 比例；未知预设才回落为基于主色的临时主题。
  const theme = BUILT_IN_THEMES.find((item) => item.id === skin.key) ?? createTheme(skin.key, skin.label, skin.color, skin.mode);
  const appliedTheme = applyTheme(theme, { document: doc, storage });

  storage?.setItem(SKIN_STORAGE_KEY, skin.key);
  const legacyColor = { primaryColor: skin.color, btnPrimaryBg: skin.color };
  storage?.setItem(LEGACY_SKIN_COLOR_KEY, JSON.stringify(legacyColor));

  // 旧仓 iframe 皮肤同步
  try {
    const iframe = doc.querySelector("iframe");
    iframe?.contentWindow?.postMessage({ type: "clickSkin", data: legacyColor }, "*");
  } catch {
    // cross-origin iframe：忽略
  }

  // 同步 antd 运行时主题及监听 mf-root-change-skin 的子应用（todo-center 等）。
  syncThemeRuntime(skin.key, appliedTheme, doc);

  return skin;
}

/** 自定义完整主题仍沿用旧应用桥接 CSS，同时用完整 Token 覆盖其色板。 */
export function applyCustomTheme(theme: UserTheme, options: { document?: Document; storage?: Storage | undefined } = {}): UserTheme {
  const doc = options.document ?? document;
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  // 自定义主题使用同一套 legacy 色板桥接，但不能保留任何默认主题的选中 class。
  // 否则调用方无法区分“开河蓝”与一个恰好复用了蓝色色板的自定义主题。
  for (const preset of SKIN_PRESETS) {
    doc.body.classList.remove(`g2-skin-${preset.key}`);
  }
  const appliedTheme = applyTheme(theme, { document: doc, storage });
  const legacyColor = { primaryColor: appliedTheme.tokens.primary, btnPrimaryBg: appliedTheme.tokens.primary };
  storage?.setItem(LEGACY_SKIN_COLOR_KEY, JSON.stringify(legacyColor));
  syncThemeRuntime("kaihe-blue", appliedTheme, doc);
  return appliedTheme;
}

function notifySkinChange(primaryColor: string, targetWindow: Window): void {
  const bus = (targetWindow as Window & { __CUBE_EVENT_BUS_INSTANCE__?: CubeEventBus }).__CUBE_EVENT_BUS_INSTANCE__;
  if (bus?.publish) {
    const eventInfo = {
      origin: "g2-pc-chrome",
      event: MF_ROOT_CHANGE_SKIN_EVENT,
      data: primaryColor,
    };
    void bus.publish(MF_ROOT_CHANGE_SKIN_EVENT, JSON.stringify(eventInfo));
  }
  targetWindow.dispatchEvent(new CustomEvent(MF_ROOT_CHANGE_SKIN_EVENT, { detail: primaryColor }));
}

/** Platform install / 刷新后恢复上次主题。 */
export function restoreSkinTheme(options: { document?: Document; storage?: Storage | undefined } = {}): SkinPreset {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const storedTheme = storage?.getItem(THEME_STORAGE_KEY) ?? null;
  const skin = applySkinTheme(readStoredSkinKey(storage), options);
  if (storedTheme) {
    storage?.setItem(THEME_STORAGE_KEY, storedTheme);
    const restoredTheme = restoreTheme({ document: options.document, storage });
    const doc = options.document ?? document;
    // 已保存的内置改色或自定义主题会覆盖预设 Token，必须再次同步浮层运行时主题。
    syncThemeRuntime(skin.key, restoredTheme, doc);
  }
  return skin;
}
