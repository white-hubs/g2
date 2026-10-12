import { defineComponent, onMounted, ref, watch, type PropType } from "vue";

import type { ElementDef } from "../core";
import { applyAnimations } from "./apply-animations";
import { applyMappings } from "./apply-mappings";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Tween numeric prop values from prevProps → nextProps over `duration` ms.
 * Non-numeric props are applied instantly at the first frame.
 * Returns a cancel function that stops the animation mid-flight.
 * `onComplete` is called when the tween finishes naturally (not when cancelled).
 */
function startMappingTween(
  root: Element,
  def: ElementDef,
  nextProps: Record<string, any>,
  prevProps: Record<string, any>,
  duration: number,
  onComplete?: () => void,
): () => void {
  let cancelled = false;
  const startTime = performance.now();

  const frame = () => {
    if (cancelled) return;
    const elapsed = performance.now() - startTime;
    const rawT = Math.min(elapsed / duration, 1);
    const t = easeOut(rawT);

    const interpolated: Record<string, any> = { ...nextProps };
    for (const key of Object.keys(nextProps)) {
      const next = nextProps[key];
      const prev = prevProps[key];
      // 只有数值类型的属性且值发生变化时才进行插值
      if (typeof next === "number" && typeof prev === "number" && next !== prev) {
        interpolated[key] = lerp(prev, next, t);
      } else {
        // 非数值属性（如 BOOL）在每一帧都保持最新值，确保瞬间响应
        interpolated[key] = next;
      }
    }

    applyMappings(root, def, interpolated);

    if (rawT < 1) {
      requestAnimationFrame(frame);
    } else {
      onComplete?.();
    }
  };

  requestAnimationFrame(frame);
  return () => {
    cancelled = true;
  };
}

export const ElementRenderer = defineComponent({
  name: "ElementRenderer",
  props: {
    def: { type: Object as PropType<ElementDef>, required: true },
    elementProps: { type: Object as PropType<Record<string, any>>, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    /** Numeric prop value transition duration in ms. Set to 0 to disable. Default: 500 */
    tweenDuration: { type: Number, default: 500 },
  },
  setup(props) {
    const containerRef = ref<HTMLDivElement>();
    let cancelTween: (() => void) | null = null;
    // Snapshot of numeric target values for the active tween.
    // Used to detect whether an incoming prop update actually changes the tween
    // destination, so spurious re-renders (e.g. from MockDriver's interval
    // timer) do not cancel an in-progress animation.
    let tweenEndProps: Record<string, any> | null = null;

    function clearTween() {
      cancelTween?.();
      cancelTween = null;
      tweenEndProps = null;
    }

    onMounted(() => {
      if (!containerRef.value) return;
      containerRef.value.innerHTML = props.def.svgBody;
      applyMappings(containerRef.value, props.def, props.elementProps);
      applyAnimations(containerRef.value, props.def, props.elementProps);
      props.def.renderFn?.(containerRef.value, props.elementProps, {});
    });

    watch(
      () => props.elementProps,
      (next, prev) => {
        if (!containerRef.value) return;

        // Only restart the tween when the numeric target values actually changed.
        // This prevents the MockDriver polling interval from cancelling an
        // in-progress animation when unrelated props tick with identical numeric values.
        // Start tween only when a numeric prop truly changed from prev -> next.
        // This prevents first-time BOOL-only updates from being queued into rAF,
        // which causes a perceivable delay on the first click.
        const numericTargetChanged = Object.keys(next).some((key) => {
          const n = next[key];
          const p = prev?.[key];
          return typeof n === "number" && typeof p === "number" && n !== p;
        });

        if (numericTargetChanged) {
          clearTween();
          if (props.tweenDuration > 0 && prev) {
            tweenEndProps = { ...next };
            cancelTween = startMappingTween(
              containerRef.value,
              props.def,
              next,
              prev,
              props.tweenDuration,
              () => {
                cancelTween = null;
              }, // clear ref when tween finishes naturally
            );
          } else {
            applyMappings(containerRef.value, props.def, next);
          }
        } else {
          // 数值目标未变，但非数值属性（如 BOOL）可能发生了变化
          applyMappings(containerRef.value, props.def, next);
        }

        // 强制立即应用动画状态
        applyAnimations(containerRef.value, props.def, next, prev ?? {});
        props.def.renderFn?.(containerRef.value, next, prev ?? {});
      },
      { deep: true },
    );

    watch(
      () => props.def,
      () => {
        if (!containerRef.value) return;
        clearTween();
        containerRef.value.innerHTML = props.def.svgBody;
        applyMappings(containerRef.value, props.def, props.elementProps);
        applyAnimations(containerRef.value, props.def, props.elementProps);
      },
    );

    return () => (
      <div
        ref={containerRef}
        class="scada-element"
        style={{
          width: `${props.width}px`,
          height: `${props.height}px`,
          overflow: "hidden",
        }}
      />
    );
  },
});
