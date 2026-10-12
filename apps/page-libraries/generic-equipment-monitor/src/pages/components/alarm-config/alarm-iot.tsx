import type { DeviceCenterClient } from "@g2-client/device-center/client";
import { Empty } from "@g2-platform/pc-ui";
import { defineComponent, ref, watch, type PropType } from "vue";

import { EXECUTE_MODE_OPTIONS, createGuid, defaultAlarmIot } from "./alarm-config.model";
import AlarmIotRule from "./alarm-iot-rule";
import type { AlarmIotType, AlarmIotValue } from "./types";

export default defineComponent({
  name: "GemAlarmIot",
  props: {
    info: { type: Object as PropType<AlarmIotValue>, default: undefined },
    readonly: { type: Boolean, default: false },
    applicationCode: { type: String, default: "" },
    getDeviceClient: { type: Function as PropType<() => Promise<DeviceCenterClient>>, default: undefined },
  },
  setup(props, { expose }) {
    const state = ref<AlarmIotValue>(defaultAlarmIot());

    watch(
      () => props.info,
      (info) => {
        if (info) {
          state.value = JSON.parse(JSON.stringify(info)) as AlarmIotValue;
        }
      },
      { immediate: true, deep: true },
    );

    const getValue = (): AlarmIotValue => state.value;
    const changeEnabled = (enabled: boolean): void => {
      state.value = { ...state.value, enabled };
    };

    const addRule = (): void => {
      state.value = {
        ...state.value,
        actionConfig: [
          ...state.value.actionConfig,
          {
            uuid: createGuid(),
            code: "",
            executeMode: "AUTOMATIC",
            deviceProdCategoryCode: "",
            id: "",
            deviceProdId: null,
            name: "",
            propCode: null,
            propName: "",
            propValue: "",
            genreId: "",
            modelId: null,
          },
        ],
      };
    };

    const updateRule = (index: number, value: AlarmIotType): void => {
      const actionConfig = [...state.value.actionConfig];
      actionConfig[index] = value;
      state.value = { ...state.value, actionConfig };
    };

    const removeRule = (uuid: string): void => {
      state.value = {
        ...state.value,
        actionConfig: state.value.actionConfig.filter((item) => (item.uuid || item.id) !== uuid),
      };
    };

    expose({ getValue, changeEnabled, addRule });

    return () => {
      if (!state.value.enabled) {
        return <Empty description="未开启设备联动" />;
      }
      if (props.readonly) {
        return (
          <div>
            {state.value.actionConfig.map((item, index) => (
              <div
                key={item.uuid || item.id || index}
                style={{ marginBottom: 12, padding: 12, border: "1px solid #e8e8e8", borderRadius: 4 }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>联动设备 {index + 1}</div>
                <div style={{ color: "#666" }}>
                  产品品类：{item.deviceProdCategoryCode || "-"}；设备产品：{item.deviceProdId || "-"}；设备名称：
                  {item.name || "-"}；设备指令：{item.propName || item.propCode || "-"}；设定值：{item.propValue || "-"}；执行方式：
                  {EXECUTE_MODE_OPTIONS.find((o) => o.value === item.executeMode)?.label || item.executeMode}
                </div>
              </div>
            ))}
          </div>
        );
      }
      return (
        <div>
          {state.value.actionConfig.map((item, index) => (
            <AlarmIotRule
              key={item.uuid || item.id || index}
              value={item}
              readonly={props.readonly}
              applicationCode={props.applicationCode}
              getDeviceClient={props.getDeviceClient}
              onUpdate:value={(v: AlarmIotType) => updateRule(index, v)}
              onDelete={() => removeRule(item.uuid || item.id)}
            />
          ))}
        </div>
      );
    };
  },
});
