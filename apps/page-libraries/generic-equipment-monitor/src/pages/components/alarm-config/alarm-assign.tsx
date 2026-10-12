import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import { Button, Checkbox, Col, FormItem, Row, Select } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref, watch, type PropType } from "vue";

import {
  MESSAGE_TARGET_OPTIONS,
  alarmAssignNotifySceneCode,
  createGuid,
  defaultAlarmAssign,
  hasAttendanceApplication,
  loadSceneNotificationOptions,
} from "./alarm-config.model";
import SelectNotice from "./select-notice";
import type { AlarmAssignValue, TargetModifyParams } from "./types";

type OuaaPickerClient = Pick<OuaaClient, "listUsers" | "getRoles" | "getOrganizations" | "getTerminalApplicationGroups">;

function targetTagNames(item: TargetModifyParams): string[] {
  return item.targetConfig
    .map((row) => {
      if (item.messageTargetNotify === "USER") return row.userName || row.userId;
      if (item.messageTargetNotify === "DEPARTMENT") return row.departmentName || row.departmentId;
      return row.roleName || row.roleId;
    })
    .filter((name): name is string => !!name)
    .map(String);
}

export default defineComponent({
  name: "GemAlarmAssign",
  props: {
    info: { type: Object as PropType<AlarmAssignValue>, default: undefined },
    applicationCode: { type: String, default: "" },
    readonly: { type: Boolean, default: false },
    getAlarmClient: { type: Function as PropType<() => Promise<AlarmCenterClient>>, default: undefined },
    getOuaaClient: { type: Function as PropType<() => Promise<OuaaPickerClient>>, default: undefined },
  },
  setup(props, { expose }) {
    const state = ref<AlarmAssignValue>(defaultAlarmAssign());
    const noticeOptions = ref<{ label: string; value: string }[]>([]);
    const hasAttendance = ref(false);

    watch(
      () => props.info,
      (info) => {
        if (info) {
          state.value = JSON.parse(JSON.stringify(info)) as AlarmAssignValue;
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
          () => client.getSatMsgSceneReceive(alarmAssignNotifySceneCode(code)),
        );
      } catch {
        noticeOptions.value = [];
      }
    }

    async function loadAttendanceFlag(): Promise<void> {
      if (!props.getOuaaClient) {
        hasAttendance.value = false;
        return;
      }
      try {
        const client = await props.getOuaaClient();
        if (!client.getTerminalApplicationGroups) {
          hasAttendance.value = false;
          return;
        }
        hasAttendance.value = hasAttendanceApplication(await client.getTerminalApplicationGroups());
      } catch {
        hasAttendance.value = false;
      }
    }

    onMounted(() => {
      void loadNoticeOptions();
      void loadAttendanceFlag();
    });

    watch(
      () => props.applicationCode,
      () => {
        void loadNoticeOptions();
      },
    );

    const getValue = (): AlarmAssignValue => state.value;

    const addRule = (): void => {
      state.value = {
        ...state.value,
        actionConfig: {
          ...state.value.actionConfig,
          targetModifyParams: [
            ...state.value.actionConfig.targetModifyParams,
            { id: createGuid(), messageTargetNotify: "USER", targetConfig: [] },
          ],
        },
      };
    };

    const updateTarget = (index: number, value: TargetModifyParams): void => {
      const params = [...state.value.actionConfig.targetModifyParams];
      params[index] = value;
      state.value = { ...state.value, actionConfig: { ...state.value.actionConfig, targetModifyParams: params } };
    };

    const removeTarget = (id: string): void => {
      state.value = {
        ...state.value,
        actionConfig: {
          ...state.value.actionConfig,
          targetModifyParams: state.value.actionConfig.targetModifyParams.filter((item) => item.id !== id),
        },
      };
    };

    expose({ getValue, addRule });

    return () =>
      props.readonly ? (
        <div>
          {state.value.actionConfig.targetModifyParams.map((item, index) => (
            <div key={item.id} style={{ marginBottom: 12, padding: 12, border: "1px solid #e8e8e8", borderRadius: 4 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>指派对象 {index + 1}</div>
              <div style={{ color: "#666" }}>
                对象类型：{MESSAGE_TARGET_OPTIONS.find((o) => o.value === item.messageTargetNotify)?.label || "-"}
              </div>
              <div style={{ color: "#666" }}>对象名称：{targetTagNames(item).join("、") || "-"}</div>
            </div>
          ))}
          {hasAttendance.value ? (
            <div style={{ color: "#666", marginBottom: 8 }}>仅指派给当班人员：{state.value.actionConfig.dutyUser ? "是" : "否"}</div>
          ) : null}
          <div style={{ color: "#666" }}>
            通知方式：
            {state.value.actionConfig.channelTypes.length
              ? state.value.actionConfig.channelTypes
                  .map((code) => noticeOptions.value.find((opt) => opt.value === code)?.label || code)
                  .join("、")
              : "按消息中心默认"}
          </div>
        </div>
      ) : (
        <div>
          {state.value.actionConfig.targetModifyParams.map((item, index) => (
            <div key={item.id} style={{ marginTop: index ? 16 : 0, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <SelectNotice
                info={item}
                getOuaaClient={props.getOuaaClient}
                onChange={(value: TargetModifyParams) => updateTarget(index, value)}
              />
              {index > 0 ? (
                <Button type="link" danger onClick={() => removeTarget(item.id)}>
                  删除
                </Button>
              ) : null}
            </div>
          ))}
          {hasAttendance.value ? (
            <FormItem style={{ marginTop: 12 }}>
              <Checkbox
                checked={state.value.actionConfig.dutyUser}
                onUpdate:checked={(v: boolean) => {
                  state.value = {
                    ...state.value,
                    actionConfig: { ...state.value.actionConfig, dutyUser: v },
                  };
                }}
              >
                是否仅指派给当班人员
              </Checkbox>
            </FormItem>
          ) : null}
          <Row gutter={16}>
            <Col span={8}>
              <FormItem label="通知方式">
                <Select
                  mode="multiple"
                  value={state.value.actionConfig.channelTypes}
                  options={noticeOptions.value}
                  placeholder="未设置则按照消息中心配置进行通知"
                  onUpdate:value={(v: string[]) => {
                    state.value = {
                      ...state.value,
                      actionConfig: { ...state.value.actionConfig, channelTypes: v },
                    };
                  }}
                />
              </FormItem>
            </Col>
          </Row>
        </div>
      );
  },
});
