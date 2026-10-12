import { type Ref, nextTick, onBeforeUnmount, ref, watch } from "vue";

/** 预留底边框、横向滚动条与 subpixel 取整误差 */
const SCROLL_BUFFER = 12;

interface UsePickerTableScroll {
  scrollY: Ref<number>;
  recalc: () => void;
}

export function usePickerTableScroll(tableWrapRef: Ref<HTMLElement | null>): UsePickerTableScroll {
  const scrollY = ref(300);

  const measure = (): void => {
    const wrap = tableWrapRef.value;
    if (!wrap) {
      return;
    }

    const wrapRect = wrap.getBoundingClientRect();
    const headerEl = wrap.querySelector('[class*="table-header"]') as HTMLElement | null;
    const bodyTop = headerEl?.getBoundingClientRect().bottom ?? wrapRect.top;
    const available = wrapRect.bottom - bodyTop - SCROLL_BUFFER;

    scrollY.value = Math.max(Math.floor(available), 120);
  };

  const recalc = (): void => {
    measure();
    requestAnimationFrame(measure);
  };

  let resizeObserver: ResizeObserver | undefined;

  const bindObserver = (el: HTMLElement | null): void => {
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    if (!el) {
      return;
    }
    resizeObserver = new ResizeObserver(() => {
      recalc();
    });
    resizeObserver.observe(el);
  };

  watch(
    tableWrapRef,
    (el) => {
      bindObserver(el);
      void nextTick(() => {
        recalc();
      });
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    window.removeEventListener("resize", recalc);
  });

  window.addEventListener("resize", recalc);

  return { scrollY, recalc };
}
