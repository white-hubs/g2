import { defineComponent, watch, type PropType } from "vue";

import { useControlledPcModal } from "../composables/use-controlled-pc-modal";
import type { FloorMapImageRect, FloorMapPoint } from "../models";
import { Button, Spin } from "@/pc-ui-runtime";

import styles from "../fire-host-control.module.css";

type ElementRefSetter = (element: Element | null) => void;

export const FloorMapModal = defineComponent({
  name: "FloorMapModal",
  props: {
    visible: { type: Boolean, required: true },
    activePoint: { type: Object as PropType<FloorMapPoint | null>, default: null },
    points: { type: Array as PropType<FloorMapPoint[]>, required: true },
    areaName: { type: String, required: true },
    imageUrl: { type: String, required: true },
    loading: { type: Boolean, required: true },
    imageRect: { type: Object as PropType<FloorMapImageRect>, required: true },
    setImageFrameRef: { type: Function as PropType<ElementRefSetter>, required: true },
    setImageRef: { type: Function as PropType<ElementRefSetter>, required: true },
    onImageLoad: { type: Function as PropType<() => void>, required: true },
  },
  emits: { close: () => true },
  setup(props, { emit }) {
    const getTitle = (): string => `楼层平面图 — ${props.activePoint?.locationName || "未定位区域"}`;
    const [PcModal, modalApi] = useControlledPcModal(() => props.visible, {
      title: getTitle(),
      width: "900px",
      onClosed: () => emit("close"),
    });
    watch(
      () => props.activePoint,
      () => modalApi.setState({ title: getTitle() }),
    );
    return () => (
      <PcModal
        v-slots={{
          footer: () => <Button onClick={() => modalApi.close()}>关闭</Button>,
          default: () =>
            props.activePoint ? (
              <div>
                <div class={styles.mapSummary}>
                  <span class={styles.mapPulse} />
                  <span>报警/故障点位:</span>
                  <b style={{ color: "#f53f3f" }}>{props.activePoint.pointName}</b>
                  <span>· 编号</span>
                  <b>{props.activePoint.code}</b>
                  <span>· 位置</span>
                  <b>{props.activePoint.locationName}</b>
                </div>
                <div class={styles.mapWrap}>
                  <div class={styles.mapFrame} ref={(element) => props.setImageFrameRef(element as Element | null)}>
                    <Spin spinning={props.loading}>
                      {props.imageUrl ? (
                        <img
                          src={props.imageUrl}
                          alt="区域平面图"
                          class={styles.mapImage}
                          ref={(element) => props.setImageRef(element as Element | null)}
                          onLoad={props.onImageLoad}
                        />
                      ) : (
                        <div class={styles.mapPlaceholder}>
                          <div class={styles.mapRoom}>大厅</div>
                          <div class={styles.mapRoom}>办公室</div>
                          <div class={styles.mapRoom}>风机房</div>
                          <div class={styles.mapRoom}>水泵房</div>
                          <div class={styles.mapCorridor}>公共走廊</div>
                        </div>
                      )}
                    </Spin>
                    <div class={styles.mapMarkers}>
                      {props.points.map((point) => {
                        const left = Number(point.posX);
                        const top = Number(point.posY);
                        if (Number.isNaN(left) || Number.isNaN(top)) return null;
                        const isActive = point.code === props.activePoint?.code;
                        return (
                          <div
                            key={`${point.code}-${left}-${top}`}
                            class={[styles.mapMarker, isActive && styles.mapMarkerActive]}
                            style={{
                              left: props.imageUrl ? `${props.imageRect.left + (left / 100) * props.imageRect.width}px` : `${left}%`,
                              top: props.imageUrl ? `${props.imageRect.top + (top / 100) * props.imageRect.height}px` : `${top}%`,
                              zIndex: isActive ? 3 : 2,
                            }}
                          >
                            <span class={styles.mapMarkerDot} />
                            <span class={styles.mapMarkerLabel}>{point.pointName || point.code}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div class={styles.mapArea}>
                  <span style={{ color: "#86909c" }}>平面图区域:</span>
                  <span>{props.areaName || props.activePoint.locationName || "未匹配到位置树节点"}</span>
                </div>
              </div>
            ) : null,
        }}
      />
    );
  },
});
