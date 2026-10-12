import { Form, FormItem, Input } from "@g2-platform/pc-ui";
import { defineComponent, ref, watch, type PropType } from "vue";

import { JUDGMENT_TIMEOUT_DEFAULT, defaultAlarmDispose } from "./alarm-config.model";
import type { EmergencyActionBefore } from "./types";

export default defineComponent({
  name: "GemAlarmDispose",
  props: {
    info: { type: Object as PropType<EmergencyActionBefore>, default: undefined },
    readonly: { type: Boolean, default: false },
  },
  setup(props, { expose }) {
    const state = ref<EmergencyActionBefore>(defaultAlarmDispose());

    watch(
      () => props.info,
      (info) => {
        if (info) {
          state.value = JSON.parse(JSON.stringify(info)) as EmergencyActionBefore;
        }
      },
      { immediate: true, deep: true },
    );

    const getValue = (): EmergencyActionBefore => state.value;

    const changeEnabled = (enabled: boolean): void => {
      state.value = { ...state.value, enabled };
    };

    expose({ getValue, changeEnabled });

    return () =>
      props.readonly ? (
        <div style={{ color: "#666" }}>
          <div>报警处置：{state.value.enabled ? "开启" : "关闭"}</div>
          <div>研判时限：{state.value.actionBeforeConfig.judgmentTimeoutSeconds} 秒</div>
        </div>
      ) : (
        <Form layout="vertical" style={{ maxWidth: 520 }}>
          <FormItem label="研判时限（秒）">
            <Input
              type="number"
              value={String(state.value.actionBeforeConfig.judgmentTimeoutSeconds)}
              addonAfter="秒"
              onUpdate:value={(v: string) => {
                const next = Number(v || JUDGMENT_TIMEOUT_DEFAULT);
                state.value = {
                  ...state.value,
                  actionBeforeConfig: {
                    ...state.value.actionBeforeConfig,
                    judgmentTimeoutSeconds: next > 0 ? next : JUDGMENT_TIMEOUT_DEFAULT,
                  },
                };
              }}
            />
          </FormItem>
        </Form>
      );
  },
});
