import {
  Button,
  Col,
  Collapse,
  Form,
  FormItem,
  Input,
  InputNumber,
  PageLayout,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  message,
} from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, reactive, ref, type PropType } from "vue";

import { GEM_PAGE_KEYS } from "../page-keys";
import { alarmConfigEditorTitle, resolveAlarmConfigEditorMode } from "./alarm-configure-add.model";
import AlarmAssign from "./components/alarm-config/alarm-assign";
import AlarmConfigDetail from "./components/alarm-config/alarm-config-detail";
import {
  buildEmergencyRulePayload,
  emptyEmergencyRuleEditorState,
  findEmergencyAction,
  parseEmergencyRuleFromApi,
} from "./components/alarm-config/alarm-config.model";
import AlarmDevice from "./components/alarm-config/alarm-device";
import AlarmDispose from "./components/alarm-config/alarm-dispose";
import AlarmIot from "./components/alarm-config/alarm-iot";
import AlarmMessage from "./components/alarm-config/alarm-message";
import AlarmRule from "./components/alarm-config/alarm-rule";
import type {
  AlarmAssignValue,
  AlarmDeviceValue,
  AlarmIotValue,
  AlarmMessageValue,
  EmergencyActionBefore,
  EmergencyRuleEditorState,
  RuleGroupType,
} from "./components/alarm-config/types";
import type { GemPageProps } from "./page-props";

function unwrapRecord(raw: unknown): Record<string, unknown> {
  const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const data = root.data;
  return (data && typeof data === "object" ? data : root) as Record<string, unknown>;
}

const UNIT_OPTIONS = [
  { label: "分钟", value: "MINUTE" },
  { label: "小时", value: "HOUR" },
  { label: "天", value: "DAY" },
  { label: "秒", value: "SECOND" },
];

type SectionRef<T> = { getValue: () => T | Promise<T> };

