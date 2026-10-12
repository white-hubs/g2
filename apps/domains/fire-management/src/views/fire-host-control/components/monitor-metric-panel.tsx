import { computed, defineComponent, type PropType } from "vue";

import type { MonitorMetricDevice, MonitorPoint } from "../models";
import { RecordsEmptyState } from "./records-empty-state";
import { Button, PlusOutlined, SettingOutlined } from "@/pc-ui-runtime";

import styles from "../fire-host-control.module.css";

const getActivePoint = (device: MonitorMetricDevice): MonitorPoint =>
  device.points.find((point) => point.id === device.selectedPointId) || device.points[0];
const getRatio = (point: MonitorPoint): number => Math.round(((point.value - point.min) / Math.max(point.max - point.min, 0.01)) * 100);

export const MonitorMetricPanel = defineComponent({
  name: "MonitorMetricPanel",
  props: {
    type: { type: String as PropType<"water" | "electric">, required: true },
    devices: { type: Array as PropType<MonitorMetricDevice[]>, required: true },
  },
  emits: { configure: () => true, addDevice: () => true, editRange: (_device: MonitorMetricDevice) => true },
  setup(props, { emit }) {
    const warningCount = computed(
      () =>
        props.devices.filter((device) => {
          const point = getActivePoint(device);
          return point.value < point.min || point.value > point.max;
        }).length,
    );
    return () => (
      <section class={styles.metricPanel}>
        <div class={styles.metricToolbar}>
          <div>
            <strong>{props.type === "water" ? "消防用水监测" : "消防用电监测"}</strong>
            <span>
              已关联 {props.devices.length} 台设备 · {warningCount.value ? <b>{warningCount.value} 项异常</b> : "状态正常"}
            </span>
          </div>
          <div>
            <Button icon={<SettingOutlined />} onClick={() => emit("configure")}>
              面板配置
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => emit("addDevice")}>
              添加设备
            </Button>
          </div>
        </div>
        <div class={styles.metricGrid}>
          {props.devices.length ? (
            props.devices.map((device) => {
              const point = getActivePoint(device);
              const ratio = getRatio(point);
              const warning = point.value < point.min || point.value > point.max;
              const canEditRange = Boolean(device.relationId && device.selectedPointId && device.selectedPointId !== "unconfigured");
              return (
                <article key={device.id} class={[styles.metricCard, warning && styles.metricWarning]}>
                  <button
                    type="button"
                    class={styles.metricEditButton}
                    title={canEditRange ? "修改参考范围" : "请先完成面板配置"}
                    aria-label={`编辑${device.name}参考范围`}
                    disabled={!canEditRange}
                    onClick={() => emit("editRange", device)}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M4 20h4.2L19 9.2 14.8 5 4 15.8V20Zm2-3.4 8.8-8.8 1.4 1.4L7.4 18H6v-1.4ZM20.3 7.9a1 1 0 0 0 0-1.4l-2.8-2.8a1 1 0 0 0-1.4 0l-1 1 4.2 4.2 1-1Z" />
                    </svg>
                  </button>
                  <div class={styles.metricHeader}>
                    <span class={styles.metricIcon}>{device.icon}</span>
                    <div>
                      <strong>{device.name}</strong>
                      <span>{point.label}</span>
                    </div>
                    <em class={warning ? styles.metricTagWarning : ""}>{warning ? "异常" : "正常"}</em>
                  </div>
                  <div class={styles.metricValue}>
                    {point.value}
                    <span>{point.unit}</span>
                  </div>
                  <div class={styles.metricReference}>
                    参考范围 {point.min} – {point.max}
                    {point.unit}
                  </div>
                  <div class={styles.progressTrack}>
                    <div
                      class={styles.progressValue}
                      style={{ width: `${Math.min(100, Math.max(0, ratio))}%`, background: warning ? "#f53f3f" : "#165dff" }}
                    />
                  </div>
                  <div class={styles.metricFooter}>
                    <span>{device.category}</span>
                    <span>更新于 {device.updatedAt}</span>
                  </div>
                </article>
              );
            })
          ) : (
            <RecordsEmptyState
              compact
              description={`暂无${props.type === "water" ? "消防用水" : "消防用电"}监测设备`}
              detail="请点击“添加设备”完成关联"
            />
          )}
        </div>
      </section>
    );
  },
});
