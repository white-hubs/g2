import { defineComponent, shallowRef, watch, type PropType } from "vue";

import { useControlledPcModal } from "../composables/use-controlled-pc-modal";
import type { MonitorMetricDevice, MonitorPoint } from "../models";
import { Button, InputNumber } from "@/pc-ui-runtime";

import styles from "../fire-host-control.module.css";

export const RangeEditorModal = defineComponent({
  name: "RangeEditorModal",
  props: {
    device: { type: Object as PropType<MonitorMetricDevice | null>, default: null },
    point: { type: Object as PropType<MonitorPoint | null>, default: null },
  },
  emits: { close: () => true, save: (_min: number, _max: number) => true },
  setup(props, { emit }) {
    const minValue = shallowRef(0);
    const maxValue = shallowRef(0);
    watch(
      () => props.point,
      (point) => {
        minValue.value = point?.min ?? 0;
        maxValue.value = point?.max ?? 0;
      },
      { immediate: true },
    );
    const [PcModal, modalApi] = useControlledPcModal(() => Boolean(props.device && props.point), {
      title: "修改参考范围",
      width: "440px",
      onClosed: () => emit("close"),
    });
    return () => (
      <PcModal
        v-slots={{
          default: () =>
            props.device && props.point ? (
              <div class={styles.rangeEditor}>
                <div class={styles.rangeMetric}>
                  <span>{props.device.icon}</span>
                  <div>
                    <strong>{props.device.name}</strong>
                    <small>
                      {props.point.label} · 当前 {props.point.value}
                      {props.point.unit}
                    </small>
                  </div>
                </div>
                <label>
                  <span>最小值</span>
                  <InputNumber value={minValue.value} onChange={(value: unknown) => (minValue.value = Number(value))} />
                  <em>{props.point.unit}</em>
                </label>
                <label>
                  <span>最大值</span>
                  <InputNumber value={maxValue.value} onChange={(value: unknown) => (maxValue.value = Number(value))} />
                  <em>{props.point.unit}</em>
                </label>
              </div>
            ) : null,
          footer: () => (
            <div class={styles.standardModalFooter}>
              <Button onClick={() => modalApi.close()}>取消</Button>
              <Button type="primary" onClick={() => emit("save", minValue.value, maxValue.value)}>
                保存
              </Button>
            </div>
          ),
        }}
      />
    );
  },
});
