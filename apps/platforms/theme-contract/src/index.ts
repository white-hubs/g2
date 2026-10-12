/**
 * 跨应用主题只读契约。主题只由 Shell/Chrome 写入；业务域只读取或订阅，
 * 因此不会形成对 pc-chrome 的反向依赖。
 */
export const THEME_EVENT = "g2:theme-change";
export const THEME_STORAGE_KEY = "g2-ui-theme-v1";
export const THEME_LIBRARY_STORAGE_KEY = "g2-ui-theme-library-v1";
/** 内置主题的本地编辑覆盖；不改写代码中的默认色板。 */
export const THEME_BUILT_IN_OVERRIDES_STORAGE_KEY = "g2-ui-theme-built-in-overrides-v1";

export type ThemeMode = "light" | "dark";

export interface ThemeTokens {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primarySoft: string;
  primaryBorder: string;
  pageBg: string;
  /** PageLayout 卡片底色，独立于 Shell 页面底色和通用容器底色。 */
  pageLayoutBg: string;
  surfaceBg: string;
  /** 主容器内的次级区块底色，例如工作台欢迎区、快捷入口项和输入承载区。 */
  secondarySurfaceBg: string;
  elevatedBg: string;
  inputBg: string;
  tableHeaderBg: string;
  tableRowBg: string;
  fillSecondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  placeholder: string;
  /** 实色按钮、Radio 和遗留主按钮上的文字。 */
  buttonText: string;
  /** 顶部导航及其操作入口上的文字。 */
  navigationText: string;
  /** 顶部导航的底色。 */
  navigationBg: string;
  /** 当前顶部导航项的背景和文字。 */
  navigationActiveBg: string;
  navigationActiveText: string;
  /** 左侧菜单独立于顶部导航配置；状态背景由菜单底色和主色派生，文字始终使用菜单文字色。 */
  sideMenuBg: string;
  sideMenuText: string;
  sideMenuHoverBg: string;
  sideMenuActiveBg: string;
  sideMenuActiveText: string;
  /** 兼容既有 Ant Design token，值始终与 buttonText 一致。 */
  textOnPrimary: string;
  border: string;
  borderSecondary: string;
  focusRing: string;
  maskBg: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface UserTheme {
  id: string;
  name: string;
  mode: ThemeMode;
  version: 1;
  tokens: ThemeTokens;
  createdBy: string;
  updatedAt: string;
}

export type ThemeOverrides = Pick<
  ThemeTokens,
  | "pageBg"
  | "surfaceBg"
  | "secondarySurfaceBg"
  | "text"
  | "border"
  | "buttonText"
  | "navigationText"
  | "navigationBg"
  | "navigationActiveBg"
  | "navigationActiveText"
  | "sideMenuBg"
  | "sideMenuText"
>;

type Rgb = readonly [number, number, number];
const HEX = /^#[\da-f]{6}$/iu;
const tokenKeys = [
  "primary",
  "primaryHover",
  "primaryActive",
  "primarySoft",
  "primaryBorder",
  "pageBg",
  "pageLayoutBg",
  "surfaceBg",
  "secondarySurfaceBg",
  "elevatedBg",
  "inputBg",
  "tableHeaderBg",
  "tableRowBg",
  "fillSecondary",
  "text",
  "textSecondary",
  "textTertiary",
  "placeholder",
  "buttonText",
  "navigationText",
  "navigationBg",
  "navigationActiveBg",
  "navigationActiveText",
  "sideMenuBg",
  "sideMenuText",
  "sideMenuHoverBg",
  "sideMenuActiveBg",
  "sideMenuActiveText",
  "textOnPrimary",
  "border",
  "borderSecondary",
  "focusRing",
  "maskBg",
  "success",
  "warning",
  "danger",
  "info",
] as const satisfies readonly (keyof ThemeTokens)[];

function rgb(hex: string): Rgb {
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)];
}

