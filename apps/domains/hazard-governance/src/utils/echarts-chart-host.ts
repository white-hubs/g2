import { nextTick } from "vue";

/** 测量仍为 0 时的兜底宽度（flex 未铺开 / 首帧尚未 layout） */
export const ECHARTS_FALLBACK_WIDTH = 400;

export const chartHostStyle = {
  width: "100%",
  minWidth: 0,
  flexShrink: 0,
  display: "block",
  boxSizing: "border-box",
} as const;

/** 布局未完成时 clientWidth/Height 可能为 0；echarts.init 需显式宽高 */
export function resolveEchartsInitSize(el: HTMLElement, minHeight: number): { width: number; height: number } {
  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const hParsed = Number.parseFloat(cs.height);
  const wParsed = Number.parseFloat(cs.width);
  let width = el.clientWidth || rect.width || el.offsetWidth || (Number.isFinite(wParsed) ? wParsed : 0);
  let height = el.clientHeight || rect.height || el.offsetHeight || (Number.isFinite(hParsed) ? hParsed : 0);
  if (width === 0) {
    const p = el.parentElement;
    if (p) {
      width = p.clientWidth || p.getBoundingClientRect().width || p.offsetWidth;
    }
  }
  if (width === 0) {
    width = ECHARTS_FALLBACK_WIDTH;
  }
  if (height === 0) {
    height = Number.isFinite(minHeight) ? minHeight : 320;
  }
  return { width, height };
}

/** PcLayout 等内容区首帧可能仍为 0 尺寸，延后到下一帧再测 */
export function scheduleEchartsMount(mount: () => void): void {
  void nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        mount();
        globalThis.setTimeout(() => {
          mount();
        }, 0);
      });
    });
  });
}
