/** @jsxImportSource vue */
import type { InteractiveMap, MapConfig } from "@g2-platform/pc-map";
import { Spin, message } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { services, unwrapResponse } from "../../../api/safety-personnel";
import { parseLntAndLat } from "../../../utils/key-personnel/parse-lnt-lat";

import styles from "./track-map.module.css";
export interface TrackPoint {
  lng: number;
  lat: number;
}
export const TrackMap = defineComponent({
  props: { personLabel: { type: String, default: "" }, trackPoints: { type: Array as PropType<TrackPoint[]>, default: () => [] } },
  setup(props) {
    const loading = ref(true),
      container = ref<HTMLDivElement>();
    const projected = ref<{ x: number; y: number }[]>([]);
    let disposed = false,
      map: InteractiveMap | undefined,
      observer: ResizeObserver | undefined;
    const valid = () => props.trackPoints.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    const project = () => {
      if (map) {
        projected.value = valid().map((p) => map!.getMapInstance().latLngToContainerPoint([p.lat, p.lng]));
      }
    };
    const fit = () => {
      if (!map) {
        return;
      }
      const points = valid();
      if (points.length > 0) {
        map.getMapInstance().fitBounds(
          points.map((p): [number, number] => [p.lat, p.lng]),
          { padding: [36, 36], maxZoom: 18, animate: false },
        );
      }
      project();
    };
    onMounted(async () => {
      try {
        const dictionary = await services().dictionary();
        let config: MapConfig = { mapType: "gdMap" };
        const rows = unwrapResponse<{ code: string; variable: string }[]>(
          await dictionary.getDictionaryByItem({ itemCode: "THIRD_SERVICE" }),
        );
        for (const code of ["TD_MAP", "gdMap"] as const) {
          const record = rows.find((item) => item.code === code);
          if (record?.variable) {
            const parsed: MapConfig = JSON.parse(record.variable);
            if (parsed.webKey) {
              config = { ...parsed, mapType: code };
              break;
            }
          }
        }
        const centers = unwrapResponse<{ code: string; variable: string }[]>(
          await dictionary.getDictionaryByItem({ itemCode: "COMMAND_DISPATCH_MAP_CONFIG" }),
        );
        const center = parseLntAndLat(centers.find((item) => item.code === "lnglat")?.variable);
        if (disposed) {
          return;
        }
        const { InteractiveMap: MapView } = await import("@g2-platform/pc-map");
        if (disposed) {
          return;
        }
        map = new MapView(config);
        await map.renderMap("safety-personnel-key-personnel-track-map", center ? { center } : undefined);
        if (disposed) {
          map.destroy();
          return;
        }
        map.getMapInstance().on("move zoom resize", project);
        observer = new ResizeObserver(() => {
          map?.getMapInstance().invalidateSize();
          project();
        });
        if (container.value) {
          observer.observe(container.value);
        }
        fit();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "地图加载失败");
      } finally {
        loading.value = false;
      }
    });
    watch(() => props.trackPoints, fit, { deep: true });
    onBeforeUnmount(() => {
      disposed = true;
      observer?.disconnect();
      map?.destroy();
    });
    return () => (
      <div class={styles.wrap} ref={container}>
        <div id="safety-personnel-key-personnel-track-map" class={styles.map} />
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 450 }}>
          <polyline
            points={projected.value.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="none"
            stroke="#1677ff"
            stroke-width="5"
          />
          {projected.value.map((point, index) => (
            <g key={index} transform={`translate(${point.x},${point.y})`}>
              <circle
                r="13"
                fill={index === 0 ? "#00ba8b" : index === projected.value.length - 1 ? "#f53f3f" : "#1677ff"}
                stroke="white"
                stroke-width="2"
              />
              <text fill="white" text-anchor="middle" dominant-baseline="central" font-size="12">
                {index === 0 ? "起" : index === projected.value.length - 1 ? "终" : index + 1}
              </text>
            </g>
          ))}
        </svg>
        {loading.value ? (
          <div class={styles.loadingMask}>
            <Spin />
          </div>
        ) : null}
        {props.personLabel ? <div class={styles.overlay}>{props.personLabel}</div> : null}
      </div>
    );
  },
});
