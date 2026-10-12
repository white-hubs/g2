/**
 * 对齐 `@ghcloud/cube-theme` 的 antd3 legacy 色板（themes-legacy/antd3/*）。
 * 子应用 less（antd3-varlable.less）依赖 `--cube-theme-var--*`，不能只写主色。
 */

export type SkinThemeVarMap = Record<string, string>;

/** key = SkinPreset.key */
export const ANTD3_SKIN_THEME_VARS: Record<string, SkinThemeVarMap> = {
  "kaihe-blue": {
    "primary-color": "rgb(24, 144, 255)",
    "primary-color-disabled": "#bae7ff",
    "primary-color-hover": "#40a9ff",
    "primary-color-active": "#096dd9",
    "primary-color-outline": "rgba(24, 144, 255, 0.2)",
    "primary-deprecated-bg": "#bae7ff",
    "primary-deprecated-border": "#69c0ff",
    "primary-1": "#e6f7ff",
    "primary-2": "#bae7ff",
    "primary-3": "#91d5ff",
    "primary-4": "#69c0ff",
    "primary-5": "#40a9ff",
    "primary-6": "#1890ff",
    "primary-7": "#096dd9",
    "primary-8": "#0050b3",
    "primary-9": "#003a8c",
    "primary-10": "#002766",
    "primary-color-deprecated-l-35": "rgb(202, 230, 255)",
    "primary-color-deprecated-l-20": "rgb(126, 193, 255)",
    "primary-color-deprecated-t-20": "rgb(70, 166, 255)",
    "primary-color-deprecated-t-50": "rgb(140, 200, 255)",
    "primary-color-deprecated-f-12": "rgba(24, 144, 255, 0.12)",
    "primary-color-active-deprecated-f-30": "rgba(230, 247, 255, 0.3)",
    "primary-color-active-deprecated-d-02": "rgb(220, 244, 255)",
  },
  midnight: {
    "primary-color": "rgb(90, 164, 255)",
    "primary-color-disabled": "#b8d8ff",
    "primary-color-hover": "#79b3ff",
    "primary-color-active": "#3b7fcc",
    "primary-color-outline": "rgba(90, 164, 255, 0.2)",
    "primary-deprecated-bg": "#dcecff",
    "primary-deprecated-border": "#9bc6ff",
    "primary-1": "#e8f3ff",
    "primary-2": "#dcecff",
    "primary-3": "#c5e0ff",
    "primary-4": "#9bc6ff",
    "primary-5": "#79b3ff",
    "primary-6": "#5aa4ff",
    "primary-7": "#3b7fcc",
    "primary-8": "#245b99",
    "primary-9": "#163f6b",
    "primary-10": "#0d2947",
    "primary-color-deprecated-l-35": "rgb(191, 221, 255)",
    "primary-color-deprecated-l-20": "rgb(140, 197, 255)",
    "primary-color-deprecated-t-20": "rgb(123, 182, 255)",
    "primary-color-deprecated-t-50": "rgb(173, 209, 255)",
    "primary-color-deprecated-f-12": "rgba(90, 164, 255, 0.12)",
    "primary-color-active-deprecated-f-30": "rgba(232, 243, 255, 0.3)",
    "primary-color-active-deprecated-d-02": "rgb(221, 237, 255)",
  },
  "warm-orange": {
    "primary-color": "rgb(240, 138, 36)",
    "primary-color-disabled": "#ffd8a8",
    "primary-color-hover": "#f5a34d",
    "primary-color-active": "#c96a12",
    "primary-color-outline": "rgba(240, 138, 36, 0.2)",
    "primary-deprecated-bg": "#fff0dc",
    "primary-deprecated-border": "#ffc680",
    "primary-1": "#fff0dc",
    "primary-2": "#ffd8a8",
    "primary-3": "#ffc680",
    "primary-4": "#ffb45c",
    "primary-5": "#f5a34d",
    "primary-6": "#f08a24",
    "primary-7": "#c96a12",
    "primary-8": "#9e510e",
    "primary-9": "#783b0a",
    "primary-10": "#542806",
    "primary-color-deprecated-l-35": "rgb(250, 206, 157)",
    "primary-color-deprecated-l-20": "rgb(246, 169, 100)",
    "primary-color-deprecated-t-20": "rgb(243, 161, 80)",
    "primary-color-deprecated-t-50": "rgb(248, 197, 145)",
    "primary-color-deprecated-f-12": "rgba(240, 138, 36, 0.12)",
    "primary-color-active-deprecated-f-30": "rgba(255, 240, 220, 0.3)",
    "primary-color-active-deprecated-d-02": "rgb(255, 230, 198)",
  },
  "forest-green": {
    "primary-color": "rgb(34, 160, 107)",
    "primary-color-disabled": "#b7e8cc",
    "primary-color-hover": "#49b981",
    "primary-color-active": "#157347",
    "primary-color-outline": "rgba(34, 160, 107, 0.2)",
    "primary-deprecated-bg": "#e7f8ee",
    "primary-deprecated-border": "#8bd5ab",
    "primary-1": "#e7f8ee",
    "primary-2": "#c9f0da",
    "primary-3": "#8bd5ab",
    "primary-4": "#69c98f",
    "primary-5": "#49b981",
    "primary-6": "#22a06b",
    "primary-7": "#157347",
    "primary-8": "#105c38",
    "primary-9": "#0c452a",
    "primary-10": "#072f1d",
    "primary-color-deprecated-l-35": "rgb(177, 225, 197)",
    "primary-color-deprecated-l-20": "rgb(123, 202, 155)",
    "primary-color-deprecated-t-20": "rgb(78, 179, 137)",
    "primary-color-deprecated-t-50": "rgb(145, 208, 171)",
    "primary-color-deprecated-f-12": "rgba(34, 160, 107, 0.12)",
    "primary-color-active-deprecated-f-30": "rgba(231, 248, 238, 0.3)",
    "primary-color-active-deprecated-d-02": "rgb(214, 241, 224)",
  },
};

