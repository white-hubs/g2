import {
  DeviceKind,
  type ElectricalDeviceTypeParameterConfig,
  type EnvironmentDeviceParameterConfig,
  type EnvironmentParameterMappingSaveItem,
  type FacilityDevice,
  type LongId,
} from "@g2-contract/electrical-safety";
import { Modal, message } from "@g2-platform/pc-ui";
import type { PropType } from "vue";
import { defineComponent, reactive, shallowRef, watch } from "vue";

import { ElectricalParameterConfigForm } from "./electrical-parameter-config-form";
import { EnvironmentParameterConfigForm } from "./environment-parameter-config-form";
import {
  getDeviceConfig,
  getEnvironmentDeviceParameterConfig,
  listElectricalDeviceTypeParameterConfigs,
  saveDeviceConfig,
  saveEnvironmentDeviceParameterConfig,
} from "@/api/electrical-safety";

type ConfigurableDeviceKind = DeviceKind.ELECTRICAL | DeviceKind.ENVIRONMENT;

const clearRecord = (target: Record<string, string>): void => {
  for (const key of Object.keys(target)) {
    delete target[key];
  }
};

export const DeviceConfigModal = defineComponent({
  name: "DeviceConfigModal",
  props: {
    open: { type: Boolean, required: true },
    facilityId: { type: [String, Number] as PropType<LongId>, required: true },
    deviceKind: { type: String as PropType<ConfigurableDeviceKind>, required: true },
    device: { type: Object as PropType<FacilityDevice | null>, default: null },
  },
  emits: {
    close: (): boolean => true,
    saved: (): boolean => true,
  },
  setup: (props, { emit }) => {
    const loading = shallowRef(false);
    const loaded = shallowRef(false);
    const saving = shallowRef(false);
    const electricalTypeConfigs = shallowRef<ElectricalDeviceTypeParameterConfig[]>([]);
    const selectedElectricalDeviceType = shallowRef("");
    const electricalValues = reactive<Record<string, string>>({});
    const environmentConfig = shallowRef<EnvironmentDeviceParameterConfig | null>(null);
    const environmentItems = shallowRef<EnvironmentParameterMappingSaveItem[]>([]);

    const selectedElectricalConfig = (): ElectricalDeviceTypeParameterConfig | undefined =>
      electricalTypeConfigs.value.find((item) => item.deviceType === selectedElectricalDeviceType.value);

    const replaceElectricalValues = (config: ElectricalDeviceTypeParameterConfig | undefined, source: Record<string, unknown>): void => {
      clearRecord(electricalValues);
      for (const parameter of config?.parameters ?? []) {
        const savedValue = source[parameter.parameterCode];
        electricalValues[parameter.parameterCode] = savedValue == null ? (parameter.defaultValue ?? "") : String(savedValue);
      }
    };

    const resetState = (): void => {
      loaded.value = false;
      electricalTypeConfigs.value = [];
      selectedElectricalDeviceType.value = "";
      clearRecord(electricalValues);
      environmentConfig.value = null;
      environmentItems.value = [];
    };

    const loadElectricalConfig = async (): Promise<void> => {
      if (!props.device) {
        return;
      }
      const [typeConfigs, deviceConfig] = await Promise.all([
        listElectricalDeviceTypeParameterConfigs(),
        getDeviceConfig(props.facilityId, props.device!.deviceId),
      ]);
      electricalTypeConfigs.value = typeConfigs;
      selectedElectricalDeviceType.value = typeConfigs.some((item) => item.deviceType === deviceConfig.deviceType)
        ? (deviceConfig.deviceType ?? "")
        : "";
      replaceElectricalValues(selectedElectricalConfig(), deviceConfig.config);
    };

    const loadEnvironmentConfig = async (): Promise<void> => {
      if (!props.device) {
        return;
      }
      const result = await getEnvironmentDeviceParameterConfig(props.facilityId, props.device!.deviceId);
      environmentConfig.value = result;
      environmentItems.value = result.items.map((item) => ({
        propertyCode: item.propertyCode,
        parameterTypeCode: item.parameterTypeCode,
      }));
    };

    const loadConfig = async (): Promise<void> => {
      if (!props.open || !props.device) {
        return;
      }
      loading.value = true;
      resetState();
      try {
        if (props.deviceKind === DeviceKind.ELECTRICAL) {
          await loadElectricalConfig();
        } else {
          await loadEnvironmentConfig();
        }
        loaded.value = true;
      } catch {
        // 网关已提示错误，保留空态供用户关闭后重试。
      } finally {
        loading.value = false;
      }
    };

    watch(
      () => [props.open, props.device?.deviceId, props.deviceKind] as const,
      ([open]) => {
        if (open) {
          void loadConfig();
        } else {
          resetState();
        }
      },
      { immediate: true },
    );

    const changeElectricalDeviceType = (deviceType: string): void => {
      selectedElectricalDeviceType.value = deviceType;
      replaceElectricalValues(selectedElectricalConfig(), {});
    };

    const updateEnvironmentItem = (index: number, next: Partial<EnvironmentParameterMappingSaveItem>): void => {
      environmentItems.value = environmentItems.value.map((item, itemIndex) => (itemIndex === index ? { ...item, ...next } : item));
    };

    const addEnvironmentItem = (): void => {
      const config = environmentConfig.value;
      const property = config?.availableProperties[0];
      const parameterType = config?.parameterTypes[0];
      if (!property || !parameterType) {
        return;
      }
      environmentItems.value = [...environmentItems.value, { propertyCode: property.propertyCode, parameterTypeCode: parameterType.code }];
    };

    const saveElectricalConfig = async (): Promise<boolean> => {
      if (!props.device || !selectedElectricalDeviceType.value) {
        message.warning("请选择设备类型");
        return false;
      }
      const config = Object.entries(electricalValues).reduce<Record<string, string>>((result, [key, value]) => {
        const normalizedValue = value.trim();
        if (normalizedValue && normalizedValue !== "/") {
          result[key] = normalizedValue;
        }
        return result;
      }, {});
      await saveDeviceConfig(props.facilityId, props.device!.deviceId, { deviceType: selectedElectricalDeviceType.value, config });
      message.success("设备业务配置已保存");
      return true;
    };

    const saveEnvironmentConfig = async (): Promise<boolean> => {
      if (!props.device) {
        return false;
      }
      if (environmentItems.value.some((item) => !item.propertyCode || !item.parameterTypeCode)) {
        message.warning("请完整选择每条参数映射");
        return false;
      }
      await saveEnvironmentDeviceParameterConfig(props.facilityId, props.device!.deviceId, { items: environmentItems.value });
      message.success("环境参数映射已保存");
      return true;
    };

    const handleSave = async (): Promise<void> => {
      saving.value = true;
      try {
        const saved = props.deviceKind === DeviceKind.ELECTRICAL ? await saveElectricalConfig() : await saveEnvironmentConfig();
        if (saved) {
          emit("saved");
          emit("close");
        }
      } catch {
        // 网关已提示错误，保留弹窗供用户重试。
      } finally {
        saving.value = false;
      }
    };

    return (): JSX.Element => (
      <Modal
        okText="确定"
        cancelText="取消"
        open={props.open}
        title={props.device ? `${props.device.deviceName ?? "设备"} · 编辑参数映射` : "编辑参数映射"}
        width={props.deviceKind === DeviceKind.ENVIRONMENT ? "860px" : "560px"}
        wrapClassName="electrical-viewport-modal"
        destroyOnClose
        confirmLoading={saving.value}
        okButtonProps={{ disabled: loading.value || !loaded.value || !props.device }}
        onCancel={() => emit("close")}
        onOk={() => void handleSave()}
      >
        {loading.value ? (
          <div class="empty-copy">配置加载中...</div>
        ) : props.deviceKind === DeviceKind.ELECTRICAL ? (
          <ElectricalParameterConfigForm
            typeConfigs={electricalTypeConfigs.value}
            selectedDeviceType={selectedElectricalDeviceType.value}
            values={electricalValues}
            onChangeDeviceType={changeElectricalDeviceType}
            onChangeValue={(parameterCode: string, value: string) => (electricalValues[parameterCode] = value)}
          />
        ) : (
          <EnvironmentParameterConfigForm
            availableProperties={environmentConfig.value?.availableProperties ?? []}
            parameterTypes={environmentConfig.value?.parameterTypes ?? []}
            items={environmentItems.value}
            onAdd={addEnvironmentItem}
            onRemove={(index: number) => (environmentItems.value = environmentItems.value.filter((_, itemIndex) => itemIndex !== index))}
            onUpdateItem={updateEnvironmentItem}
          />
        )}
      </Modal>
    );
  },
});
