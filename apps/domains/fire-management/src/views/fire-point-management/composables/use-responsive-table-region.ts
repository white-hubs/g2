import { nextTick, onMounted, onUnmounted, shallowRef, type ShallowRef } from "vue";

const DEFAULT_TABLE_CHROME_HEIGHT = 112;
const MIN_TABLE_BODY_HEIGHT = 120;

/**
 * 让表格 body 只占容器剩余高度，避免页面滚动区与表格滚动区同时出现。
 */
export const useResponsiveTableRegion = (setScrollY: (height: number) => void): ShallowRef<HTMLDivElement | null> => {
  const regionRef = shallowRef<HTMLDivElement | null>(null);
  let resizeObserver: ResizeObserver | undefined;

  const updateScrollHeight = (): void => {
    const regionHeight = regionRef.value?.clientHeight ?? 0;
    if (regionHeight <= 0) return;
    setScrollY(Math.max(MIN_TABLE_BODY_HEIGHT, regionHeight - DEFAULT_TABLE_CHROME_HEIGHT));
  };

  onMounted(() => {
    void nextTick().then(() => {
      updateScrollHeight();
      if (!regionRef.value) return;
      resizeObserver = new ResizeObserver(updateScrollHeight);
      resizeObserver.observe(regionRef.value);
    });
  });

  onUnmounted(() => resizeObserver?.disconnect());

  return regionRef;
};
