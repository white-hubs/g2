import type { ElectricalDeviceParameter, ElectricalDeviceTypeParameterConfig } from "@g2-contract/electrical-safety";
import { Form, FormItem, Input, Select } from "@g2-platform/pc-ui";
import type { PropType } from "vue";
import { computed, defineComponent } from "vue";

const parameterOptions = (configs: ElectricalDeviceTypeParameterConfig[]) =>
  configs.map((item) => ({ label: item.deviceType, value: item.deviceType }));

export const ElectricalParameterConfigForm = defineComponent({
  name: "ElectricalParameterConfigForm",
  props: {
    typeConfigs: { type: Array as PropType<ElectricalDeviceTypeParameterConfig[]>, required: true },
    selectedDeviceType: { type: String, default: "" },
    values: { type: Object as PropType<Record<string, string>>, required: true },
  },
  emits: {
    changeDeviceType: (_deviceType: string): boolean => true,
    changeValue: (_parameterCode: string, _value: string): boolean => true,
  },
  setup: (props, { emit }) => {
    const selectedConfig = computed(() => props.typeConfigs.find((item) => item.deviceType === props.selectedDeviceType));
    const parameters = computed(() =>
      [...(selectedConfig.value?.parameters ?? [])].toSorted((left, right) => (left.sort ?? 0) - (right.sort ?? 0)),
    );

    const updateRatio = (parameter: ElectricalDeviceParameter, side: "primary" | "secondary", nextValue: string): void => {
      const [primary = "", secondary = ""] = (props.values[parameter.parameterCode] ?? "").split("/", 2);
      emit("changeValue", parameter.parameterCode, side === "primary" ? `${nextValue}/${secondary}` : `${primary}/${nextValue}`);
    };

    const renderParameter = (parameter: ElectricalDeviceParameter): JSX.Element => {
      const value = props.values[parameter.parameterCode] ?? "";
      if (parameter.controlType === "RATIO") {
        const [primary = "", secondary = ""] = value.split("/", 2);
        return (
          <FormItem key={parameter.parameterCode} label={parameter.parameterName}>
            <div class="electrical-ratio-input">
              <Input
                value={primary}
                placeholder="一次侧"
                onUpdate:value={(inputValue) => {
                  const nextValue = inputValue as string;
                  return updateRatio(parameter, "primary", nextValue);
                }}
              />
              <span>/</span>
              <Input
                value={secondary}
                placeholder="二次侧"
                onUpdate:value={(inputValue) => {
                  const nextValue = inputValue as string;
                  return updateRatio(parameter, "secondary", nextValue);
                }}
              />
            </div>
          </FormItem>
        );
      }

      if (parameter.controlType === "SELECT") {
        return (
          <FormItem key={parameter.parameterCode} label={parameter.parameterName}>
            <Select
              value={value || undefined}
              allowClear
              options={parameter.options.map((option) => ({ label: option, value: option }))}
              placeholder={parameter.helpText || `请选择${parameter.parameterName}`}
              onUpdate:value={(inputValue) => {
                const nextValue = inputValue as string | undefined;
                return emit("changeValue", parameter.parameterCode, nextValue ?? "");
              }}
            />
          </FormItem>
        );
      }

      return (
        <FormItem key={parameter.parameterCode} label={parameter.parameterName}>
          <Input
            value={value}
            placeholder={parameter.helpText || `请输入${parameter.parameterName}`}
            onUpdate:value={(inputValue) => {
              const nextValue = inputValue as string;
              return emit("changeValue", parameter.parameterCode, nextValue);
            }}
          />
        </FormItem>
      );
    };

    return (): JSX.Element => (
      <Form layout="vertical">
        <FormItem label="设备类型">
          <Select
            value={props.selectedDeviceType || undefined}
            options={parameterOptions(props.typeConfigs)}
            placeholder="请选择设备类型"
            onUpdate:value={(inputValue) => {
              const value = inputValue as string | undefined;
              return emit("changeDeviceType", value ?? "");
            }}
          />
        </FormItem>
        {props.selectedDeviceType ? (
          <div class="electrical-parameter-config-grid">{parameters.value.map(renderParameter)}</div>
        ) : (
          <div class="modal-tip">请选择设备类型后配置对应参数。</div>
        )}
      </Form>
    );
  },
});
