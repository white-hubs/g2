import { defineComponent, onBeforeUnmount, onMounted, ref, toRaw, watch, type PropType } from "vue";

import { getRuntimeLayoutFrame, RuntimeRenderer, type RuntimeElementEvent } from "../../vendor/runtime";
import type { ScadaPageHandle } from "./types";

const MIN_SCALE = 0.05;
const MAX_SCALE = 4;
const VIEWPORT_PADDING = 12;
const PAN_CLICK_THRESHOLD = 6;

function clampScale(s: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

export const CubeScadaPage = defineComponent({
  name: "CubeScadaPage",
  props: {
    instance: {
      type: Object as PropType<ScadaPageHandle>,
      required: true,
    },
  },
  setup(props) {
    const iframeRef = ref<HTMLIFrameElement | null>(null);
    const viewportRef = ref<HTMLDivElement | null>(null);
    const tx = ref(0);
    const ty = ref(0);
    const scale = ref(1);
    const isPanning = ref(false);
    const suppressNextClick = ref(false);

    let panDrag: null | {
      pointerId: number;
      startClientX: number;
      startClientY: number;
      originTx: number;
      originTy: number;
    } = null;
    let pinchDrag: null | {
      startDistance: number;
      originScale: number;
      originTx: number;
      originTy: number;
      centerX: number;
      centerY: number;
    } = null;
    let resizeObserver: ResizeObserver | null = null;

    const activePointers = new Map<number, PointerEvent>();

    function getRawInstance(input: ScadaPageHandle | null | undefined): ScadaPageHandle | null {
      if (!input) return null;
      return toRaw(input) as ScadaPageHandle;
    }

    function resetDirectViewport(): void {
      isPanning.value = false;
      panDrag = null;
      pinchDrag = null;
      activePointers.clear();
      fitDirectPageToViewport();
    }

    function getDirectPageSize(): { width: number; height: number } | null {
      const page = getRawInstance(props.instance)?.directPage?.value;
      if (!page) return null;
      const { spanW, spanH } = getRuntimeLayoutFrame(page, page.width, page.height);
      return { width: spanW, height: spanH };
    }

    function getViewportArea(): { width: number; height: number } | null {
      if (!viewportRef.value) return null;
      const rect = viewportRef.value.getBoundingClientRect();
      return {
        width: Math.max(0, rect.width - VIEWPORT_PADDING * 2),
        height: Math.max(0, rect.height - VIEWPORT_PADDING * 2),
      };
    }

    function clampPan(nextTx: number, nextTy: number, nextScale = scale.value): { tx: number; ty: number } {
      const pageSize = getDirectPageSize();
      const viewportArea = getViewportArea();
      if (!pageSize || !viewportArea) return { tx: nextTx, ty: nextTy };

      const scaledW = pageSize.width * nextScale;
      const scaledH = pageSize.height * nextScale;

      const clampedX =
        scaledW <= viewportArea.width ? (viewportArea.width - scaledW) / 2 : Math.min(0, Math.max(viewportArea.width - scaledW, nextTx));
      const clampedY =
        scaledH <= viewportArea.height ? (viewportArea.height - scaledH) / 2 : Math.min(0, Math.max(viewportArea.height - scaledH, nextTy));

      return { tx: clampedX, ty: clampedY };
    }

    function updateTransform(nextTx: number, nextTy: number, nextScale = scale.value): void {
      const bounded = clampPan(nextTx, nextTy, nextScale);
      tx.value = bounded.tx;
      ty.value = bounded.ty;
      scale.value = nextScale;
    }

    function fitDirectPageToViewport(): void {
      const pageSize = getDirectPageSize();
      const viewportArea = getViewportArea();
      if (!pageSize || !viewportArea || pageSize.width <= 0 || pageSize.height <= 0) {
        tx.value = 0;
        ty.value = 0;
        scale.value = 1;
        return;
      }

      const fitScale = clampScale(Math.min(viewportArea.width / pageSize.width, viewportArea.height / pageSize.height, 1));
      updateTransform(0, 0, fitScale);
    }

    function detachPanListeners(): void {
      document.removeEventListener("pointermove", onDocumentPointerMove);
      document.removeEventListener("pointerup", onDocumentPointerEnd);
      document.removeEventListener("pointercancel", onDocumentPointerEnd);
    }

    function pointerDistance(a: PointerEvent, b: PointerEvent): number {
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    function pointerCenter(a: PointerEvent, b: PointerEvent): { x: number; y: number } {
      const rect = viewportRef.value?.getBoundingClientRect();
      return {
        x: (a.clientX + b.clientX) / 2 - (rect?.left ?? 0) - VIEWPORT_PADDING,
        y: (a.clientY + b.clientY) / 2 - (rect?.top ?? 0) - VIEWPORT_PADDING,
      };
    }

    function startPinchDrag(): void {
      const pointers = [...activePointers.values()];
      if (pointers.length < 2) {
        pinchDrag = null;
        return;
      }
      const first = pointers[0];
      const second = pointers[1];
      if (!first || !second) {
        pinchDrag = null;
        return;
      }
      const center = pointerCenter(first, second);
      pinchDrag = {
        startDistance: pointerDistance(first, second),
        originScale: scale.value,
        originTx: tx.value,
        originTy: ty.value,
        centerX: center.x,
        centerY: center.y,
      };
    }

    function onDocumentPointerMove(e: PointerEvent): void {
      if (activePointers.has(e.pointerId)) {
        activePointers.set(e.pointerId, e);
      }

      const pointers = [...activePointers.values()];
      if (pinchDrag && pointers.length >= 2) {
        const first = pointers[0];
        const second = pointers[1];
        if (!first || !second) return;
        e.preventDefault();
        const nextScale = clampScale(pinchDrag.originScale * (pointerDistance(first, second) / pinchDrag.startDistance));
        const ratio = nextScale / pinchDrag.originScale;
        updateTransform(
          pinchDrag.centerX - (pinchDrag.centerX - pinchDrag.originTx) * ratio,
          pinchDrag.centerY - (pinchDrag.centerY - pinchDrag.originTy) * ratio,
          nextScale,
        );
        suppressNextClick.value = true;
        return;
      }

      if (!panDrag || e.pointerId !== panDrag.pointerId) return;
      e.preventDefault();
      const dx = e.clientX - panDrag.startClientX;
      const dy = e.clientY - panDrag.startClientY;
      if (Math.hypot(dx, dy) > PAN_CLICK_THRESHOLD) {
        suppressNextClick.value = true;
      }
      updateTransform(panDrag.originTx + dx, panDrag.originTy + dy);
    }

    function onDocumentPointerEnd(e: PointerEvent): void {
      activePointers.delete(e.pointerId);
      if (pinchDrag && activePointers.size < 2) {
        pinchDrag = null;
        const next = activePointers.values().next().value as PointerEvent | undefined;
        if (next) {
          panDrag = {
            pointerId: next.pointerId,
            startClientX: next.clientX,
            startClientY: next.clientY,
            originTx: tx.value,
            originTy: ty.value,
          };
        }
      }
      if (panDrag && e.pointerId === panDrag.pointerId && activePointers.size === 0) {
        detachPanListeners();
        panDrag = null;
        isPanning.value = false;
      }
    }

    function onViewportWheel(e: WheelEvent): void {
      if (!viewportRef.value) return;
      const rect = viewportRef.value.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.001);
        const next = clampScale(scale.value * factor);
        const ratio = next / scale.value;
        updateTransform(
          mx - VIEWPORT_PADDING - (mx - VIEWPORT_PADDING - tx.value) * ratio,
          my - VIEWPORT_PADDING - (my - VIEWPORT_PADDING - ty.value) * ratio,
          next,
        );
        return;
      }
      e.preventDefault();
      updateTransform(tx.value - e.deltaX, ty.value - e.deltaY);
    }

    const viewportCaptureHandlers = {
      onClickCapture: (e: MouseEvent) => {
        if (!suppressNextClick.value) return;
        e.preventDefault();
        e.stopPropagation();
        suppressNextClick.value = false;
      },
    } as Record<string, unknown>;

    function onViewportPointerDown(e: PointerEvent): void {
      const shiftLeft = e.button === 0 && e.shiftKey;
      const right = e.button === 2;
      const touchLike = e.pointerType === "touch" || e.pointerType === "pen";
      if (!touchLike && !shiftLeft && !right) return;
      if (right) {
        e.preventDefault();
      }
      activePointers.set(e.pointerId, e);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

      if (activePointers.size >= 2) {
        panDrag = null;
        isPanning.value = true;
        startPinchDrag();
      } else {
        panDrag = {
          pointerId: e.pointerId,
          startClientX: e.clientX,
          startClientY: e.clientY,
          originTx: tx.value,
          originTy: ty.value,
        };
        isPanning.value = true;
      }

      document.addEventListener("pointermove", onDocumentPointerMove);
      document.addEventListener("pointerup", onDocumentPointerEnd);
      document.addEventListener("pointercancel", onDocumentPointerEnd);
    }

    function attach(inst: ScadaPageHandle | null | undefined) {
      const raw = getRawInstance(inst);
      if (!raw || !iframeRef.value) return;
      raw._attachIframe(iframeRef.value);
    }

    function detach(inst: ScadaPageHandle | null | undefined) {
      const raw = getRawInstance(inst);
      if (!raw) return;
      raw._detachIframe();
    }

    onMounted(() => {
      attach(props.instance);
      if (viewportRef.value) {
        resizeObserver = new ResizeObserver(() => {
          updateTransform(tx.value, ty.value);
        });
        resizeObserver.observe(viewportRef.value);
      }
    });
    onBeforeUnmount(() => {
      detachPanListeners();
      resizeObserver?.disconnect();
      detach(props.instance);
    });

    watch(
      () => props.instance,
      (next, prev) => {
        detach(prev);
        attach(next);
      },
    );

    watch(
      () => getRawInstance(props.instance)?.directPage?.value?.id,
      () => {
        requestAnimationFrame(resetDirectViewport);
      },
    );

    return () => {
      const inst = getRawInstance(props.instance);
      const loadingRef = inst?.loading;
      const errorRef = inst?.error;
      const iframeSrc = inst?.iframeSrc ?? "about:blank";
      const isLoading = Boolean(loadingRef?.value);
      const currentError = errorRef?.value ?? null;
      const isDirect = inst?.renderMode === "direct";
      const directPage = inst?.directPage?.value ?? null;

      const handleRuntimeEvent = (runtimeEvent: RuntimeElementEvent): void => {
        if (!inst?._handleRuntimeEvent) return;
        void inst._handleRuntimeEvent(runtimeEvent);
      };

      return (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            background: isDirect && directPage ? directPage.background : undefined,
          }}
        >
          {isDirect ? (
            directPage && inst?.directBindingEngine ? (
              <div
                class="cube-scada-direct-root"
                ref={viewportRef}
                style={{
                  flex: 1,
                  minHeight: 0,
                  width: "100%",
                  overflow: "hidden",
                  touchAction: "none",
                  boxSizing: "border-box",
                  borderRadius: "8px",
                  background: directPage.background,
                  padding: "12px",
                  cursor: isPanning.value ? "grabbing" : "default",
                }}
                onWheel={onViewportWheel}
                onPointerdown={onViewportPointerDown}
                {...viewportCaptureHandlers}
                onContextmenu={(e: MouseEvent) => {
                  e.preventDefault();
                }}
              >
                <style>
                  {`
                  .cube-scada-direct-root [data-scada-click-glow="1"] {
                    animation: cube-scada-click-glow-pulse 1.8s ease-in-out infinite;
                    box-shadow: 0 0 12px rgba(59, 130, 246, 0.75);
                    border-radius: 6px;
                  }

                  @keyframes cube-scada-click-glow-pulse {
                    0%, 100% { box-shadow: 0 0 8px rgba(59, 130, 246, 0.45); }
                    50% { box-shadow: 0 0 16px rgba(59, 130, 246, 0.95); }
                  }
                  `}
                </style>
                <div
                  style={{
                    position: "relative",
                    margin: "0",
                    width: "fit-content",
                    transform: `translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`,
                    transformOrigin: "0 0",
                  }}
                >
                  <RuntimeRenderer page={directPage} bindingEngine={inst.directBindingEngine} onElementEvent={handleRuntimeEvent} />
                </div>
              </div>
            ) : (
              <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#9ca3af" }}>请选择左侧画面</div>
            )
          ) : (
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              title="组态运行画面"
            />
          )}
          {isLoading && (
            <div
              class="cube-scada-page-status"
              style={{
                position: "absolute",
                inset: "0",
                background: "rgba(255,255,255,0.85)",
                pointerEvents: "none",
              }}
            >
              加载中…
            </div>
          )}
          {currentError && !isLoading && (
            <div
              class="cube-scada-page-status cube-scada-page-error"
              style={{
                position: "absolute",
                inset: "0",
                background: "rgba(255,240,240,0.9)",
                pointerEvents: "none",
              }}
            >
              {currentError.message}
            </div>
          )}
        </div>
      );
    };
  },
});
