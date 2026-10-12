import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import { Button, Col, Empty, FormItem, Input, Row, Select } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref, watch, type PropType } from "vue";

import {
  NOTIFY_TYPE_OPTIONS,
  alarmMessageNotifySceneCode,
  createGuid,
  defaultAlarmMessage,
  loadSceneNotificationOptions,
} from "./alarm-config.model";
import SelectNotice from "./select-notice";
import type { AlarmMessageValue, TargetModifyParams } from "./types";

type OuaaPickerClient = {
  listUsers: (params?: Record<string, unknown>) => Promise<unknown>;
  getRoles: () => Promise<unknown>;
  getOrganizations: (params?: Record<string, unknown>) => Promise<unknown>;
};

export default defineComponent({
  name: "GemAlarmMessage",
  props: {
    info: { type: Object as PropType<AlarmMessageValue>, default: undefined },
    applicationCode: { type: String, default: "" },
    readonly: { type: Boolean, default: false },
    getAlarmClient: { type: Function as PropType<() => Promise<AlarmCenterClient>>, default: undefined },
    getOuaaClient: { type: Function as PropType<() => Promise<OuaaPickerClient>>, default: undefined },
  },
  setup(props, { expose }) {
    const state = ref<AlarmMessageValue>(defaultAlarmMessage());
    const noticeOptions = ref<{ label: string; value: string }[]>([]);

    watch(
      () => props.info,
      (info) => {
        if (info) {
          state.value = JSON.parse(JSON.stringify(info)) as AlarmMessageValue;
        }
      },
      { immediate: true, deep: true },
    );

    async function loadNoticeOptions(): Promise<void> {
      const code = props.applicationCode.trim();
      if (!code || !props.getAlarmClient) {
        noticeOptions.value = [];
        return;
      }
      try {
        const client = await props.getAlarmClient();
        noticeOptions.value = await loadSceneNotificationOptions(
          () => client.getSatMsgChannels(),
          () => client.getSatMsgSceneReceive(alarmMessageNotifySceneCode(code)),
        );
      } catch {
        noticeOptions.value = [];
      }
    }

    onMounted(() => {
      void loadNoticeOptions();
    });

    watch(
      () => props.applicationCode,
      () => {
        void loadNoticeOptions();
      },
    );

    const getValue = (): AlarmMessageValue => state.value;

    const changeEnabled = (enabled: boolean): void => {
      state.value = { ...state.value, enabled };
    };

    const addRule = (): void => {
      state.value = {
        ...state.value,
        actionConfig: [
          ...state.value.actionConfig,
          {
            id: createGuid(),
            delayTimeUnit: "MINUTE",
            duration: 1,
            notifyType: null,
            channelTypes: [],
            targetModifyParams: [{ id: createGuid(), messageTargetNotify: "USER", targetConfig: [] }],
          },
        ],
      };
    };

    const removeRule = (id: string): void => {
      state.value = {
        ...state.value,
        actionConfig: state.value.actionConfig.filter((item) => item.id !== id),
      };
    };

    const updateConfig = (index: number, patch: Partial<AlarmMessageValue["actionConfig"][0]>): void => {
      const actionConfig = [...state.value.actionConfig];
      actionConfig[index] = { ...actionConfig[index], ...patch };
      state.value = { ...state.value, actionConfig };
    };

    const updateTarget = (mesIndex: number, targetIndex: number, value: TargetModifyParams): void => {
      const actionConfig = JSON.parse(JSON.stringify(state.value.actionConfig)) as AlarmMessageValue["actionConfig"];
      actionConfig[mesIndex].targetModifyParams[targetIndex] = value;
      state.value = { ...state.value, actionConfig };
    };

    const addTarget = (mesIndex: number): void => {
      const actionConfig = JSON.parse(JSON.stringify(state.value.actionConfig)) as AlarmMessageValue["actionConfig"];
      actionConfig[mesIndex].targetModifyParams.push({ id: createGuid(), messageTargetNotify: "USER", targetConfig: [] });
      state.value = { ...state.value, actionConfig };
    };

    const removeTarget = (mesIndex: number, id: string): void => {
      const actionConfig = JSON.parse(JSON.stringify(state.value.actionConfig)) as AlarmMessageValue["actionConfig"];
      actionConfig[mesIndex].targetModifyParams = actionConfig[mesIndex].targetModifyParams.filter((item) => item.id !== id);
      state.value = { ...state.value, actionConfig };
    };

    expose({ getValue, changeEnabled, addRule });

    return () => {
      if (!state.value.enabled) {
        return <Empty description="未开启消息抄送" />;
      }
      if (props.readonly) {
        return (
          <div>
            {state.value.actionConfig.map((item, index) => (
              <div key={item.id} style={{ marginBottom: 12, color: "#666" }}>
                消息抄送 {index + 1}：{NOTIFY_TYPE_OPTIONS.find((o) => o.value === item.notifyType)?.label || "-"}
              </div>
            ))}
          </div>
        );
      }
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Button type="primary" style={{ alignSelf: "flex-start" }} onClick={addRule}>
            添加
          </Button>
          {state.value.actionConfig.map((item, mesIndex) => (
            <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, border: "1px solid #e8e8e8", padding: "12px 16px", borderRadius: 6 }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>消息抄送 {mesIndex + 1}</div>
                <Row gutter={16}>
                  <Col span={8}>
                    <FormItem label="通知方式">
                      <Select
                        mode="multiple"
                        value={item.channelTypes}
                        options={noticeOptions.value}
                        placeholder="请选择"
                        onUpdate:value={(v: string[]) => updateConfig(mesIndex, { channelTypes: v })}
                      />
                    </FormItem>
                  </Col>
                  <Col span={8}>
                    <FormItem label="通知时间点">
                      <Select
                        value={item.notifyType ?? undefined}
                        options={[...NOTIFY_TYPE_OPTIONS]}
                        allowClear
                        placeholder="请选择"
                        onUpdate:value={(v: string) => updateConfig(mesIndex, { notifyType: v || null })}
                      />
                    </FormItem>
                  </Col>
                  {item.notifyType === "TIMEOUT_NOTIFY" && (
                    <Col span={6}>
                      <FormItem label="超时时长">
                        <Input
                          type="number"
                          value={String(item.duration)}
                          addonAfter="分钟"
                          onUpdate:value={(v: string) => updateConfig(mesIndex, { duration: Number(v || 1) })}
                        />
                      </FormItem>
                    </Col>
                  )}
                </Row>
                {item.targetModifyParams.map((target, targetIndex) => (
                  <div key={target.id} style={{ marginTop: 8 }}>
                    <FormItem label={`通知人员 ${targetIndex + 1}`}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <SelectNotice
                          info={target}
                          getOuaaClient={props.getOuaaClient}
                          onChange={(value: TargetModifyParams) => updateTarget(mesIndex, targetIndex, value)}
                        />
                        {targetIndex === 0 ? (
                          <Button type="primary" onClick={() => addTarget(mesIndex)}>
                            +
                          </Button>
                        ) : (
                          <Button danger onClick={() => removeTarget(mesIndex, target.id)}>
                            -
                          </Button>
                        )}
                      </div>
                    </FormItem>
                  </div>
                ))}
              </div>
              <Button type="link" danger style={{ marginTop: 4 }} onClick={() => removeRule(item.id)}>
                删除
              </Button>
            </div>
          ))}
        </div>
      );
    };
  },
});
