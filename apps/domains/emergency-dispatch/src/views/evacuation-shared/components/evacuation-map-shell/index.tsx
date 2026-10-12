// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref, type PropType, type VNode } from "vue";

import type { EvacuationMapEngine } from "../../composables/map-engine-types";
import { Spin } from "@/pc-ui-runtime";

import "./index.less";

const MIN_MAP_HEIGHT = 50;

export const EvacuationMapShell = defineComponent({
  name: "EvacuationMapShell",
  props: {
    engine: { type: Object as PropType<EvacuationMapEngine>, required: true },
    showPanControl: { type: Boolean, default: false },
    panActive: { type: Boolean, default: false },
    onTogglePan: { type: Function as PropType<() => void> },
    mapClass: { type: String, default: "" },
    minHeight: { type: Number, default: 420 },
    fill: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    const shellRef = ref<HTMLDivElement | null>(null);
    const mapRef = ref<HTMLDivElement | null>(null);
    let resizeObserver: ResizeObserver | null = null;
    let initStarted = false;

    const ensureMapReady = (): void => {
      if (!document.getElementById(props.engine.mapId)) {
        return;
      }
      if (props.fill) {
        const measured = mapRef.value?.clientHeight ?? shellRef.value?.clientHeight ?? 0;
        if (measured < MIN_MAP_HEIGHT) {
          return;
        }
      }
      if (initStarted) {
        props.engine.invalidateMapSize?.();
        return;
      }
      initStarted = true;
      void props.engine.initMap().then(() => {
        props.engine.invalidateMapSize?.();
      });
    };

    onMounted(async () => {
      await nextTick();
      ensureMapReady();
      if (!shellRef.value) {
        return;
      }
      resizeObserver = new ResizeObserver(() => {
        ensureMapReady();
      });
      resizeObserver.observe(shellRef.value);
    });

    onBeforeUnmount(() => {
      resizeObserver?.disconnect();
      resizeObserver = null;
    });

    return (): JSX.Element => (
      <div
        ref={shellRef}
        class={["evacuation-map-shell", props.fill ? "evacuation-map-shell--fill" : ""].filter(Boolean).join(" ")}
        style={{ minHeight: `${props.minHeight}px` }}
      >
        <Spin spinning={props.engine.loading.value}>
          <div class="evacuation-map-shell__inner">
            <div
              ref={mapRef}
              id={props.engine.mapId}
              class={["evacuation-map-shell__map", props.mapClass].filter(Boolean).join(" ")}
              style={props.fill ? { minHeight: `${props.minHeight}px`, height: "100%" } : { height: `${props.minHeight}px` }}
            />
            <div class="evacuation-map-shell__controls">
              <button type="button" class="map-ctrl-btn" title="放大地图" onClick={() => props.engine.zoomIn()}>
                ＋
              </button>
              <button type="button" class="map-ctrl-btn" title="缩小地图" onClick={() => props.engine.zoomOut()}>
                －
              </button>
              <button type="button" class="map-ctrl-btn" title="复位地图" onClick={() => props.engine.resetView()}>
                ⌂
              </button>
              {props.showPanControl ? (
                <button
                  type="button"
                  class={["map-ctrl-btn", props.panActive ? "map-ctrl-btn--active" : ""].filter(Boolean).join(" ")}
                  title="平移地图"
                  onClick={() => props.onTogglePan?.()}
                >
                  ✋
                </button>
              ) : null}
            </div>
            {(slots.default?.() as VNode[] | undefined)?.length ? (
              <div class="evacuation-map-shell__overlay-chrome">{slots.default?.()}</div>
            ) : null}
          </div>
        </Spin>
      </div>
    );
  },
});