function toHex([red, green, blue]: Rgb): string {
  return `#${[red, green, blue]
    .map((value) =>
      Math.round(Math.max(0, Math.min(255, value)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function mix(base: string, target: string, amount: number): string {
  const a = rgb(base);
  const b = rgb(target);
  return toHex([a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount, a[2] + (b[2] - a[2]) * amount]);
}

function derivePageLayoutBg(pageBg: string, mode: ThemeMode): string {
  return mode === "dark" ? mix(pageBg, "#ffffff", 0.08) : "#ffffff";
}

function luminance(color: string): number {
  const values = rgb(color).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
}

export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].toSorted((a, b) => b - a);
  return (lighter! + 0.05) / (darker! + 0.05);
}

/** 根据主题基线提供完整默认 Token；自定义主题可逐项覆盖页面与容器层级。 */
export function deriveThemeTokens(primary: string, mode: ThemeMode = "light"): ThemeTokens {
  if (!HEX.test(primary)) throw new TypeError("primary must be a #RRGGBB color");
  primary = primary.toLowerCase();
  const isDark = mode === "dark";
  const pageBg = isDark ? "#141414" : "#f5f7fa";
  const surfaceBg = isDark ? "#1f1f1f" : "#ffffff";
  const text = isDark ? "#f5f5f5" : "#1f2937";
  const textSecondary = isDark ? "#bfbfbf" : "#6b7280";
  const primarySoft = mix(primary, isDark ? "#141414" : "#ffffff", isDark ? 0.78 : 0.9);
  const foregroundOnPrimary = contrastRatio(primary, "#ffffff") >= 4.5 ? "#ffffff" : "#000000";
  return {
    primary,
    primaryHover: mix(primary, "#ffffff", 0.18),
    primaryActive: mix(primary, "#000000", 0.2),
    primarySoft,
    primaryBorder: mix(primary, isDark ? "#141414" : "#ffffff", isDark ? 0.48 : 0.62),
    pageBg,
    pageLayoutBg: derivePageLayoutBg(pageBg, mode),
    surfaceBg,
    secondarySurfaceBg: isDark ? "#102743" : "#f7faff",
    elevatedBg: isDark ? "#262626" : "#ffffff",
    inputBg: surfaceBg,
    tableHeaderBg: isDark ? "#262626" : "#f8fafc",
    tableRowBg: surfaceBg,
    fillSecondary: isDark ? "#303030" : "#f0f2f5",
    text,
    textSecondary,
    textTertiary: isDark ? "#8c8c8c" : "#9ca3af",
    placeholder: isDark ? "#8c8c8c" : "#9ca3af",
    buttonText: foregroundOnPrimary,
    navigationText: foregroundOnPrimary,
    navigationBg: primary,
    navigationActiveBg: primarySoft,
    navigationActiveText: primary,
    sideMenuBg: isDark ? "#0f1e32" : "#f7fbff",
    sideMenuText: isDark ? "#d7e7fa" : "#334155",
    sideMenuHoverBg: mix(isDark ? "#0f1e32" : "#f7fbff", primary, isDark ? 0.16 : 0.06),
    sideMenuActiveBg: mix(isDark ? "#0f1e32" : "#f7fbff", primary, isDark ? 0.3 : 0.13),
    sideMenuActiveText: isDark ? "#edf5ff" : primary,
    textOnPrimary: foregroundOnPrimary,
    border: isDark ? "#424242" : "#d9d9d9",
    borderSecondary: isDark ? "#303030" : "#edf0f5",
    focusRing: mix(primary, isDark ? "#141414" : "#ffffff", isDark ? 0.5 : 0.72),
    maskBg: isDark ? "#000000" : "#000000",
    success: "#52c41a",
    warning: "#fa8c16",
    danger: "#ff4d4f",
    info: "#1677ff",
  };
}

export function createTheme(
  id: string,
  name: string,
  primary: string,
  mode: ThemeMode = "light",
  overrides: Partial<ThemeOverrides> = {},
): UserTheme {
  const tokens = deriveThemeTokens(primary, mode);
  Object.assign(tokens, overrides);
  tokens.pageLayoutBg = derivePageLayoutBg(tokens.pageBg, mode);
  // 表头属于主容器中的次级区块，与“副容器背景”保持一致，避免深色自定义主题仍出现浅色表头。
  tokens.tableHeaderBg = tokens.secondarySurfaceBg;
  if (overrides.surfaceBg) {
    tokens.elevatedBg = overrides.surfaceBg;
    tokens.inputBg = overrides.surfaceBg;
    tokens.tableRowBg = overrides.surfaceBg;
  }
  if (overrides.border) tokens.borderSecondary = overrides.border;
  if (overrides.buttonText) tokens.textOnPrimary = overrides.buttonText;
  // 菜单状态不复用顶部导航：自定义底色、文字色和主色变化后会重新派生。
  const menuStateMix = mode === "dark" ? [0.16, 0.3] : [0.06, 0.13];
  tokens.sideMenuHoverBg = mix(tokens.sideMenuBg, tokens.primary, menuStateMix[0]);
  tokens.sideMenuActiveBg = mix(tokens.sideMenuBg, tokens.primary, menuStateMix[1]);
  tokens.sideMenuActiveText = tokens.sideMenuText;
  // 旧 Chrome 预设以原始字符串作为公开 CSS 变量值；派生色仍统一为小写十六进制。
  tokens.primary = primary;
  return { id, name, mode, version: 1, tokens, createdBy: "system", updatedAt: "2026-09-17T00:00:00.000Z" };
}

export const BUILT_IN_THEMES = [
  createTheme("kaihe-blue", "开河蓝", "#1890ff", "light", {
    pageBg: "#f5f7fa",
    surfaceBg: "#f5f7fa",
    secondarySurfaceBg: "#f7fbff",
    text: "#172033",
    border: "#d9e1ec",
    buttonText: "#ffffff",
    navigationText: "#ffffff",
    navigationBg: "#1890ff",
    navigationActiveBg: "#bae7ff",
    navigationActiveText: "#1890ff",
    sideMenuBg: "#f7fbff",
    sideMenuText: "#334155",
  }),
  createTheme("midnight", "夜幕黑", "#5aa4ff", "dark", {
    pageBg: "#071426",
    surfaceBg: "#071426",
    secondarySurfaceBg: "#102743",
    text: "#edf5ff",
    border: "#29425f",
    buttonText: "#ffffff",
    navigationText: "#edf5ff",
    navigationBg: "#071426",
    navigationActiveBg: "#103a67",
    navigationActiveText: "#edf5ff",
    sideMenuBg: "#0b1c33",
    sideMenuText: "#d7e7fa",
  }),
  createTheme("warm-orange", "暖阳橙", "#f08a24", "light", {
    pageBg: "#fff7ed",
    surfaceBg: "#fff7ed",
    secondarySurfaceBg: "#fff0dc",
    text: "#3b2a1b",
    border: "#f0d5b7",
    buttonText: "#ffffff",
    navigationText: "#ffffff",
    navigationBg: "#f08a24",
    navigationActiveBg: "#ffe0bd",
    navigationActiveText: "#b45309",
    sideMenuBg: "#fff9f2",
    sideMenuText: "#6b4930",
  }),
  createTheme("forest-green", "森林绿", "#22a06b", "light", {
    pageBg: "#f2fbf6",
    surfaceBg: "#f2fbf6",
    secondarySurfaceBg: "#e7f8ee",
    text: "#1e3328",
    border: "#c8e7d5",
    buttonText: "#ffffff",
    navigationText: "#ffffff",
    navigationBg: "#22a06b",
    navigationActiveBg: "#c9f0da",
    navigationActiveText: "#157347",
    sideMenuBg: "#f5fcf8",
    sideMenuText: "#365c46",
  }),
] as const;
let currentTheme: UserTheme = BUILT_IN_THEMES[0];

export function isBuiltInTheme(themeId: string): boolean {
  return BUILT_IN_THEMES.some((theme) => theme.id === themeId);
}

export function createCustomTheme(
  id: string,
  name: string,
  primary: string,
  mode: ThemeMode,
  overrides: Partial<ThemeOverrides> = {},
): UserTheme {
  const theme = createTheme(id, name.trim(), primary, mode, overrides);
  const tokens = { ...theme.tokens, textOnPrimary: theme.tokens.buttonText };
  return { ...theme, createdBy: "local-user", updatedAt: new Date().toISOString(), tokens };
}

/** 为已保存的 v1 主题补齐新增的可派生 Token，避免旧 localStorage 主题失效。 */
function normalizeTheme(theme: UserTheme): UserTheme {
  const existing = theme.tokens as Partial<ThemeTokens>;
  const derived = deriveThemeTokens(existing.primary ?? "#1890ff", theme.mode);
  const buttonText = existing.buttonText ?? existing.textOnPrimary ?? derived.buttonText;
  return {
    ...theme,
    tokens: {
      ...derived,
      ...existing,
      pageLayoutBg: existing.pageLayoutBg ?? derivePageLayoutBg(existing.pageBg ?? derived.pageBg, theme.mode),
      buttonText,
      navigationText: existing.navigationText ?? existing.textOnPrimary ?? derived.navigationText,
      navigationBg: existing.navigationBg ?? derived.navigationBg,
      navigationActiveBg: existing.navigationActiveBg ?? derived.navigationActiveBg,
      navigationActiveText: existing.navigationActiveText ?? derived.navigationActiveText,
      sideMenuBg: existing.sideMenuBg ?? derived.sideMenuBg,
      sideMenuText: existing.sideMenuText ?? derived.sideMenuText,
      // 旧浏览器缓存中的状态色统一按新规则重算。
      sideMenuHoverBg: mix(
        existing.sideMenuBg ?? derived.sideMenuBg,
        existing.primary ?? derived.primary,
        theme.mode === "dark" ? 0.16 : 0.06,
      ),
      sideMenuActiveBg: mix(
        existing.sideMenuBg ?? derived.sideMenuBg,
        existing.primary ?? derived.primary,
        theme.mode === "dark" ? 0.3 : 0.13,
      ),
      // 激活文字不再跟随主色；主色可被设置为黑色，仍需保持菜单文字可读。
      sideMenuActiveText: existing.sideMenuText ?? derived.sideMenuText,
      // 表头是次级容器，旧缓存也应跟随当前配置的副容器背景。
      tableHeaderBg: existing.secondarySurfaceBg ?? derived.secondarySurfaceBg,
      textOnPrimary: buttonText,
    },
  };
}

export function validateTheme(theme: UserTheme): string[] {
  const errors: string[] = [];
  if (theme.version !== 1) errors.push("unsupported theme version");
  for (const key of tokenKeys) if (!HEX.test(theme.tokens[key])) errors.push(`invalid ${key}`);
  return errors;
}

function cssName(key: string): string {
  return `--g2-color-${key.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)}`;
}

function writeLegacyPalette(root: CSSStyleDeclaration, tokens: ThemeTokens): void {
  const primary = tokens.primary.toLowerCase();
  const palette = [
    mix(primary, "#ffffff", 0.9),
    mix(primary, "#ffffff", 0.78),
    mix(primary, "#ffffff", 0.62),
    mix(primary, "#ffffff", 0.45),
    tokens.primaryHover,
    primary,
    tokens.primaryActive,
    mix(primary, "#000000", 0.36),
    mix(primary, "#000000", 0.54),
    mix(primary, "#000000", 0.72),
  ];
  root.setProperty("--cube-theme-var--primary-color", `rgb(${rgb(tokens.primary).join(", ")})`);
  root.setProperty("--ant-primary-color", `rgb(${rgb(tokens.primary).join(", ")})`, "important");
  root.setProperty("--cube-theme-var--primary-color-hover", tokens.primaryHover);
  root.setProperty("--cube-theme-var--primary-color-active", tokens.primaryActive);
  root.setProperty("--cube-theme-var--primary-color-outline", tokens.focusRing);
  palette.forEach((color, index) => {
    root.setProperty(`--cube-theme-var--primary-${index + 1}`, color);
    root.setProperty(`--ant-primary-${index + 1}`, color, "important");
  });
}

export function applyTheme(theme: UserTheme, options: { document?: Document; storage?: Storage } = {}): UserTheme {
  theme = normalizeTheme(theme);
  const errors = validateTheme(theme);
  if (errors.length) throw new TypeError(`invalid theme: ${errors.join(", ")}`);
  const doc = options.document ?? document;
  const root = doc.documentElement.style;
  for (const key of tokenKeys) root.setProperty(cssName(key), theme.tokens[key]);
  writeLegacyPalette(root, theme.tokens);
  currentTheme = theme;
  const storage = options.storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
  storage?.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  (doc.defaultView ?? window).dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
  return theme;
}

export function getTheme(): UserTheme {
  return currentTheme;
}

export function readThemeLibrary(
  storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage,
): UserTheme[] {
  try {
    const raw = storage?.getItem(THEME_LIBRARY_STORAGE_KEY);
    const customThemes = raw ? (JSON.parse(raw) as UserTheme[]) : [];
    const builtInRaw = storage?.getItem(THEME_BUILT_IN_OVERRIDES_STORAGE_KEY);
    const builtInOverrides = builtInRaw ? (JSON.parse(builtInRaw) as UserTheme[]) : [];
    const builtInById = new Map(
      builtInOverrides
        .map(normalizeTheme)
        .filter((theme) => isBuiltInTheme(theme.id) && validateTheme(theme).length === 0)
        .map((theme) => [theme.id, theme] as const),
    );
    return [
      ...BUILT_IN_THEMES.map((theme) => builtInById.get(theme.id) ?? theme),
      ...customThemes.map(normalizeTheme).filter((theme) => !isBuiltInTheme(theme.id) && validateTheme(theme).length === 0),
    ];
  } catch {
    return [...BUILT_IN_THEMES];
  }
}

/** 保存对默认主题的本地颜色覆盖；基础预设仍保留在代码中，随时可以恢复。 */
export function saveBuiltInThemeOverride(
  theme: UserTheme,
  storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage,
): UserTheme[] {
  if (!isBuiltInTheme(theme.id)) throw new TypeError("only built-in themes can be overridden");
  const errors = validateTheme(theme);
  if (!theme.name.trim() || errors.length) throw new TypeError(`invalid built-in theme override: ${errors.join(", ") || "missing name"}`);
  const raw = storage?.getItem(THEME_BUILT_IN_OVERRIDES_STORAGE_KEY);
  const existing = raw ? (JSON.parse(raw) as UserTheme[]) : [];
  const saved = { ...theme, createdBy: "local-user", updatedAt: new Date().toISOString() };
  storage?.setItem(THEME_BUILT_IN_OVERRIDES_STORAGE_KEY, JSON.stringify([...existing.filter((item) => item.id !== theme.id), saved]));
  return readThemeLibrary(storage);
}

/** 清除内置主题的本地覆盖，恢复仓库默认色板。 */
export function removeBuiltInThemeOverride(
  themeId: string,
  storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage,
): UserTheme[] {
  if (!isBuiltInTheme(themeId)) throw new TypeError("only built-in themes can be restored");
  const raw = storage?.getItem(THEME_BUILT_IN_OVERRIDES_STORAGE_KEY);
  const existing = raw ? (JSON.parse(raw) as UserTheme[]) : [];
  storage?.setItem(THEME_BUILT_IN_OVERRIDES_STORAGE_KEY, JSON.stringify(existing.filter((item) => item.id !== themeId)));
  return readThemeLibrary(storage);
}

export function saveCustomTheme(
  theme: UserTheme,
  storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage,
): UserTheme[] {
  if (isBuiltInTheme(theme.id)) throw new TypeError("built-in themes cannot be overwritten");
  const errors = validateTheme(theme);
  if (!theme.name.trim() || errors.length) throw new TypeError(`invalid custom theme: ${errors.join(", ") || "missing name"}`);
  const themes = readThemeLibrary(storage).filter((item) => !isBuiltInTheme(item.id) && item.id !== theme.id);
  const next = [...themes, theme];
  storage?.setItem(THEME_LIBRARY_STORAGE_KEY, JSON.stringify(next));
  return [...BUILT_IN_THEMES, ...next];
}

export function removeCustomTheme(
  themeId: string,
  storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage,
): UserTheme[] {
  if (isBuiltInTheme(themeId)) throw new TypeError("built-in themes cannot be deleted");
  const next = readThemeLibrary(storage).filter((theme) => !isBuiltInTheme(theme.id) && theme.id !== themeId);
  storage?.setItem(THEME_LIBRARY_STORAGE_KEY, JSON.stringify(next));
  return [...BUILT_IN_THEMES, ...next];
}

export function subscribeTheme(listener: (theme: UserTheme) => void, target: Window = window): () => void {
  const onChange = (event: Event): void => listener((event as CustomEvent<UserTheme>).detail);
  target.addEventListener(THEME_EVENT, onChange);
  return () => target.removeEventListener(THEME_EVENT, onChange);
}

export function restoreTheme(options: { document?: Document; storage?: Storage } = {}): UserTheme {
  const storage = options.storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
  try {
    const stored = storage?.getItem(THEME_STORAGE_KEY);
    if (stored) return applyTheme(JSON.parse(stored) as UserTheme, options);
  } catch {
    /* 回落内置主题 */
  }
  return applyTheme(currentTheme, options);
}
