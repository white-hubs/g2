import type { LongId, MonitorPanelConfig } from "@g2-contract/electrical-safety";
import { Button, Checkbox, Empty, Modal, PcIcon, Space, Spin, message } from "@g2-platform/pc-ui";
import type { PropType } from "vue";
import { computed, defineComponent, reactive, shallowRef, watch } from "vue";

import { getMonitorPanelConfig, saveMonitorPanelConfig } from "@/api/electrical-safety";

type PanelSelectedItem = MonitorPanelConfig["selectedItems"][number];

const itemKey = (item: Pick<PanelSelectedItem, "deviceId" | "propertyCode">): string => `${String(item.deviceId)}:${item.propertyCode}`;

export const MonitorPanelConfigModal = defineComponent({
  name: "MonitorPanelConfigModal",
  props: {
    open: { type: Boolean, required: true },
    facilityId: { type: [String, Number] as PropType<LongId>, required: true },
    facilityName: { type: String, default: "" },
  },
  emits: {
    close: (): boolean => true,
    saved: (): boolean => true,
  },
  setup: (props, { emit }) => {
    const config = shallowRef<MonitorPanelConfig | null>(null);
    const selected = reactive<PanelSelectedItem[]>([]);
    const loading = shallowRef(false);
    const saving = shallowRef(false);
    const draggedItemKey = shallowRef("");

    const availableDevices = computed(() => config.value?.availableDevices ?? []);
    const replaceSelected = (items: PanelSelectedItem[]): void => {
      selected.splice(0, selected.length, ...items.map((item) => ({ ...item })));
    };
    const load = async (): Promise<void> => {
      if (!props.open) {
        return;
      }
      loading.value = true;
      try {
        const result = await getMonitorPanelConfig(props.facilityId);
        config.value = result;
        replaceSelected(result.selectedItems ?? []);
      } catch {
        config.value = null;
        replaceSelected([]);
      } finally {
        loading.value = false;
      }
    };

    watch(
      () => [props.open, props.facilityId] as const,
      () => void load(),
      { immediate: true },
    );

    const isSelected = (deviceId: LongId, propertyCode: string): boolean =>
      selected.some((item) => itemKey(item) === itemKey({ deviceId, propertyCode }));
    const toggle = (deviceId: LongId, propertyCode: string, checked: boolean): void => {
      const index = selected.findIndex((item) => itemKey(item) === itemKey({ deviceId, propertyCode }));
      if (checked && index === -1) {
        const device = availableDevices.value.find((item) => String(item.deviceId) === String(deviceId));
        const property = device?.properties.find((item) => item.propertyCode === propertyCode);
        if (device && property) {
          selected.push({
            deviceId,
            deviceName: device.deviceName,
            propertyCode,
            propertyName: property.propertyName,
            unit: property.unit,
            sort: selected.length + 1,
          });
        }
      } else if (!checked && index !== -1) {
        selected.splice(index, 1);
      }
      selected.forEach((item, position) => (item.sort = position + 1));
    };

    const moveTo = (sourceKey: string, targetIndex: number): void => {
      const sourceIndex = selected.findIndex((item) => itemKey(item) === sourceKey);
      if (sourceIndex === -1 || targetIndex < 0 || targetIndex >= selected.length || sourceIndex === targetIndex) {
        return;
      }
      const [item] = selected.splice(sourceIndex, 1);
      selected.splice(targetIndex, 0, item);
      selected.forEach((entry, order) => (entry.sort = order + 1));
    };

    const handleDrop = (targetKey: string): void => {
      const sourceKey = draggedItemKey.value;
      draggedItemKey.value = "";
      if (!sourceKey || sourceKey === targetKey) {
        return;
      }
      moveTo(
        sourceKey,
        selected.findIndex((item) => itemKey(item) === targetKey),
      );
    };

    const reset = (): void => {
      const defaults = availableDevices.value.flatMap((device) =>
        device.properties.slice(0, 2).map((property, index) => ({
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          propertyCode: property.propertyCode,
          propertyName: property.propertyName,
          unit: property.unit,
          sort: index + 1,
        })),
      );
      replaceSelected(defaults);
    };

    const save = async (): Promise<void> => {
      saving.value = true;
      try {
        await saveMonitorPanelConfig(props.facilityId, {
          items: selected.map((item) => ({ deviceId: item.deviceId, propertyCode: item.propertyCode })),
        });
        message.success("监测面板配置已保存");
        emit("saved");
        emit("close");
      } catch {
        // 网关已提示具体失败原因，保留弹窗供用户重试。
      } finally {
        saving.value = false;
      }
    };

    return (): JSX.Element => (
      <Modal
        okText="确定"
        cancelText="取消"
        open={props.open}
        title={`${props.facilityName || "当前设施"} · 监测面板配置`}
        width="820px"
        confirmLoading={saving.value}
        destroyOnClose
        wrapClassName="monitor-panel-config-modal electrical-viewport-modal"
        onCancel={() => emit("close")}
        onOk={() => void save()}
      >
        <Spin spinning={loading.value} class="monitor-panel-config-spin">
          <div class={["monitor-panel-config-body", config.value && "has-config"]}>
            {!config.value ? (
              <Empty description={loading.value ? "正在加载可选监测点位..." : "暂无可配置监测点位"} />
            ) : (
              <div class="monitor-panel-config">
                <div class="monitor-config-options">
                  <div class="config-section-title">可选监测点位</div>
                  {availableDevices.value.map((device) => (
                    <div class="monitor-config-group" key={String(device.deviceId)}>
                      <strong>{device.deviceName}</strong>
                      {device.properties.map((property) => (
                        <label class="monitor-config-option" key={property.propertyCode}>
                          <Checkbox
                            checked={isSelected(device.deviceId, property.propertyCode)}
                            onUpdate:checked={(inputValue) => {
                              const checked = inputValue as boolean;
                              return toggle(device.deviceId, property.propertyCode, checked);
                            }}
                          />
                          <span>{property.propertyName}</span>
                          <small>{property.unit ?? ""}</small>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                <div class="monitor-config-selected">
                  <div class="config-section-title">
                    <span>已选展示点位</span>
                    <Button type="link" size="small" onClick={reset}>
                      恢复默认
                    </Button>
                  </div>
                  {selected.length > 0 ? (
                    selected.map((item, index) => (
                      <div
                        class={["monitor-selected-row", draggedItemKey.value === itemKey(item) && "is-dragging"]}
                        key={itemKey(item)}
                        onDragover={(event: DragEvent) => event.preventDefault()}
                        onDrop={() => handleDrop(itemKey(item))}
                      >
                        <span
                          class="monitor-selected-drag-handle"
                          draggable
                          title="拖拽排序"
                          onDragstart={(event: DragEvent) => {
                            const key = itemKey(item);
                            draggedItemKey.value = key;
                            event.dataTransfer?.setData("text/plain", key);
                            if (event.dataTransfer) {
                              event.dataTransfer.effectAllowed = "move";
                            }
                          }}
                          onDragend={() => (draggedItemKey.value = "")}
                        >
                          <PcIcon iconClass="icon-tuozhuai" size={16} />
                        </span>
                        <b>{index + 1}</b>
                        <span>
                          {item.deviceName} · {item.propertyName}
                        </span>
                        <small>{item.unit ?? ""}</small>
                        <Space size={2}>
                          <Button size="small" type="link" danger onClick={() => toggle(item.deviceId, item.propertyCode, false)}>
                            移除
                          </Button>
                        </Space>
                      </div>
                    ))
                  ) : (
                    <Empty description="请从左侧选择需要展示的点位" />
                  )}
                </div>
              </div>
            )}
          </div>
        </Spin>
      </Modal>
    );
  },
});
