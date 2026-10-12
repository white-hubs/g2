import type { FirePointControlConfigParam, FirePointControlPropertyRecord, FirePointRecord } from "@g2-contract/fire-management";
import { computed, defineComponent, shallowRef } from "vue";

import { listFirePointControlPropertyOptions, saveFirePointControlConfig } from "@/api/server";
import { usePcModal } from "@/pc-ui-runtime";
import { Select, Spin, message } from "@/pc-ui-runtime";

import styles from "../fire-config-management.module.css";

interface CommandSelection {
  propertyCode: string;
  value: string;
}

interface SelectOption {
  label: string;
  value: string;
}

const stringifyValue = (value: unknown): string => String(value ?? "");
const optionLabel = (label: string | undefined, value: unknown): string => label?.trim() || stringifyValue(value);
const encodeSelection = (value: CommandSelection): string => JSON.stringify(value);

const parseSelection = <T,>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const buildSharedOptions = (properties: FirePointControlPropertyRecord[]): SelectOption[] =>
  properties.flatMap((property) =>
    (property.options || []).map((option) => ({
      label: optionLabel(option.label, option.value),
      value: encodeSelection({ propertyCode: property.propertyCode, value: stringifyValue(option.value) }),
    })),
  );

const findStoppedValue = (properties: FirePointControlPropertyRecord[], selection: CommandSelection): string | null => {
  const property = properties.find((item) => item.propertyCode === selection.propertyCode);
  const stoppedOption = property?.options?.find((option) => stringifyValue(option.value) !== selection.value);
  return stoppedOption ? stringifyValue(stoppedOption.value) : null;
};

export const PointControlConfigModal = defineComponent({
  name: "PointControlConfigModal",
  props: {
    hostId: { type: String, required: true },
    feedbackLabel: { type: String, default: "运行" },
  },
  emits: ["saved"],
  setup: (props, { emit, expose }) => {
    const currentPoint = shallowRef<FirePointRecord | null>(null);
    const properties = shallowRef<FirePointControlPropertyRecord[]>([]);
    const loading = shallowRef(false);
    const startSelection = shallowRef("");
    const stopSelection = shallowRef("");
    const statusSelection = shallowRef("");
    let requestVersion = 0;

    const sharedOptions = computed(() => buildSharedOptions(properties.value));

    const resetState = (): void => {
      requestVersion += 1;
      currentPoint.value = null;
      properties.value = [];
      startSelection.value = "";
      stopSelection.value = "";
      statusSelection.value = "";
      loading.value = false;
    };

    const [ControlConfigModal, modalApi] = usePcModal({
      title: "控制参数",
      width: "520px",
      centered: true,
      closeOnClickModal: false,
      onConfirm: async () => {
        const point = currentPoint.value;
        const start = parseSelection<CommandSelection>(startSelection.value);
        const stop = parseSelection<CommandSelection>(stopSelection.value);
        const status = parseSelection<CommandSelection>(statusSelection.value);
        if (!point || !start || !stop || !status) {
          message.warning("请选择完整的启动、停止和运行状态参数");
          return;
        }
        const stoppedValue = findStoppedValue(properties.value, status);
        if (stoppedValue === null) {
          message.warning("所选运行状态属性缺少停止状态值");
          return;
        }
        const payload: FirePointControlConfigParam = {
          startPropCode: start.propertyCode,
          startPropValue: start.value,
          stopPropCode: stop.propertyCode,
          stopPropValue: stop.value,
          runningPropCode: status.propertyCode,
          runningValue: status.value,
          stoppedValue,
        };
        modalApi.setConfirmLoading(true);
        try {
          await saveFirePointControlConfig(props.hostId, point.id, payload);
          message.success("控制参数已保存");
          emit("saved", point.id);
          modalApi.close();
        } catch (error) {
          message.error((error as Error).message || "保存控制参数失败");
        } finally {
          modalApi.setConfirmLoading(false);
        }
      },
      onClosed: resetState,
    });

    const openModal = async (point: FirePointRecord): Promise<void> => {
      resetState();
      const currentRequestVersion = requestVersion;
      currentPoint.value = point;
      loading.value = true;
      modalApi.setState({ title: `控制参数 — ${point.pointName || point.name || point.code || "消防点位"}` });
      modalApi.open();
      try {
        const records = await listFirePointControlPropertyOptions(props.hostId, point.id);
        if (currentRequestVersion !== requestVersion) return;
        properties.value = Array.isArray(records) ? records : [];
        if (properties.value.length === 0) message.warning("当前点位没有可配置的枚举属性");
      } catch (error) {
        if (currentRequestVersion === requestVersion) message.error((error as Error).message || "加载控制属性失败");
      } finally {
        if (currentRequestVersion === requestVersion) loading.value = false;
      }
    };

    expose({ openModal });

    const renderSelect = (value: string, options: SelectOption[], placeholder: string, onChange: (nextValue: string) => void) => (
      <Select
        value={value || undefined}
        options={options}
        placeholder={placeholder}
        showSearch
        optionFilterProp="label"
        style={{ width: "100%" }}
        onUpdate:value={(nextValue: unknown) => onChange(String(nextValue ?? ""))}
      />
    );

    return () => (
      <ControlConfigModal
        v-slots={{
          default: () => (
            <Spin spinning={loading.value}>
              <div class={styles["control-config-form"]}>
                <label class={styles["control-config-field"]}>
                  <span>启动参数</span>
                  {renderSelect(startSelection.value, sharedOptions.value, "请选择启动参数", (value) => {
                    startSelection.value = value;
                  })}
                </label>
                <label class={styles["control-config-field"]}>
                  <span>停止参数</span>
                  {renderSelect(stopSelection.value, sharedOptions.value, "请选择停止参数", (value) => {
                    stopSelection.value = value;
                  })}
                </label>
                <label class={styles["control-config-field"]}>
                  <span>{props.feedbackLabel.trim() || "运行"}参数</span>
                  {renderSelect(
                    statusSelection.value,
                    sharedOptions.value,
                    `请选择${props.feedbackLabel.trim() || "运行"}参数`,
                    (value) => {
                      statusSelection.value = value;
                    },
                  )}
                </label>
              </div>
            </Spin>
          ),
        }}
      />
    );
  },
});
