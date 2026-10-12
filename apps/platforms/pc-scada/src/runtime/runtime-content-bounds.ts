import { anchorForElementPort, type ElementInstance, type PageModel } from "../../vendor/core";

/** 运行端画布外边距：负坐标图元也需纳入布局区域 */
const RUNTIME_CANVAS_PAD = 48;

const ROTATION_BOUNDS_EPS = 1e-3;

/** 与 ElementRenderer 一致：绕中心旋转后的轴对齐外接矩形 */
function elementAxisAlignedBounds(e: ElementInstance): { minX: number; minY: number; maxX: number; maxY: number } {
  const deg = e.rotation;
  const norm = ((deg % 360) + 360) % 360;
  if (norm < ROTATION_BOUNDS_EPS || norm > 360 - ROTATION_BOUNDS_EPS) {
    return { minX: e.x, minY: e.y, maxX: e.x + e.width, maxY: e.y + e.height };
  }
  const rad = (deg * Math.PI) / 180;
  const cx = e.x + e.width / 2;
  const cy = e.y + e.height / 2;
  const hw = e.width / 2;
  const hh = e.height / 2;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const halfW = hw * c + hh * s;
  const halfH = hw * s + hh * c;
  return { minX: cx - halfW, minY: cy - halfH, maxX: cx + halfW, maxY: cy + halfH };
}

function expandFrameWithConnections(
  page: PageModel,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let nx = minX;
  let ny = minY;
  let xx = maxX;
  let xy = maxY;
  for (const c of page.connections ?? []) {
    const src = page.elements.find((el) => el.id === c.source.cellId);
    const tgt = page.elements.find((el) => el.id === c.target.cellId);
    if (src && tgt) {
      const a = anchorForElementPort(src, c.source.port);
      const b = anchorForElementPort(tgt, c.target.port);
      nx = Math.min(nx, a.x, b.x);
      ny = Math.min(ny, a.y, b.y);
      xx = Math.max(xx, a.x, b.x);
      xy = Math.max(xy, a.y, b.y);
    }
    for (const p of c.polyline ?? []) {
      nx = Math.min(nx, p.x);
      ny = Math.min(ny, p.y);
      xx = Math.max(xx, p.x);
      xy = Math.max(xy, p.y);
    }
    for (const v of c.vertices ?? []) {
      nx = Math.min(nx, v.x);
      ny = Math.min(ny, v.y);
      xx = Math.max(xx, v.x);
      xy = Math.max(xy, v.y);
    }
  }
  return { minX: nx, minY: ny, maxX: xx, maxY: xy };
}

/**
 * 与 RuntimeRenderer 一致：逻辑页宽高 + 图元/连线外接矩形，得到根容器像素尺寸与内层平移。
 * 供外层 overflow:auto 滚动与 Studio 预览布局对齐。
 */
export function getRuntimeLayoutFrame(
  page: PageModel,
  pageW: number,
  pageH: number,
): { spanW: number; spanH: number; tx: number; ty: number } {
  let minX = 0;
  let minY = 0;
  let maxX = pageW;
  let maxY = pageH;
  for (const e of page.elements) {
    const b = elementAxisAlignedBounds(e);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }
  ({ minX, minY, maxX, maxY } = expandFrameWithConnections(page, minX, minY, maxX, maxY));
  const pad = RUNTIME_CANVAS_PAD;
  const spanW = Math.max(pageW, maxX - minX + 2 * pad);
  const spanH = Math.max(pageH, maxY - minY + 2 * pad);
  const tx = pad - minX;
  const ty = pad - minY;
  return { spanW, spanH, tx, ty };
}
