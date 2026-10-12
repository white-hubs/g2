export function makeGisMapSvg(W: number, H: number): string {
  let s = `<rect width="${W}" height="${H}" fill="#E8ECF1"/>`;
  s += `<path d="M0,120 Q200,100 350,140 Q500,180 650,130 Q750,110 ${W},160 L${W},200 Q700,160 550,190 Q400,220 250,170 Q100,130 0,170 Z" fill="#B8D4E8" opacity="0.7"/>`;
  s += '<ellipse cx="680" cy="380" rx="60" ry="35" fill="#B8D4E8" opacity="0.6"/>';
  s +=
    '<rect x="20" y="300" width="150" height="120" rx="8" fill="#C8E6C9" opacity="0.5"/><rect x="550" y="20" width="120" height="80" rx="8" fill="#C8E6C9" opacity="0.5"/><circle cx="720" cy="100" r="50" fill="#C8E6C9" opacity="0.4"/>';
  s += `<rect x="0" y="200" width="${W}" height="22" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="0.5"/><line x1="0" y1="211" x2="${W}" y2="211" stroke="#FCD34D" stroke-width="1" stroke-dasharray="12,8"/>`;
  s += `<rect x="260" y="0" width="20" height="${H}" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="0.5"/><line x1="270" y1="0" x2="270" y2="${H}" stroke="#FCD34D" stroke-width="1" stroke-dasharray="12,8"/>`;
  s += `<rect x="520" y="0" width="16" height="${H}" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="0.5"/>`;
  s += `<rect x="0" y="320" width="${W}" height="10" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="0.5"/><rect x="100" y="0" width="10" height="${H}" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="0.5"/><rect x="400" y="0" width="10" height="${H}" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="0.5"/><rect x="640" y="0" width="10" height="${H}" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="0.5"/>`;
  const bldgs = [
    { x: 30, y: 30, w: 55, h: 45 },
    { x: 100, y: 35, w: 40, h: 35 },
    { x: 155, y: 25, w: 50, h: 50 },
    { x: 290, y: 30, w: 45, h: 55 },
    { x: 350, y: 40, w: 35, h: 30 },
    { x: 550, y: 110, w: 40, h: 35 },
    { x: 610, y: 105, w: 50, h: 45 },
    { x: 680, y: 115, w: 35, h: 30 },
    { x: 30, y: 230, w: 50, h: 40 },
    { x: 100, y: 235, w: 40, h: 35 },
    { x: 160, y: 225, w: 35, h: 50 },
    { x: 290, y: 235, w: 55, h: 40 },
    { x: 360, y: 230, w: 35, h: 35 },
    { x: 540, y: 230, w: 45, h: 55 },
    { x: 600, y: 225, w: 50, h: 40 },
    { x: 670, y: 235, w: 40, h: 35 },
    { x: 30, y: 340, w: 45, h: 40 },
    { x: 90, y: 345, w: 35, h: 35 },
    { x: 145, y: 340, w: 55, h: 45 },
    { x: 290, y: 345, w: 40, h: 35 },
    { x: 350, y: 340, w: 50, h: 40 },
    { x: 540, y: 350, w: 35, h: 55 },
    { x: 590, y: 345, w: 45, h: 35 },
    { x: 650, y: 350, w: 55, h: 40 },
    { x: 420, y: 430, w: 60, h: 50 },
    { x: 500, y: 430, w: 40, h: 45 },
    { x: 690, y: 420, w: 55, h: 55 },
  ];
  for (const b of bldgs) {
    s += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#D4D8DD" stroke="#B0B8C1" stroke-width="0.8" rx="2"/><rect x="${b.x + 2}" y="${b.y + 2}" width="${b.w - 4}" height="${b.h - 4}" fill="#E2E6EA" rx="1"/>`;
  }
  s +=
    '<text x="200" y="195" fill="#6B7280" font-size="10" font-weight="500" text-anchor="middle">经开大道</text><text x="278" y="140" fill="#9CA3AF" font-size="9" text-anchor="middle" transform="rotate(-90,278,140)">兴业路</text><text x="528" y="100" fill="#9CA3AF" font-size="9" text-anchor="middle" transform="rotate(-90,528,100)">科技路</text>';
  s +=
    '<text x="95" y="70" fill="#6B7280" font-size="8">A区·生产区</text><text x="555" y="160" fill="#6B7280" font-size="8">B区·办公区</text><text x="95" y="280" fill="#6B7280" font-size="8">C区·仓储区</text><text x="555" y="290" fill="#6B7280" font-size="8">D区·公共区</text>';
  s += `<line x1="620" y1="${H - 12}" x2="720" y2="${H - 12}" stroke="#374151" stroke-width="2"/><line x1="620" y1="${H - 8}" x2="620" y2="${H - 16}" stroke="#374151" stroke-width="1.5"/><line x1="720" y1="${H - 8}" x2="720" y2="${H - 16}" stroke="#374151" stroke-width="1.5"/><text x="670" y="${H - 15}" fill="#374151" font-size="8" text-anchor="middle">100m</text>`;
  return s;
}

export const DEFAULT_ROUTE_COLOR = "#FACC15";

export const PRIORITY_ROUTE_COLORS = {
  高: "#EF4444",
  中: DEFAULT_ROUTE_COLOR,
  低: "#10B981",
} as const;

export function priorityToRouteColor(priority: keyof typeof PRIORITY_ROUTE_COLORS): string {
  return PRIORITY_ROUTE_COLORS[priority] ?? DEFAULT_ROUTE_COLOR;
}

export const ROUTE_COLORS = [
  DEFAULT_ROUTE_COLOR,
  "#EF4444",
  "var(--cube-theme-var--primary-color, #3b82f6)",
  "#10B981",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
];
