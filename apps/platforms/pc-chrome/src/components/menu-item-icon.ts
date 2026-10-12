/**
 * 侧栏彩色图标：按 iconKey 映射色板，无 iconKey 时用 label 哈希取色。
 * 视觉对齐旧仓侧栏「每项一色块图标」，不依赖外部图标字体。
 */

const PALETTE = ["#1578ff", "#52c41a", "#fa8c16", "#eb2f96", "#722ed1", "#13c2c2", "#f5222d", "#2f54eb", "#a0d911", "#fa541c"];

const KEY_COLORS: Record<string, string> = {
  workbench: "#1578ff",
  hazard: "#f5222d",
  config: "#722ed1",
  flow: "#13c2c2",
  stats: "#fa8c16",
  repair: "#fa541c",
  complaint: "#eb2f96",
  inspect: "#52c41a",
  maintain: "#2f54eb",
  outsource: "#a0d911",
  upgrade: "#1677ff",
  patrol: "#36cfc9",
  workorder: "#ff85c0",
  tasks: "#9254de",
  form: "#597ef7",
  gov: "#ff4d4f",
  org: "#1890ff",
  permission: "#faad14",
  energy: "#73d13d",
  base: "#69b1ff",
  safety: "#ff7875",
  integration: "#b37feb",
  agrimarket: "#95de64",
  hospital: "#ff9c6e",
  "ops-work": "#5cdbd3",
};

function hashLabel(label: string): number {
  let h = 0;
  for (let i = 0; i < label.length; i += 1) {
    h = (h * 31 + (label.codePointAt(i) ?? 0)) >>> 0;
  }
  return h;
}

export function colorForMenuIcon(iconKey: string | undefined, label: string): string {
  if (iconKey && KEY_COLORS[iconKey]) {
    return KEY_COLORS[iconKey];
  }
  return PALETTE[hashLabel(iconKey || label) % PALETTE.length]!;
}
