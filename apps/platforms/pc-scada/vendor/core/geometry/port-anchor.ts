import type { PortConfig } from "../types/element";
import type { ElementInstance } from "../types/instance";

const defaultPortConfig: PortConfig = { top: 1, right: 1, bottom: 1, left: 1 };

/**
 * 解析 X6 连接桩 id：top-1、right-2；无后缀的 top/right/bottom/left 视为该侧第 1 个桩（与单桩时 50% 位置一致）。
 */
export function parsePortSideIndex(port: string | undefined): {
  side: "top" | "right" | "bottom" | "left";
  index: number;
} | null {
  if (!port) {
    return { side: "top", index: 1 };
  }
  const m = /^(top|right|bottom|left)(?:-(\d+))?$/.exec(port);
  if (!m) {
    return null;
  }
  const side = m[1] as "top" | "right" | "bottom" | "left";
  const index = m[2] ? Number.parseInt(m[2], 10) : 1;
  if (!Number.isFinite(index) || index < 1) {
    return null;
  }
  return { side, index };
}

/**
 * 与组态 page-serializer.portDefsFromConfig / X6 absolute 端口一致：第 k 个桩在边上的位置为 k/(n+1)。
 */
export function anchorForElementPort(el: ElementInstance, port: string | undefined): { x: number; y: number } {
  const cfg = el.portConfig ?? defaultPortConfig;
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const parsed = parsePortSideIndex(port);
  if (!parsed) {
    return { x: cx, y: cy };
  }
  const { side, index } = parsed;
  const n = cfg[side];
  if (!Number.isFinite(n) || n < 1) {
    return { x: cx, y: cy };
  }
  const clampedIndex = Math.min(Math.max(1, index), n);
  const t = clampedIndex / (n + 1);
  switch (side) {
    case "top":
      return { x: el.x + el.width * t, y: el.y };
    case "bottom":
      return { x: el.x + el.width * t, y: el.y + el.height };
    case "left":
      return { x: el.x, y: el.y + el.height * t };
    case "right":
      return { x: el.x + el.width, y: el.y + el.height * t };
    default:
      return { x: cx, y: cy };
  }
}