export function resolveAntd3ThemeVars(skinKey: string): SkinThemeVarMap {
  return ANTD3_SKIN_THEME_VARS[skinKey] ?? ANTD3_SKIN_THEME_VARS["kaihe-blue"]!;
}

/**
 * 子应用桥接样式：
 * - 旧仓 `variables.less` 的 `.primary-color*` 在构建时写死 `@primary-color`，运行时又无 `less.modifyVars`
 * - antdv4 CSS-in-JS 的控件（btn/switch/radio-button 等）也写死 token（如 #1677ff / #1890ff），不读 CSS 变量
 * 用宿主注入的变量覆盖，对齐旧仓 bimops `styles/global.less`「换肤后子应用跟着变」。
 *
 * 容器前缀：
 * - 遗留 qiankun 根（#appContainer 等）
 * - MF 域内容区（#main-content / .shell-pc-content）——否则 /d/* 页面完全吃不到桥接
 * ZhConfigProvider 的 theme.token 是主路径；桥接兜底未包 ConfigProvider 的页面与硬编码 CSS-in-JS。
 */
const MICRO_APP_ROOTS = [
  "#main-content",
  ".shell-pc-content",
  "#pc-layout-container",
  "#appContainer",
  "#workbench-container",
  "#LegacyProblemsApp",
  "#LegacyPersonalApp",
  "#cube-workbench-app",
  '[id^="__qiankun_microapp_wrapper"]',
] as const;

function microAppRule(selector: string, decls: string): string {
  return MICRO_APP_ROOTS.map((root) => `${root} ${selector}`).join(",\n") + ` {\n  ${decls}\n}`;
}

/** 应用根容器本身也要使用完整 Token，避免只有卡片和按钮跟肤、页面底色仍是亮色。 */
function microAppRootRule(decls: string): string {
  return `${MICRO_APP_ROOTS.join(",\n")} {\n  ${decls}\n}`;
}

/** 挂到 body 的浮层（Select/Dropdown/DatePicker/Modal）不在 MICRO_APP_ROOTS 内，需单独覆盖。 */
function teleportRule(selector: string, decls: string): string {
  return `${selector} {\n  ${decls}\n}`;
}

