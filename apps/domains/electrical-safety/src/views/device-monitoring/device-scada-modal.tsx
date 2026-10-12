import type { MonitoringDevice } from "@g2-contract/electrical-safety";
import { Button, Modal, Spin } from "@g2-platform/pc-ui";
import { type PropType, computed, defineComponent, shallowRef, watch } from "vue";

import { getDeviceRealtimeProperties, getMonitoringDevice } from "@/api/electrical-safety";
import { useDeviceRealtime } from "@/composables/use-device-realtime";
import { type FacilityDeviceScadaData, buildSingleDeviceScadaRuntimeBindings } from "@/utils/facility-scada-binding";
import { type DeviceScadaPageSummary, fetchDeviceScadaPageByProduct } from "@/utils/scada-pages";
import { ScadaPlaceholder } from "@/views/shared/scada-placeholder";
import { ScadaRuntimeView } from "@/views/shared/scada-runtime-view";

export const DeviceScadaModal = defineComponent({
  name: "DeviceScadaModal",
  props: {
    open: { type: Boolean, required: true },
    device: {
      type: Object as PropType<MonitoringDevice | null>,
      default: null,
    },
  },
  emits: {
    close: (): boolean => true,
  },
  setup: (props, { emit }) => {
    const loading = shallowRef(false);
    const error = shallowRef("");
    const matchedPage = shallowRef<DeviceScadaPageSummary | null>(null);
    const deviceData = shallowRef<FacilityDeviceScadaData | null>(null);
    let requestVersion = 0;

    const title = computed(() => `${props.device?.deviceName ?? "设备"} · 二维组态`);
    const runtimeBindings = computed(() =>
      matchedPage.value && deviceData.value ? buildSingleDeviceScadaRuntimeBindings(matchedPage.value.elementIds, deviceData.value) : [],
    );

    const { setTargets: setRealtimeTargets } = useDeviceRealtime((updates) => {
      const current = deviceData.value;
      const deviceId = String(props.device?.deviceId ?? "");
      if (!props.open || !current || !deviceId) {
        return;
      }
      const updateMap = new Map(updates.filter((update) => update.deviceId === deviceId).map((update) => [update.propertyCode, update]));
      if (updateMap.size === 0) {
        return;
      }
      let changed = false;
      const properties = current.realtime.properties.map((property) => {
        const update = updateMap.get(property.propertyCode);
        if (!update) {
          return property;
        }
        changed = true;
        return {
          ...property,
          value: update.value,
          ...(update.status ? { status: update.status } : {}),
          ...(update.collectTime !== undefined ? { collectTime: update.collectTime } : {}),
        };
      });
      if (changed) {
        deviceData.value = { ...current, realtime: { ...current.realtime, properties } };
      }
    });

    const reset = (): void => {
      requestVersion += 1;
      loading.value = false;
      error.value = "";
      matchedPage.value = null;
      deviceData.value = null;
      setRealtimeTargets([]);
    };

    const load = async (): Promise<void> => {
      const device = props.device;
      if (!props.open || !device) {
        reset();
        return;
      }
      const version = ++requestVersion;
      const deviceId = String(device.deviceId);
      loading.value = true;
      error.value = "";
      matchedPage.value = null;
      deviceData.value = null;
      setRealtimeTargets([]);
      if (!device.productCode.trim()) {
        loading.value = false;
        return;
      }
      try {
        const [page, basic, realtime] = await Promise.all([
          fetchDeviceScadaPageByProduct(device.productCode),
          getMonitoringDevice(deviceId),
          getDeviceRealtimeProperties(deviceId),
        ]);
        if (version !== requestVersion) {
          return;
        }
        matchedPage.value = page;
        deviceData.value = { basic, realtime };
        if (page) {
          setRealtimeTargets(
            realtime.properties.map((property) => ({
              deviceId,
              propertyCode: property.propertyCode,
            })),
          );
        }
      } catch (cause) {
        if (version !== requestVersion) {
          return;
        }
        error.value = cause instanceof Error ? cause.message : "设备二维组态加载失败";
        setRealtimeTargets([]);
      } finally {
        if (version === requestVersion) {
          loading.value = false;
        }
      }
    };

    watch([() => props.open, () => String(props.device?.deviceId ?? ""), () => props.device?.productCode ?? ""], () => void load(), {
      immediate: true,
    });

    return (): JSX.Element => (
      <Modal
        okText="确定"
        cancelText="取消"
        open={props.open}
        title={title.value}
        width="1100px"
        wrapClassName="electrical-viewport-modal device-scada-modal-wrap"
        footer={null}
        destroyOnClose
        onCancel={() => emit("close")}
      >
        <div class="device-scada-modal">
          {loading.value ? (
            <div class="device-scada-modal-state">
              <Spin spinning tip="正在匹配设备二维组态..." />
            </div>
          ) : error.value ? (
            <ScadaPlaceholder description="二维组态加载失败" copy={error.value}>
              <Button type="primary" onClick={() => void load()}>
                重新加载
              </Button>
            </ScadaPlaceholder>
          ) : !props.device?.productCode ? (
            <ScadaPlaceholder description="当前设备未关联产品" copy="无法根据产品类型匹配二维组态图。" />
          ) : !matchedPage.value ? (
            <ScadaPlaceholder
              description="当前设备产品未绑定二维组态图"
              copy={`未找到产品“${props.device.productName || props.device.productCode}”对应的单设备组态。`}
            />
          ) : (
            <div class="device-scada-modal-canvas">
              <ScadaRuntimeView pageId={matchedPage.value.id} elementBindings={runtimeBindings.value} />
            </div>
          )}
        </div>
      </Modal>
    );
  },
});