export default defineComponent({
  name: "GemAlarmConfigureAdd",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getAlarmClient: { type: Function as PropType<GemPageProps["getAlarmClient"]>, required: true },
    getDeviceClient: { type: Function as PropType<GemPageProps["getDeviceClient"]> },
    getOuaaClient: { type: Function as PropType<GemPageProps["getOuaaClient"]> },
    applicationCode: { type: String, default: "" },
    ruleId: { type: String, default: "" },
    mode: { type: String, default: "" },
    copy: { type: String, default: "" },
    title: { type: String, default: "" },
  },
  setup(props) {
    const viewMode = computed(() => resolveAlarmConfigEditorMode({ mode: props.mode, copy: props.copy, ruleId: props.ruleId }));
    // 详情页沿用 ghcloud 的固定标题，避免宿主路由的“报警规则配置”覆盖详情语义。
    const pageTitle = computed(() =>
      viewMode.value === "detail" ? alarmConfigEditorTitle("detail") : props.title || alarmConfigEditorTitle(viewMode.value),
    );
    const readonly = computed(() => viewMode.value === "detail");
    const loading = ref(false);
    const saving = ref(false);
    const state = reactive<EmergencyRuleEditorState>(emptyEmergencyRuleEditorState());
    const levelOptions = ref<{ label: string; value: string }[]>([]);
    const showDispose = ref(true);
    const initStatus = ref(false);

    const ruleRef = ref<SectionRef<RuleGroupType[]> | null>(null);
    const deviceRef = ref<SectionRef<AlarmDeviceValue> | null>(null);
    const assignRef = ref<SectionRef<AlarmAssignValue> | null>(null);
    const messageRef = ref<SectionRef<AlarmMessageValue | Promise<AlarmMessageValue>> | null>(null);
    const iotRef = ref<SectionRef<AlarmIotValue> | null>(null);
    const disposeRef = ref<SectionRef<EmergencyActionBefore> | null>(null);

    const back = () => props.onNavigatePage({ page: GEM_PAGE_KEYS.alarmConfigList });

    const alarmAssignInfo = computed(() => findEmergencyAction<AlarmAssignValue>(state.emergencyActions, "ALARM_NOTIFY_ACTION"));
    const alarmMessageInfo = computed(() => findEmergencyAction<AlarmMessageValue>(state.emergencyActions, "MESSAGE_NOTIFY_ACTION"));
    const alarmIotInfo = computed(() => findEmergencyAction<AlarmIotValue>(state.emergencyActions, "IOT_DEVICE_ACTION"));

    async function loadLevels(): Promise<void> {
      try {
        const client = await props.getAlarmClient!();
        const raw = unwrapRecord(await client.getAlarmLevels({}));
        const list = (Array.isArray(raw) ? raw : raw.records || raw.list || raw.data || []) as unknown[];
        levelOptions.value = list
          .map((item) => {
            const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
            const value = String(row.id ?? row.value ?? "");
            const label = String(row.label ?? row.name ?? row.alarmLevelName ?? value);
            return value ? { label, value } : null;
          })
          .filter((item): item is { label: string; value: string } => !!item);
      } catch {
        levelOptions.value = [];
      }
    }

    async function loadRule(): Promise<void> {
      if (!props.ruleId || viewMode.value === "add") {
        Object.assign(state, emptyEmergencyRuleEditorState());
        showDispose.value = true;
        initStatus.value = true;
        return;
      }
      loading.value = true;
      try {
        const client = await props.getAlarmClient!();
        const parsed = parseEmergencyRuleFromApi(unwrapRecord(await client.getEmergencyRule(props.ruleId)), {
          copy: viewMode.value === "copy",
        });
        Object.assign(state, parsed);
        showDispose.value = !!parsed.emergencyActionBeforeList[0]?.enabled;
      } catch (e) {
        message.error(e instanceof Error ? e.message : "加载规则失败");
      } finally {
        loading.value = false;
        initStatus.value = true;
      }
    }

    async function save(): Promise<void> {
      const applicationCode = props.applicationCode.trim();
      if (!applicationCode) {
        message.error("applicationCode is required from host Domain config");
        return;
      }
      if (!state.name.trim()) {
        message.warning("请输入预警规则名称");
        return;
      }
      saving.value = true;
      try {
        const [ruleGroups, alarmDevice, alarmAssign, alarmMessage, alarmIot, alarmDispose] = await Promise.all([
          Promise.resolve(ruleRef.value?.getValue() ?? state.emergencyRuleConditionGroups),
          Promise.resolve(
            deviceRef.value?.getValue() ?? {
              enabled: state.appointDevice,
              emergencyRuleConditions: state.emergencyRuleConditionDevices,
            },
          ),
          Promise.resolve(assignRef.value?.getValue() ?? findEmergencyAction(state.emergencyActions, "ALARM_NOTIFY_ACTION")!),
          Promise.resolve(messageRef.value?.getValue() ?? findEmergencyAction(state.emergencyActions, "MESSAGE_NOTIFY_ACTION")!),
          Promise.resolve(iotRef.value?.getValue() ?? findEmergencyAction(state.emergencyActions, "IOT_DEVICE_ACTION")!),
          Promise.resolve(disposeRef.value?.getValue() ?? state.emergencyActionBeforeList[0]!),
        ]);
        const client = await props.getAlarmClient!();
        const payload = buildEmergencyRulePayload({
          applicationCode,
          basic: state,
          ruleGroups: ruleGroups as RuleGroupType[],
          alarmDevice: alarmDevice as AlarmDeviceValue,
          alarmAssign: alarmAssign as AlarmAssignValue,
          alarmMessage: alarmMessage as AlarmMessageValue,
          alarmIot: alarmIot as AlarmIotValue,
          alarmDispose: alarmDispose as EmergencyActionBefore,
        });
        if (state.id && viewMode.value === "edit") {
          await client.updateEmergencyRule(payload);
        } else {
          await client.createEmergencyRule({ ...payload, id: undefined });
        }
        message.success("操作成功！");
        back();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "保存失败");
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => {
      void (async () => {
        await loadRule();
        void loadLevels();
      })();
    });

    // `Collapse.items` 在 MF JSX 场景会丢失 VNode；使用 Panel 默认插槽保留原生布局与折叠行为。
    const CollapsePanel = (Collapse as unknown as { Panel: any }).Panel;
    const section = (key: string, title: string, body: unknown, extra?: unknown) => {
      return (
        <CollapsePanel
          key={key}
          header={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%" }}>
              <span>{title}</span>
              {extra ? (
                <span
                  style={{ display: "inline-flex", minHeight: 24, alignItems: "center", justifyContent: "flex-end" }}
                  onClick={(event: MouseEvent) => event.stopPropagation()}
                >
                  {extra}
                </span>
              ) : null}
            </div>
          }
        >
          <div data-panel={key} class="alarm-container" style={{ padding: "8px 12px 12px" }}>
            {body}
          </div>
        </CollapsePanel>
      );
    };

    const slots = {
      "layout-content": () => (
        <div data-page={GEM_PAGE_KEYS.alarmConfigureAdd} class="alarm-container" style={{ padding: "12px 0 0" }}>
          {loading.value || !initStatus.value ? (
            <div style={{ padding: 24 }}>
              <Spin />
            </div>
          ) : (
            <>
              <Collapse defaultActiveKey={["1", "2", "3", "4", "5", "6", "alarm-dispose"]}>
                {section(
                  "1",
                  "基本信息",
                  <Form labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
                    <Row gutter={[24, 0]}>
                      <Col span={6}>
                        <FormItem label="预警规则名称" required>
                          <Input
                            value={state.name}
                            disabled={readonly.value}
                            onUpdate:value={(v: string) => {
                              state.name = v;
                            }}
                          />
                        </FormItem>
                      </Col>
                      <Col span={6}>
                        <FormItem label="报警级别">
                          <Select
                            value={state.alarmLevelId}
                            disabled={readonly.value}
                            options={levelOptions.value}
                            allowClear
                            placeholder="请选择报警级别"
                            onUpdate:value={(v: string) => {
                              state.alarmLevelId = v;
                            }}
                          />
                        </FormItem>
                      </Col>
                      <Col span={6}>
                        <FormItem label="去重周期">
                          <div style={{ display: "flex", width: "100%" }}>
                            <InputNumber
                              min={0}
                              value={state.repeatTime}
                              disabled={readonly.value}
                              style={{ width: "calc(100% - 92px)" }}
                              onUpdate:value={(v: number | null) => {
                                state.repeatTime = Number(v ?? 0);
                              }}
                            />
                            <Select
                              value={state.repeatTimeUnit}
                              disabled={readonly.value}
                              options={UNIT_OPTIONS}
                              style={{ width: 92 }}
                              onUpdate:value={(v: string) => {
                                state.repeatTimeUnit = v;
                              }}
                            />
                          </div>
                        </FormItem>
                      </Col>
                      <Col span={6}>
                        <FormItem label="处理时限">
                          <div style={{ display: "flex", width: "100%" }}>
                            <InputNumber
                              min={0}
                              value={state.estimatedHandlerTime}
                              disabled={readonly.value}
                              style={{ width: "calc(100% - 92px)" }}
                              onUpdate:value={(v: number | null) => {
                                state.estimatedHandlerTime = Number(v ?? 0);
                              }}
                            />
                            <Select
                              value={state.estimatedHandlerUnit}
                              disabled={readonly.value}
                              options={UNIT_OPTIONS}
                              style={{ width: 92 }}
                              onUpdate:value={(v: string) => {
                                state.estimatedHandlerUnit = v;
                              }}
                            />
                          </div>
                        </FormItem>
                      </Col>
                      <Col span={6}>
                        <FormItem label="是否播放声音">
                          <Switch
                            checked={state.turnWarningSound}
                            disabled={readonly.value}
                            checkedChildren="是"
                            unCheckedChildren="否"
                            onUpdate:checked={(v: boolean) => {
                              state.turnWarningSound = v;
                            }}
                          />
                        </FormItem>
                      </Col>
                      <Col span={12}>
                        <FormItem label="说明" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                          <Input
                            value={state.remark}
                            disabled={readonly.value}
                            onUpdate:value={(v: string) => {
                              state.remark = v;
                            }}
                          />
                        </FormItem>
                      </Col>
                    </Row>
                  </Form>,
                )}
                {section(
                  "2",
                  "报警规则",
                  <AlarmRule
                    ref={ruleRef}
                    info={state.emergencyRuleConditionGroups}
                    readonly={readonly.value}
                    getDeviceClient={props.getDeviceClient}
                  />,
                  readonly.value ? null : (
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => (ruleRef.value as { addRuleGroup?: () => void } | null)?.addRuleGroup?.()}
                    >
                      添加条件组
                    </Button>
                  ),
                )}
                {section(
                  "3",
                  "指定设备",
                  <AlarmDevice
                    ref={deviceRef}
                    info={state.emergencyRuleConditionDevices}
                    enabled={state.appointDevice}
                    readonly={readonly.value}
                    applicationCode={props.applicationCode}
                    getDeviceClient={props.getDeviceClient}
                  />,
                  readonly.value ? null : (
                    <Space>
                      <Switch
                        checked={state.appointDevice}
                        checkedChildren="开启"
                        unCheckedChildren="关闭"
                        onUpdate:checked={(v: boolean) => {
                          state.appointDevice = v;
                        }}
                      />
                      <Button
                        type="primary"
                        size="small"
                        disabled={!state.appointDevice}
                        onClick={() => (deviceRef.value as { openModal?: () => void } | null)?.openModal?.()}
                      >
                        添加设备
                      </Button>
                      <Button
                        type="primary"
                        size="small"
                        danger
                        disabled={!state.appointDevice}
                        onClick={() => (deviceRef.value as { handleDelDevice?: () => void } | null)?.handleDelDevice?.()}
                      >
                        批量删除
                      </Button>
                    </Space>
                  ),
                )}
                {section(
                  "4",
                  "指派处理",
                  <AlarmAssign
                    ref={assignRef}
                    info={alarmAssignInfo.value}
                    applicationCode={props.applicationCode}
                    readonly={readonly.value}
                    getAlarmClient={props.getAlarmClient}
                    getOuaaClient={props.getOuaaClient}
                  />,
                  readonly.value ? null : (
                    <Button type="primary" size="small" onClick={() => (assignRef.value as { addRule?: () => void } | null)?.addRule?.()}>
                      添加
                    </Button>
                  ),
                )}
                {section(
                  "5",
                  "消息通知",
                  <AlarmMessage
                    ref={messageRef}
                    info={alarmMessageInfo.value}
                    applicationCode={props.applicationCode}
                    readonly={readonly.value}
                    getAlarmClient={props.getAlarmClient}
                    getOuaaClient={props.getOuaaClient}
                  />,
                  readonly.value ? null : (
                    <Switch
                      checked={alarmMessageInfo.value?.enabled}
                      checkedChildren="开启"
                      unCheckedChildren="关闭"
                      onUpdate:checked={(v: boolean) => {
                        (messageRef.value as { changeEnabled?: (enabled: boolean) => void } | null)?.changeEnabled?.(v);
                        const action = findEmergencyAction<AlarmMessageValue>(state.emergencyActions, "MESSAGE_NOTIFY_ACTION");
                        if (action) action.enabled = v;
                      }}
                    />
                  ),
                )}
                {section(
                  "6",
                  "物联联动",
                  <AlarmIot
                    ref={iotRef}
                    info={alarmIotInfo.value}
                    readonly={readonly.value}
                    applicationCode={props.applicationCode}
                    getDeviceClient={props.getDeviceClient}
                  />,
                  readonly.value ? null : (
                    <Space>
                      <Switch
                        checked={alarmIotInfo.value?.enabled}
                        checkedChildren="开启"
                        unCheckedChildren="关闭"
                        onUpdate:checked={(v: boolean) => {
                          (iotRef.value as { changeEnabled?: (enabled: boolean) => void } | null)?.changeEnabled?.(v);
                          const action = findEmergencyAction<AlarmIotValue>(state.emergencyActions, "IOT_DEVICE_ACTION");
                          if (action) action.enabled = v;
                        }}
                      />
                      {alarmIotInfo.value?.enabled ? (
                        <Button type="primary" size="small" onClick={() => (iotRef.value as { addRule?: () => void } | null)?.addRule?.()}>
                          添加
                        </Button>
                      ) : null}
                    </Space>
                  ),
                )}
                {showDispose.value || state.emergencyActionBeforeList[0]?.enabled
                  ? section(
                      "alarm-dispose",
                      "处置配置",
                      <AlarmDispose ref={disposeRef} info={state.emergencyActionBeforeList[0]} readonly={readonly.value} />,
                      readonly.value ? null : (
                        <Switch
                          checked={state.emergencyActionBeforeList[0]?.enabled}
                          checkedChildren="开启"
                          unCheckedChildren="关闭"
                          onUpdate:checked={(v: boolean) => {
                            showDispose.value = true;
                            (disposeRef.value as { changeEnabled?: (enabled: boolean) => void } | null)?.changeEnabled?.(v);
                            if (state.emergencyActionBeforeList[0]) {
                              state.emergencyActionBeforeList[0].enabled = v;
                            }
                          }}
                        />
                      ),
                    )
                  : null}
              </Collapse>
            </>
          )}
        </div>
      ),
      "footer-btn": () => (
        <>
          <Button onClick={back}>返回</Button>
          {readonly.value ? null : (
            <Button type="primary" loading={saving.value} onClick={() => void save()}>
              保存
            </Button>
          )}
        </>
      ),
    };

    return () =>
      readonly.value && initStatus.value ? (
        <AlarmConfigDetail
          title={pageTitle.value}
          state={state}
          applicationCode={props.applicationCode}
          getAlarmClient={props.getAlarmClient}
          onBack={back}
        />
      ) : (
        <PageLayout title={pageTitle.value} v-slots={slots} />
      );
  },
});