const MICRO_APP_SKIN_BRIDGE_CSS = `
/* 浏览器划词选中：默认系统蓝，需跟肤 */
::selection {
  color: var(--g2-color-button-text, #fff);
  background: var(--g2-color-primary, var(--cube-theme-var--primary-color));
}
::-moz-selection {
  color: var(--g2-color-button-text, #fff);
  background: var(--g2-color-primary, var(--cube-theme-var--primary-color));
}
/* 详情下钻小节标题（基础信息 / 巡检对象等）：CSS Modules 哈希类无法靠 ant 选择器覆盖 */
.g2-skin-section-title {
  color: var(--g2-color-primary, var(--cube-theme-var--primary-color)) !important;
  border-bottom-color: var(--g2-color-primary, var(--cube-theme-var--primary-color)) !important;
}
.primary-color {
  color: var(--g2-color-button-text, #fff) !important;
  background-color: var(--cube-theme-var--primary-color) !important;
}
.primary-color-font {
  color: var(--g2-color-primary, var(--cube-theme-var--primary-color)) !important;
}
.primary-color-1 {
  background-color: var(--cube-theme-var--primary-1) !important;
}
.primary-color-2 {
  background-color: var(--cube-theme-var--primary-2) !important;
}
.primary-color-before::before {
  background-color: var(--cube-theme-var--primary-color) !important;
}
.primary-color-border {
  border-color: var(--cube-theme-var--primary-color) !important;
}
${microAppRootRule("background-color: var(--g2-color-page-bg, #f5f7fa);\n  color: var(--g2-color-text, rgba(0, 0, 0, 0.85));")}
/* PageLayout 是嵌在灰色 Shell 内容区的独立卡片，不能复用微应用根的页面底色。 */
#pc-layout-container {
  background-color: var(--g2-color-page-layout-bg, #ffffff);
}
/* 业务应用的 antd 容器可能未走 ConfigProvider；基础表单、卡片和表格直接读取完整主题 Token。 */
${microAppRule(
  ".ant-card, .ant-card .ant-card-head, .ant-card .ant-card-body",
  "color: var(--g2-color-text, rgba(0, 0, 0, 0.85)) !important;\n  background-color: var(--g2-color-surface-bg, #ffffff) !important;\n  border-color: var(--g2-color-border, #d9d9d9) !important;",
)}
${microAppRule(
  ".ant-table, .ant-table-container, .ant-table-tbody > tr > td",
  "color: var(--g2-color-text, rgba(0, 0, 0, 0.85)) !important;\n  background-color: var(--g2-color-table-row-bg, var(--g2-color-surface-bg, #ffffff)) !important;\n  border-color: var(--g2-color-border, #d9d9d9) !important;",
)}
${microAppRule(
  ".ant-table-thead > tr > th",
  "color: var(--g2-color-text, rgba(0, 0, 0, 0.85)) !important;\n  background-color: var(--g2-color-table-header-bg, var(--g2-color-surface-bg, #fafafa)) !important;\n  border-color: var(--g2-color-border, #d9d9d9) !important;",
)}
${microAppRule(
  ".ant-input, .ant-input-affix-wrapper, .ant-select-selector, .ant-picker",
  "color: var(--g2-color-text, rgba(0, 0, 0, 0.85)) !important;\n  background-color: var(--g2-color-input-bg, var(--g2-color-surface-bg, #ffffff)) !important;\n  border-color: var(--g2-color-border, #d9d9d9) !important;",
)}
/* antd 的主按钮可能由宿主或浮层直接渲染，不一定落在微应用根内。 */
${teleportRule(
  ".ant-btn-primary, .ant-btn-color-primary.ant-btn-variant-solid",
  "color: var(--g2-color-button-text, #fff) !important;\n  background-color: var(--cube-theme-var--primary-color) !important;\n  border-color: var(--cube-theme-var--primary-color) !important;",
)}
${microAppRule(
  ".ant-btn-primary",
  "color: var(--g2-color-button-text, #fff) !important;\n  background-color: var(--cube-theme-var--primary-color) !important;\n  border-color: var(--cube-theme-var--primary-color) !important;",
)}
${microAppRule(
  ".ant-btn-primary:not(:disabled):hover",
  "background-color: var(--cube-theme-var--primary-color-hover) !important;\n  border-color: var(--cube-theme-var--primary-color-hover) !important;",
)}
/* link 跟肤，但排除 danger：否则删除等危险操作会被主色 !important 盖成蓝色 */
${microAppRule(".ant-btn-link:not(.ant-btn-dangerous)", "color: var(--cube-theme-var--primary-color) !important;")}
${microAppRule(".ant-btn-link.ant-btn-dangerous", "color: var(--ant-color-error, var(--g2-color-error, #ff4d4f)) !important;")}
${microAppRule(".ant-btn-link.ant-btn-dangerous:not(:disabled):hover", "color: var(--ant-color-error-hover, #ff7875) !important;")}
${microAppRule(".ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn", "color: var(--cube-theme-var--primary-color) !important;")}
${microAppRule(".ant-tabs-ink-bar", "background: var(--cube-theme-var--primary-color) !important;")}
/* 隐患单「全部/待我处理」等是 Radio.Button(solid)，不是 Tabs */
${microAppRule(
  ".ant-radio-group-solid .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)",
  "color: var(--g2-color-button-text, #fff) !important;\n  background: var(--cube-theme-var--primary-color) !important;\n  border-color: var(--cube-theme-var--primary-color) !important;",
)}
${microAppRule(
  ".ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)::before",
  "background-color: var(--cube-theme-var--primary-color) !important;",
)}
${microAppRule(".ant-radio-button-wrapper:hover", "color: var(--cube-theme-var--primary-color) !important;")}
/* 个人中心「消息免打扰」Switch */
${microAppRule(".ant-switch-checked", "background-color: var(--cube-theme-var--primary-color) !important;")}
${microAppRule(
  ".ant-checkbox-checked .ant-checkbox-inner",
  "background-color: var(--cube-theme-var--primary-color) !important;\n  border-color: var(--cube-theme-var--primary-color) !important;",
)}
${microAppRule(".ant-pagination-item-active a", "color: var(--cube-theme-var--primary-color) !important;")}
${microAppRule(".ant-pagination-item-active", "border-color: var(--cube-theme-var--primary-color) !important;")}
/* 菜单 / 树 / 表格选中：工作台与域页面「选中仍是蓝」的常见来源 */
${microAppRule(
  ".ant-menu-item-selected, .ant-menu-submenu-selected > .ant-menu-submenu-title",
  "color: var(--cube-theme-var--primary-color) !important;",
)}
${microAppRule(
  ".ant-menu-light .ant-menu-item-selected, .ant-menu-light .ant-menu-item-selected:hover",
  "background-color: var(--cube-theme-var--primary-1) !important;",
)}
${microAppRule(".ant-menu-item-selected::after, .ant-menu-item-active::after", "border-color: var(--cube-theme-var--primary-color) !important;")}
${microAppRule(
  ".ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected",
  "background-color: var(--cube-theme-var--primary-1) !important;",
)}
${microAppRule(".ant-table-tbody > tr.ant-table-row-selected > td", "background: var(--cube-theme-var--primary-1) !important;")}
${microAppRule(".ant-steps-item-process .ant-steps-item-icon", "background: var(--cube-theme-var--primary-color) !important;\n  border-color: var(--cube-theme-var--primary-color) !important;")}
${microAppRule(".ant-steps-item-finish .ant-steps-item-icon", "border-color: var(--cube-theme-var--primary-color) !important;")}
${microAppRule(".ant-steps-item-finish .ant-steps-item-icon > .ant-steps-icon", "color: var(--cube-theme-var--primary-color) !important;")}
${microAppRule(".ant-slider .ant-slider-track", "background-color: var(--cube-theme-var--primary-color) !important;")}
${microAppRule(".ant-slider .ant-slider-handle::after", "box-shadow: 0 0 0 2px var(--cube-theme-var--primary-color) !important;")}
${microAppRule(".ant-progress-bg", "background-color: var(--cube-theme-var--primary-color) !important;")}
${microAppRule(".ant-spin-dot-item", "background-color: var(--cube-theme-var--primary-color) !important;")}
${microAppRule(".ant-tag-blue, .ant-tag-processing", "color: var(--cube-theme-var--primary-color) !important;\n  background: var(--cube-theme-var--primary-1) !important;\n  border-color: var(--cube-theme-var--primary-3) !important;")}
${microAppRule(".ant-radio-checked .ant-radio-inner", "border-color: var(--cube-theme-var--primary-color) !important;")}
${microAppRule(".ant-radio-inner::after", "background-color: var(--cube-theme-var--primary-color) !important;")}
${microAppRule(
  ":is(.ant-input:focus, .ant-input-focused, .ant-input-affix-wrapper-focused)",
  "border-color: var(--cube-theme-var--primary-color) !important;\n  box-shadow: 0 0 0 2px var(--cube-theme-var--primary-color-outline) !important;",
)}
/* 仅单行 Input：边框在 affix-wrapper 上，内层 input 去边防双框；TextArea 边框在 textarea 自身，不可清 */
${microAppRule(
  ".ant-input-affix-wrapper:not(.ant-input-textarea-affix-wrapper) :is(input.ant-input, input.ant-input:focus, input.ant-input-focused)",
  "border: none !important;\n  box-shadow: none !important;",
)}
${teleportRule(
  ".ant-modal-root :is(.ant-input:focus, .ant-input-focused, .ant-input-affix-wrapper-focused)",
  "border-color: var(--cube-theme-var--primary-color) !important;\n  box-shadow: 0 0 0 2px var(--cube-theme-var--primary-color-outline) !important;",
)}
${teleportRule(
  ".ant-modal-root .ant-input-affix-wrapper:not(.ant-input-textarea-affix-wrapper) :is(input.ant-input, input.ant-input:focus, input.ant-input-focused)",
  "border: none !important;\n  box-shadow: none !important;",
)}
${microAppRule(".ant-select-focused:not(.ant-select-disabled).ant-select:not(.ant-select-customize-input) .ant-select-selector", "border-color: var(--cube-theme-var--primary-color) !important;\n  box-shadow: 0 0 0 2px var(--cube-theme-var--primary-color-outline) !important;")}
${teleportRule(
  ".ant-select-dropdown .ant-select-item-option-selected:not(.ant-select-item-option-disabled)",
  "color: var(--cube-theme-var--primary-color) !important;\n  background-color: var(--cube-theme-var--primary-1) !important;",
)}
${teleportRule(
  ".ant-cascader-menu-item-active:not(.ant-cascader-menu-item-disabled), .ant-cascader-menu-item-selected",
  "color: var(--cube-theme-var--primary-color) !important;\n  background-color: var(--cube-theme-var--primary-1) !important;",
)}
${teleportRule(
  ".ant-dropdown-menu-item-selected, .ant-dropdown-menu-submenu-title-selected",
  "color: var(--cube-theme-var--primary-color) !important;\n  background-color: var(--cube-theme-var--primary-1) !important;",
)}
${teleportRule(
  ".ant-transfer-list-content-item-checked",
  "color: var(--cube-theme-var--primary-color) !important;\n  background-color: var(--cube-theme-var--primary-1) !important;",
)}
${teleportRule(
  ".ant-picker-cell-in-view.ant-picker-cell-selected .ant-picker-cell-inner",
  "background: var(--cube-theme-var--primary-color) !important;",
)}
${teleportRule(
  ".ant-picker-cell-in-view.ant-picker-cell-today .ant-picker-cell-inner::before",
  "border-color: var(--cube-theme-var--primary-color) !important;",
)}
/* 日期/时间面板也会 Teleport 到 body。浮层首次创建时不能依赖 antd CSS-in-JS
   是否已经拿到主题 Token，因此直接以语义 Token 覆盖面板、单元格和时间列。 */
${teleportRule(
  ".ant-picker-dropdown :is(.ant-picker-panel-container, .ant-picker-panel, .ant-picker-panel-layout, .ant-picker-date-panel, .ant-picker-time-panel, .ant-picker-footer)",
  "color: var(--g2-color-text, rgba(0, 0, 0, 0.85)) !important;\n  background-color: var(--g2-color-elevated-bg, var(--g2-color-surface-bg, #ffffff)) !important;\n  border-color: var(--g2-color-border, #d9d9d9) !important;",
)}
${teleportRule(
  ".ant-picker-dropdown :is(.ant-picker-header, .ant-picker-header-view, .ant-picker-content th, .ant-picker-cell-in-view .ant-picker-cell-inner, .ant-picker-time-panel-column > li.ant-picker-time-panel-cell .ant-picker-time-panel-cell-inner)",
  "color: var(--g2-color-text, rgba(0, 0, 0, 0.85)) !important;\n  border-color: var(--g2-color-border, #d9d9d9) !important;",
)}
${teleportRule(
  ".ant-picker-dropdown .ant-picker-cell-disabled .ant-picker-cell-inner, .ant-picker-dropdown .ant-picker-time-panel-cell-disabled .ant-picker-time-panel-cell-inner",
  "color: var(--g2-color-text-tertiary, rgba(0, 0, 0, 0.25)) !important;\n  background: var(--g2-color-fill-secondary, rgba(0, 0, 0, 0.04)) !important;",
)}
${teleportRule(
  ".ant-modal-root .ant-btn-primary, .ant-modal-wrap .ant-btn-primary",
  "color: var(--g2-color-button-text, #fff) !important;\n  background-color: var(--cube-theme-var--primary-color) !important;\n  border-color: var(--cube-theme-var--primary-color) !important;",
)}
/* Modal 会 Teleport 到 body，无法依赖微应用根容器的主题规则。遮罩保持可见但不可不透明；
   内容、标题、表单和页脚统一使用弹层及输入 Token。 */
${teleportRule(".ant-modal-root .ant-modal-mask", "background-color: rgba(0, 0, 0, 0.45) !important;")}
${teleportRule(
  ".ant-modal-root .ant-modal-content, .ant-modal-wrap .ant-modal-content",
  "color: var(--g2-color-text, rgba(0, 0, 0, 0.85)) !important;\n  background-color: var(--g2-color-elevated-bg, var(--g2-color-surface-bg, #ffffff)) !important;\n  border-color: var(--g2-color-border-secondary, #edf0f5) !important;",
)}
${teleportRule(
  ".ant-modal-root .ant-modal-header, .ant-modal-wrap .ant-modal-header, .ant-modal-root .ant-modal-footer, .ant-modal-wrap .ant-modal-footer",
  "color: var(--g2-color-text, rgba(0, 0, 0, 0.85)) !important;\n  background-color: var(--g2-color-elevated-bg, var(--g2-color-surface-bg, #ffffff)) !important;\n  border-color: var(--g2-color-border-secondary, #edf0f5) !important;",
)}
${teleportRule(
  ".ant-modal-root :is(.ant-modal-title, .ant-modal-body, .ant-modal-close), .ant-modal-wrap :is(.ant-modal-title, .ant-modal-body, .ant-modal-close)",
  "color: var(--g2-color-text, rgba(0, 0, 0, 0.85)) !important;",
)}
${teleportRule(
  ".ant-modal-root :is(.ant-input, .ant-input-affix-wrapper, .ant-select-selector, .ant-picker), .ant-modal-wrap :is(.ant-input, .ant-input-affix-wrapper, .ant-select-selector, .ant-picker)",
  "color: var(--g2-color-text, rgba(0, 0, 0, 0.85)) !important;\n  background-color: var(--g2-color-input-bg, var(--g2-color-surface-bg, #ffffff)) !important;\n  border-color: var(--g2-color-border, #d9d9d9) !important;",
)}
${teleportRule(
  ".ant-popover .ant-btn-primary, .ant-popconfirm .ant-btn-primary",
  "color: var(--g2-color-button-text, #fff) !important;\n  background-color: var(--cube-theme-var--primary-color) !important;\n  border-color: var(--cube-theme-var--primary-color) !important;",
)}
`.trim();

/** 生成注入到 document 的主题 CSS（变量 + 子应用桥接）。 */
export function buildSkinThemeCss(skinKey: string, chromePrimary: string): string {
  const vars = resolveAntd3ThemeVars(skinKey);
  const lines: string[] = [
    `--g2-color-primary: ${chromePrimary};`,
    `--ant-color-primary: ${chromePrimary};`,
    // 新版 Theme 仅有 primaryColor 时的 camelCase 别名
    `--cube-theme-var--primaryColor: ${vars["primary-color"]};`,
  ];

  for (const [name, value] of Object.entries(vars)) {
    lines.push(`--cube-theme-var--${name}: ${value};`);
    lines.push(`--ant-${name}: ${value} !important;`);
    lines.push(`--template-${name}: ${value} !important;`);
  }

  return `:root {\n  ${lines.join("\n  ")}\n}\n${MICRO_APP_SKIN_BRIDGE_CSS}`;
}
