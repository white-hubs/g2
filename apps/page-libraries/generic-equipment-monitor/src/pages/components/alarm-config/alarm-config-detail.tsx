import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import { Button, Collapse, Empty, PageLayout, Space, Table, Tag } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, onMounted, ref } from "vue";

import { CONDITION_TYPE_OPTIONS, PERIOD_OPTIONS, alarmAssignNotifySceneCode, loadSceneNotificationOptions } from "./alarm-config.model";
import type { EmergencyRuleEditorState, RuleDataType, RuleGroupType, RuleTimeType } from "./types";

interface DetailAction {
  actionType?: unknown;
  enabled?: unknown;
  actionConfig?: unknown;
}

function text(value: unknown): string {
  return value === null || value === undefined || value === "" ? "--" : String(value);
}

function unitText(value: unknown, unit: unknown): string {
  const labels: Record<string, string> = { SECOND: "秒", MINUTE: "分钟", HOUR: "小时", DAY: "天" };
  return `${text(value)} ${labels[String(unit)] ?? text(unit)}`;
}

function optionLabel(options: readonly { value: string; label: string }[], value: unknown): string {
  return options.find((item) => item.value === value)?.label ?? text(value);
}

function timeText(time?: RuleTimeType): string {
  if (!time) {
    return "--";
  }
  if (time.timeType === "ALL") {
    return "全天";
  }
  let values: unknown = time.timeConditions;
  try {
    values = time.timeConditions ? JSON.parse(time.timeConditions) : time.timeList;
  } catch {
    values = time.timeList;
  }
  if (time.timeType === "TIME" && Array.isArray(values)) {
    return values
      .map((item) => {
        const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        return `${text(row.beginTime)} ~ ${text(row.endTime)}`;
      })
      .join("；");
  }
  const labels = time.timeType === "WEEK" ? ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] : undefined;
  const list = Array.isArray(values) ? values : [];
  return list.map((item) => (labels ? (labels[Number(item) - 1] ?? String(item)) : `${item}日`)).join("、") || "--";
}

