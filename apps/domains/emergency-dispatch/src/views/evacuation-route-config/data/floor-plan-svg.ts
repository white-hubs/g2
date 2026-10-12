export function makeSampleFloorPlanDataUrl(): string {
  const w = 500;
  const h = 350;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#FAFBFC" stroke="#D1D5DB" stroke-width="2" rx="6"/>`;
  const rooms = [
    { x: 15, y: 15, w: 120, h: 85, l: "大厅/前台", c: "#E0E7FF" },
    { x: 150, y: 15, w: 100, h: 60, l: "办公室A", c: "#FEF3C7" },
    { x: 265, y: 15, w: 100, h: 60, l: "办公室B", c: "#FEF3C7" },
    { x: 380, y: 15, w: 105, h: 60, l: "会议室", c: "#D1FAE5" },
    { x: 150, y: 90, w: 150, h: 75, l: "开放办公区", c: "#FEE2E2" },
    { x: 315, y: 90, w: 170, h: 75, l: "茶水间/休息区", c: "#E0E7FF" },
    { x: 15, y: 115, w: 120, h: 60, l: "档案室", c: "#F3F4F6" },
    { x: 15, y: 190, w: 210, h: 140, l: "生产车间/仓库", c: "#FEF3C7" },
    { x: 240, y: 180, w: 245, h: 150, l: "设备间/配电房", c: "#FEE2E2" },
  ];
  for (const r of rooms) {
    s += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.c}" stroke="#CBD5E1" stroke-width="1.2" rx="3"/><text x="${r.x + r.w / 2}" y="${r.y + r.h / 2}" fill="#374151" font-size="11" font-weight="500" text-anchor="middle" dominant-baseline="central">${r.l}</text>`;
  }
  s +=
    '<rect x="135" y="15" width="14" height="320" fill="#F3F4F6" stroke="#E5E7EB"/><rect x="315" y="80" width="14" height="255" fill="#F3F4F6" stroke="#E5E7EB"/><text x="142" y="175" fill="#9CA3AF" font-size="9" text-anchor="middle" transform="rotate(-90,142,175)">走廊</text>';
  s +=
    '<rect x="15" y="310" width="40" height="22" fill="none" stroke="#10B981" stroke-width="2.5" rx="3"/><text x="35" y="324" fill="#10B981" font-size="8" font-weight="bold" text-anchor="middle">出口</text><rect x="455" y="310" width="40" height="22" fill="none" stroke="#EF4444" stroke-width="2.5" rx="3"/><text x="475" y="324" fill="#EF4444" font-size="8" font-weight="bold" text-anchor="middle">出口</text></svg>';
  return `data:image/svg+xml,${encodeURIComponent(s)}`;
}
