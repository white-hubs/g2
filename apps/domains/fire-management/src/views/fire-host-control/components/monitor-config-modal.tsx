import type { FireUtilityPanelItemParam } from "@g2-contract/fire-management";
import { computed, defineComponent, shallowRef, watch, type PropType } from "vue";

import { useControlledPcModal } from "../composables/use-controlled-pc-modal";
import type { MonitorMetricDevice } from "../models";
import { Button, InputNumber, Tag, message } from "@/pc-ui-runtime";

import styles from "../fire-host-control.module.css";

type ConfigDevice = MonitorMetricDevice;

const cloneDevices = (devices: MonitorMetricDevice[]): ConfigDevice[] =>
  devices.map((device) => ({ ...device, points: device.points.map((point) => ({ ...point })) }));

export const MonitorConfigModal = defineComponent({
  name: "MonitorConfigModal",
  props: {
    visible: { type: Boolean, required: true },
    type: { type: String as PropType<"water" | "electric">, required: true },
    devices: { type: Array as PropType<MonitorMetricDevice[]>, required: true },
    saving: { type: Boolean, default: false },
  },
  emits: { close: () => true, save: (_items: FireUtilityPanelItemParam[]) => true },
  setup(props, { emit }) {
    const draftDevices = shallowRef<ConfigDevice[]>([]);
    const activeDeviceId = shallowRef("");
    const activeDevice = computed(() => draftDevices.value.find((device) => device.id === activeDeviceId.value) || draftDevices.value[0]);
    const activePoint = computed(
      () => activeDevice.value?.points.find((point) => point.id === activeDevice.value?.selectedPointId) || activeDevice.value?.points[0],
    );
    const previewRatio = computed(() => {
      const point = activePoint.value;
      if (!point || point.max <= point.min) return 0;
      return Math.min(100, Math.max(0, ((point.value - point.min) / (point.max - point.min)) * 100));
    });
    const getTitle = (): string => `${props.type === "water" ? "消防用水" : "消防用电"} · 面板配置`;
    const [PcModal, modalApi] = useControlledPcModal(() => props.visible, {
      title: getTitle(),
      width: "860px",
      onClosed: () => emit("close"),
    });
    const syncDraft = (): void => {
      draftDevices.value = cloneDevices(props.devices);
      activeDeviceId.value = draftDevices.value[0]?.id || "";
    };
    watch(
      () => props.type,
      () => modalApi.setState({ title: getTitle() }),
    );
    watch(() => props.devices, syncDraft, { immediate: true });

    const selectPoint = (deviceId: string, pointId: string): void => {
      draftDevices.value = draftDevices.value.map((device) => (device.id === deviceId ? { ...device, selectedPointId: pointId } : device));
      activeDeviceId.value = deviceId;
    };
    const updateRange = (key: "min" | "max", value: unknown): void => {
      const device = activeDevice.value;
      const point = activePoint.value;
      const numericValue = Number(value);
      if (!device || !point || !Number.isFinite(numericValue)) return;
      draftDevices.value = draftDevices.value.map((item) =>
        item.id !== device.id
          ? item
          : {
              ...item,
              selectedPointId: item.selectedPointId || point.id,
              points: item.points.map((candidate) => (candidate.id === point.id ? { ...candidate, [key]: numericValue } : candidate)),
            },
      );
    };
    const apply = (): void => {
      const items = draftDevices.value
        .filter((device) => device.relationId && device.selectedPointId && !["metric", "unconfigured"].includes(device.selectedPointId))
        .map((device) => {
          const point = device.points.find((candidate) => candidate.id === device.selectedPointId)!;
          return { relationId: device.relationId!, metricPropCode: point.id, referenceMin: point.min, referenceMax: point.max };
        });
      if (!items.length) {
        message.warning("监测属性仍在加载中，请稍候后再应用配置");
        return;
      }
      if (items.some((item) => item.referenceMin == null || item.referenceMax == null || item.referenceMin >= item.referenceMax)) {
        message.warning("每个监测属性的最大值必须大于最小值");
        return;
      }
      emit("save", items);
    };
    return () => (
      <PcModal
        v-slots={{
          default: () => (
            <div class={styles.monitorConfigLayout}>
              <div class={styles.monitorConfigDevices}>
                {draftDevices.value.map((device) => (
                  <article key={device.id} class={[styles.configDevice, device.id === activeDevice.value?.id && styles.configDeviceActive]}>
                    <button type="button" class={styles.configDeviceHeader} onClick={() => (activeDeviceId.value = device.id)}>
                      <span>{device.icon}</span>
                      <strong>{device.name}</strong>
                    </button>
                    <div class={styles.configPoints}>
                      {device.points.map((point) => (
                        <button
                          key={point.id}
                          type="button"
                          class={point.id === device.selectedPointId && styles.configPointActive}
                          onClick={() => selectPoint(device.id, point.id)}
                        >
                          <span>{point.label}</span>
                          <b>
                            {point.value}
                            {point.unit}
                          </b>
                          {point.id === device.selectedPointId ? <Tag color="blue">当前展示</Tag> : null}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              <div class={styles.monitorConfigEditor}>
                {activeDevice.value && activePoint.value ? (
                  <>
                    <strong>{activeDevice.value.name}</strong>
                    <span>
                      当前指标：{activePoint.value.label} · 当前值 {activePoint.value.value}
                      {activePoint.value.unit}
                    </span>
                    <div class={styles.rangeEditor}>
                      <label>
                        <span>最小值</span>
                        <InputNumber value={activePoint.value.min} onChange={(value: unknown) => updateRange("min", value)} />
                        <em>{activePoint.value.unit}</em>
                      </label>
                      <label>
                        <span>最大值</span>
                        <InputNumber value={activePoint.value.max} onChange={(value: unknown) => updateRange("max", value)} />
                        <em>{activePoint.value.unit}</em>
                      </label>
                    </div>
                    <div class={styles.monitorConfigPreview}>
                      <small>卡片预览</small>
                      <div class={styles.monitorConfigPreviewCard}>
                        <strong>
                          {activeDevice.value.icon} {activeDevice.value.name}
                        </strong>
                        <span>{activePoint.value.label}</span>
                        <b>
                          {activePoint.value.value}
                          <em>{activePoint.value.unit}</em>
                        </b>
                        <p>
                          参考范围 {activePoint.value.min} – {activePoint.value.max}
                          {activePoint.value.unit}
                        </p>
                        <i>
                          <i style={{ width: `${previewRatio.value}%` }} />
                        </i>
                        <small>更新于 {activeDevice.value.updatedAt}</small>
                      </div>
                    </div>
                  </>
                ) : (
                  <div class={styles.configIntro}>请先添加设备并选择可监测的数值属性。</div>
                )}
              </div>
            </div>
          ),
          footer: () => (
            <div class={styles.standardModalFooter}>
              <Button onClick={() => modalApi.close()}>取消</Button>
              <Button type="primary" loading={props.saving} onClick={apply}>
                应用配置
              </Button>
            </div>
          ),
        }}
      />
    );
  },
});