function expressionText(condition: RuleDataType): string {
  const expression = condition.emergencyRuleConditionExps?.[0];
  if (!expression) {
    return "--";
  }
  const operators: Record<string, string> = { EQ: "等于", NE: "不等于", GT: "大于", GE: "大于等于", LT: "小于", LE: "小于等于" };
  const subject = expression.propName || expression.propCode || "属性";
  return `${subject} ${operators[String(expression.op)] ?? text(expression.op)} ${text(expression.oprand)}`;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function targetTypeLabel(value: unknown): string {
  return ({ DEPARTMENT: "部门", ROLE: "角色", USER: "用户" } as Record<string, string>)[String(value)] ?? text(value);
}

function targetName(value: unknown, targetType: unknown): string {
  const row = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  if (targetType === "DEPARTMENT") {
    return text(row.departmentName ?? row.name);
  }
  if (targetType === "ROLE") {
    return text(row.roleName ?? row.name);
  }
  return text(row.userName ?? row.name);
}

export default defineComponent({
  name: "GemAlarmConfigDetail",
  props: {
    title: { type: String, default: "报警规则-详情" },
    state: { type: Object as PropType<EmergencyRuleEditorState>, required: true },
    onBack: { type: Function as PropType<() => void>, required: true },
    applicationCode: { type: String, default: "" },
    getAlarmClient: { type: Function as PropType<() => Promise<AlarmCenterClient>>, default: undefined },
  },
  setup(props) {
    // `items` 在 MF JSX 场景会丢失 VNode；使用 Collapse.Panel 默认插槽，保留 antd 原生样式。
    const CollapsePanel = (Collapse as unknown as { Panel: any }).Panel;
    const section = (title: string, body: unknown) => (
      <CollapsePanel key={title} header={title}>
        {body}
      </CollapsePanel>
    );

    const basicCell = (label: string, value: unknown) => (
      <div style={{ display: "flex", minWidth: 0, lineHeight: "30px" }}>
        <span style={{ color: "#6b7280", flex: "0 0 auto" }}>{label}：</span>
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {typeof value === "string" ? value : value}
        </span>
      </div>
    );

    // 通知渠道由消息中心按「应用 + 报警指派」场景配置，不能直接渲染存储的渠道编码。
    const notificationOptions = ref<{ label: string; value: string }[]>([]);
    onMounted(() => {
      void (async () => {
        const applicationCode = props.applicationCode.trim();
        if (!applicationCode || !props.getAlarmClient) {
          return;
        }
        try {
          const client = await props.getAlarmClient();
          notificationOptions.value = await loadSceneNotificationOptions(
            () => client.getSatMsgChannels(),
            () => client.getSatMsgSceneReceive(alarmAssignNotifySceneCode(applicationCode)),
          );
        } catch {
          // 详情主体仍可正常展示；渠道编码会作为兜底文本显示。
          notificationOptions.value = [];
        }
      })();
    });
    const notificationChannelLabel = (channel: unknown): string => {
      const value = String(channel ?? "");
      return notificationOptions.value.find((item) => item.value === value)?.label ?? text(channel);
    };

    const renderRules = (groups: RuleGroupType[]) =>
      groups.length > 0 ? (
        <Space direction="vertical" size={12} style={{ display: "flex" }}>
          {groups.map((group, index) => (
            <div
              key={group.id || String(index)}
              style={{ border: "1px solid #e5e7eb", borderRadius: 4, padding: "18px 16px", background: "#fff" }}
            >
              <div style={{ fontWeight: 600, marginBottom: 16 }}>条件组 {index + 1}</div>
              {group.emergencyRuleConditions.map((condition, conditionIndex) => (
                <div key={condition.id || String(conditionIndex)} style={{ marginBottom: 14 }}>
                  <div style={{ marginBottom: 10, color: "#4b5563" }}>触发条件 {conditionIndex + 1}</div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                      gap: "10px 24px",
                      paddingBottom: 14,
                      borderBottom: "1px dashed #e5e7eb",
                    }}
                  >
                    {basicCell("设备品类", `${text(condition.deviceProdCategoryName)} / ${text(condition.deviceEventName)}`)}
                    {basicCell("产品名称", condition.deviceProdName)}
                    {basicCell("条件类型", optionLabel(CONDITION_TYPE_OPTIONS, condition.conditionType))}
                    {basicCell("条件表达式", <Tag>{expressionText(condition)}</Tag>)}
                  </div>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px 24px", paddingTop: 2 }}>
                {basicCell("时段类型", optionLabel(PERIOD_OPTIONS, group.emergencyRuleTime?.timeType))}
                {basicCell("报警时间", <Tag>{timeText(group.emergencyRuleTime)}</Tag>)}
              </div>
            </div>
          ))}
        </Space>
      ) : (
        <span style={{ color: "#999" }}>暂无报警规则</span>
      );

    return () => {
      const state = props.state;
      const actions = state.emergencyActions as unknown[];
      const dispose = state.emergencyActionBeforeList?.[0];
      return (
        <PageLayout
          title={props.title}
          v-slots={{
            "layout-content": () => (
              <div data-page="alarmConfigureDetail" class="alarm-container" style={{ padding: "12px 16px 0" }}>
                <Collapse defaultActiveKey={["基本信息", "报警规则", "报警设备"]}>
                  {section(
                    "基本信息",
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "8px 28px" }}>
                      {basicCell("事件名称", text(state.name))}
                      {basicCell("报警级别", text((state as unknown as Record<string, unknown>).alarmLevelName ?? state.alarmLevelId))}
                      {basicCell("去重周期", unitText(state.repeatTime, state.repeatTimeUnit))}
                      {basicCell(
                        "事件分类",
                        text((state as unknown as Record<string, unknown>).emergencyEventTypeName ?? state.emergencyEventTypeId),
                      )}
                      {basicCell("通知调度中心", (state as unknown as Record<string, unknown>).notifyCommandDispatch ? "是" : "否")}
                      {basicCell("处理时限", unitText(state.estimatedHandlerTime, state.estimatedHandlerUnit))}
                      {basicCell("说明", text(state.remark))}
                      {basicCell(
                        "是否播放声音",
                        <Tag color={state.turnWarningSound ? "green" : undefined}>{state.turnWarningSound ? "是" : "否"}</Tag>,
                      )}
                    </div>,
                  )}
                  {section("报警规则", renderRules(state.emergencyRuleConditionGroups))}
                  {section(
                    "报警设备",
                    <Table
                      size="small"
                      rowKey="deviceId"
                      dataSource={state.appointDevice ? state.emergencyRuleConditionDevices : []}
                      pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total: number) => `共 ${total} 条` }}
                      columns={[
                        { title: "序号", width: 70, customRender: ({ index }: { index: number }) => index + 1 },
                        { title: "设备名称", dataIndex: "deviceName" },
                        { title: "设备品类", dataIndex: "deviceProdCategoryName" },
                        { title: "产品名称", dataIndex: "deviceProdName" },
                        { title: "设备区域", dataIndex: "deviceAreaName" },
                        {
                          title: "是否启用",
                          customRender: ({ record }: { record: { enabled?: boolean } }) => (
                            <Tag color={record.enabled !== false ? "green" : undefined}>{record.enabled !== false ? "启用" : "禁用"}</Tag>
                          ),
                        },
                      ]}
                    />,
                  )}
                  {section(
                    "报警处置",
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "8px 24px" }}>
                      {basicCell("是否开启", dispose?.enabled ? <Tag color="green">开启</Tag> : <Tag>关闭</Tag>)}
                      {basicCell("研判时限", `${dispose?.actionBeforeConfig?.judgmentTimeoutSeconds ?? "--"} 秒`)}
                    </div>,
                  )}
                  {section(
                    "报警指派",
                    (() => {
                      const action = actions.find((item) => (item as DetailAction)?.actionType === "ALARM_NOTIFY_ACTION") as
                        | DetailAction
                        | undefined;
                      const config = (action?.actionConfig && typeof action.actionConfig === "object" ? action.actionConfig : {}) as Record<
                        string,
                        unknown
                      >;
                      const targets = asArray(config.targetModifyParams);
                      return action?.enabled ? (
                        <Space direction="vertical" size={10} style={{ display: "flex" }}>
                          {targets.map((item, index) => {
                            const rule = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
                            const kind = rule.messageTargetNotify;
                            return (
                              <div
                                key={String(rule.id ?? index)}
                                style={{ border: "1px solid #e5e7eb", borderRadius: 4, padding: "10px 16px" }}
                              >
                                <div style={{ fontWeight: 500, marginBottom: 8 }}>指派对象 {index + 1}</div>
                                <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(0, 3fr)", gap: 24 }}>
                                  {basicCell("对象类型", targetTypeLabel(kind))}
                                  {basicCell(
                                    "对象名称",
                                    <Space wrap>
                                      {asArray(rule.targetConfig).map((target, targetIndex) => (
                                        <Tag key={String(targetIndex)}>{targetName(target, kind)}</Tag>
                                      ))}
                                    </Space>,
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <div>{basicCell("仅指派给当班人员", config.dutyUser ? <Tag color="green">是</Tag> : <Tag>否</Tag>)}</div>
                          <div>
                            {basicCell(
                              "通知方式",
                              asArray(config.channelTypes).length > 0 ? (
                                <Space wrap>
                                  {asArray(config.channelTypes).map((channel, index) => (
                                    <Tag key={`${String(channel)}-${index}`}>{notificationChannelLabel(channel)}</Tag>
                                  ))}
                                </Space>
                              ) : (
                                "--"
                              ),
                            )}
                          </div>
                        </Space>
                      ) : (
                        <div style={{ minHeight: 148, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Empty description="未开启报警指派" />
                        </div>
                      );
                    })(),
                  )}
                  {section(
                    "消息抄送",
                    (() => {
                      const action = actions.find((item) => (item as DetailAction)?.actionType === "MESSAGE_NOTIFY_ACTION") as
                        | DetailAction
                        | undefined;
                      return action?.enabled ? (
                        <span>已开启消息抄送</span>
                      ) : (
                        <div style={{ minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Empty description="未开启消息抄送" />
                        </div>
                      );
                    })(),
                  )}
                  {section(
                    "设备联动",
                    (() => {
                      const action = actions.find((item) => (item as DetailAction)?.actionType === "IOT_DEVICE_ACTION") as
                        | DetailAction
                        | undefined;
                      return action?.enabled ? (
                        <span>已开启设备联动，共 {asArray(action.actionConfig).length} 项配置</span>
                      ) : (
                        <div style={{ minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Empty description="未开启设备联动" />
                        </div>
                      );
                    })(),
                  )}
                </Collapse>
              </div>
            ),
            "footer-btn": () => <Button onClick={props.onBack}>返回</Button>,
          }}
        />
      );
    };
  },
});
