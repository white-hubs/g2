import type { DeviceCenterClient } from "@g2-client/device-center/client";
import { Button, Cascader, FormItem, Input, Select, Space } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref, watch, type PropType } from "vue";

import {
  COMPARATOR_OPTIONS,
  CONDITION_TYPE_OPTIONS,
  DEVICE_EVENT_ALARM_TYPE_OPTIONS,
  EVENT_CONFIG_TYPE_OPTIONS,
  createGuid,
  unwrapApiList,
} from "./alarm-config.model";
import type { EmergencyRuleConditionExpsType, RuleDataType } from "./types";

function emptyExp(): EmergencyRuleConditionExpsType {
  return {
    id: createGuid(),
    propCode: "",
    op: null,
    oprand: "",
    delayTime: 0,
    propName: "",
    propUnit: "",
    emergencyRuleConditionId: "",
    emergencyRuleId: "",
    startDelayTime: 0,
    endDelayTime: 0,
  };
}

function asTreeOptions(raw: unknown): Record<string, unknown>[] {
  return unwrapApiList(raw).map((item) => {
    const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const children = Array.isArray(row.children) ? asTreeOptions(row.children) : undefined;
    return {
      ...row,
      categoryName: row.categoryName ?? row.name ?? row.label,
      categoryCode: row.categoryCode ?? row.code ?? row.value,
      children,
    };
  });
}

export default defineComponent({
  name: "GemAlarmRuleAttr",
  props: {
    value: { type: Object as PropType<RuleDataType>, required: true },
    readonly: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    getDeviceClient: { type: Function as PropType<() => Promise<DeviceCenterClient>>, default: undefined },
  },
  emits: {
    "update:value": (_v: RuleDataType) => true,
    delete: () => true,
  },
  setup(props, { emit }) {
    const categoryTree = ref<Record<string, unknown>[]>([]);
    const productOptions = ref<{ label: string; value: string }[]>([]);
    const propOptions = ref<{ label: string; value: string }[]>([]);
    const eventOptions = ref<
      { label: string; value: string; eventConfig?: Record<string, unknown>; eventName?: string; eventCode?: string }[]
    >([]);
    const triggerType = ref("");

    const patch = (partial: Partial<RuleDataType>) => {
      emit("update:value", { ...props.value, ...partial });
    };

    const patchExp = (index: number, partial: Partial<EmergencyRuleConditionExpsType>) => {
      const next = props.value.emergencyRuleConditionExps.map((exp, i) => (i === index ? { ...exp, ...partial } : exp));
      patch({ emergencyRuleConditionExps: next });
    };

    async function loadCategoryTree(): Promise<void> {
      if (!props.getDeviceClient) return;
      try {
        const client = await props.getDeviceClient();
        categoryTree.value = asTreeOptions(await client.getIotProductCategoryTree());
      } catch {
        categoryTree.value = [];
      }
    }

    async function loadProducts(categoryCodeConcat: string): Promise<void> {
      if (!props.getDeviceClient || !categoryCodeConcat) {
        productOptions.value = [];
        return;
      }
      const leaf = categoryCodeConcat.split("-").filter(Boolean).pop() || "";
      if (!leaf) return;
      try {
        const client = await props.getDeviceClient();
        const list = unwrapApiList(await client.getProductModelByCategory(leaf));
        productOptions.value = list
          .map((item) => {
            const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
            const value = String(row.id ?? "");
            const label = String(row.name ?? row.prodName ?? value);
            return value ? { label, value } : null;
          })
          .filter((x): x is { label: string; value: string } => !!x);
      } catch {
        productOptions.value = [];
      }
    }

    async function loadCondition(prodId: string): Promise<void> {
      if (!props.getDeviceClient || !prodId) {
        propOptions.value = [];
        eventOptions.value = [];
        return;
      }
      try {
        const client = await props.getDeviceClient();
        const list = unwrapApiList(await client.getDeviceCondition({ prodIds: prodId, withPropertySpec: true }));
        const first = (list[0] && typeof list[0] === "object" ? list[0] : {}) as Record<string, unknown>;
        const propsList = unwrapApiList(first.productPropVoList ?? first.propList);
        const events = unwrapApiList(first.productEventVoList ?? first.eventList);
        propOptions.value = propsList
          .map((item) => {
            const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
            const value = String(row.propCode ?? row.code ?? "");
            const label = String(row.propName ?? row.name ?? value);
            return value ? { label, value } : null;
          })
          .filter((x): x is { label: string; value: string } => !!x);
        eventOptions.value = events
          .map((item) => {
            const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
            const value = String(row.eventCode ?? row.code ?? "");
            const label = String(row.eventName ?? row.name ?? value);
            return value
              ? {
                  label,
                  value,
                  eventCode: value,
                  eventName: label,
                  eventConfig: (row.eventConfig as Record<string, unknown>) || {},
                }
              : null;
          })
          .filter((x): x is NonNullable<typeof x> => !!x);
        if (props.value.deviceEventCode) {
          const selected = eventOptions.value.find((e) => e.value === props.value.deviceEventCode);
          triggerType.value = String((selected?.eventConfig as { triggerType?: string } | undefined)?.triggerType || "");
        }
      } catch {
        propOptions.value = [];
        eventOptions.value = [];
      }
    }

    onMounted(() => {
      void loadCategoryTree();
      if (props.value.deviceProdCategoryCodeConcat) void loadProducts(props.value.deviceProdCategoryCodeConcat);
      if (props.value.deviceProdId) void loadCondition(props.value.deviceProdId);
    });

    watch(
      () => props.value.deviceProdCategoryCodeConcat,
      (v) => {
        if (v) void loadProducts(v);
      },
    );
    watch(
      () => props.value.deviceProdId,
      (v) => {
        if (v) void loadCondition(String(v));
      },
    );

    const categoryValue = () =>
      props.value.deviceProdCategoryCodeConcat ? props.value.deviceProdCategoryCodeConcat.split("-").filter(Boolean) : [];

    const renderCustomExps = () =>
      props.value.emergencyRuleConditionExps.map((exp, index) => (
        <Space key={exp.id || String(index)} wrap style={{ marginBottom: 8 }}>
          <Select
            style={{ width: 180 }}
            disabled={props.readonly}
            placeholder="请选择设备属性"
            options={propOptions.value}
            value={exp.propCode || undefined}
            onUpdate:value={(v: string) => {
              const label = propOptions.value.find((o) => o.value === v)?.label || "";
              patchExp(index, { propCode: v, propName: label });
            }}
          />
          <Select
            style={{ width: 100 }}
            disabled={props.readonly}
            placeholder="比较"
            options={[...COMPARATOR_OPTIONS]}
            value={exp.op || undefined}
            onUpdate:value={(v: string) => patchExp(index, { op: v })}
          />
          <Input
            style={{ width: 140 }}
            disabled={props.readonly}
            placeholder="属性值"
            value={exp.oprand}
            onUpdate:value={(v: string) => patchExp(index, { oprand: v })}
          />
          <Input
            style={{ width: 100 }}
            type="number"
            disabled={props.readonly}
            placeholder="时延秒"
            value={String(exp.delayTime ?? 0)}
            onUpdate:value={(v: string) => patchExp(index, { delayTime: Number(v || 0) })}
          />
          {props.readonly ? null : index === 0 ? (
            <Button
              type="link"
              onClick={() => patch({ emergencyRuleConditionExps: [...props.value.emergencyRuleConditionExps, emptyExp()] })}
            >
              添加
            </Button>
          ) : (
            <Button
              type="link"
              danger
              onClick={() =>
                patch({
                  emergencyRuleConditionExps: props.value.emergencyRuleConditionExps.filter((e) => e.id !== exp.id),
                })
              }
            >
              删除
            </Button>
          )}
        </Space>
      ));

    const renderEventExps = () => {
      const eventConfigType = props.value.eventConfigType || "THRESHOLD_SETTING";
      return (
        <div style={{ display: "grid", gap: 8 }}>
          <Space wrap>
            <Select
              style={{ width: 200 }}
              disabled={props.readonly}
              placeholder="请选择设备事件"
              options={eventOptions.value}
              value={props.value.deviceEventCode || undefined}
              onUpdate:value={(v: string) => {
                const selected = eventOptions.value.find((e) => e.value === v);
                triggerType.value = String((selected?.eventConfig as { triggerType?: string } | undefined)?.triggerType || "");
                patch({
                  deviceEventCode: v,
                  deviceEventName: selected?.label || "",
                  deviceEventType: triggerType.value,
                  eventConfigType: "THRESHOLD_SETTING",
                  emergencyRuleConditionExps: [{ ...emptyExp(), propCode: "@dev_event_delay@" }],
                });
              }}
            />
            {triggerType.value === "NATURE" ? (
              <Select
                style={{ width: 140 }}
                disabled={props.readonly}
                options={[...EVENT_CONFIG_TYPE_OPTIONS]}
                value={eventConfigType}
                onUpdate:value={(v: "THRESHOLD_SETTING" | "PARAMETER_SETTING") => {
                  patch({
                    eventConfigType: v,
                    emergencyRuleConditionExps: [v === "THRESHOLD_SETTING" ? { ...emptyExp(), propCode: "@dev_event_delay@" } : emptyExp()],
                  });
                }}
              />
            ) : null}
          </Space>
          {eventConfigType === "THRESHOLD_SETTING"
            ? props.value.emergencyRuleConditionExps.map((exp, index) => (
                <Space key={exp.id || String(index)} wrap>
                  <Select
                    style={{ width: 160 }}
                    disabled={props.readonly}
                    options={[...DEVICE_EVENT_ALARM_TYPE_OPTIONS]}
                    value={exp.propCode || undefined}
                    onUpdate:value={(v: string) => patchExp(index, { propCode: v })}
                  />
                  <Input
                    style={{ width: 140 }}
                    type="number"
                    disabled={props.readonly}
                    placeholder="秒"
                    value={exp.oprand}
                    onUpdate:value={(v: string) => patchExp(index, { oprand: v })}
                  />
                  {props.readonly ? null : index === 0 ? (
                    <Button
                      type="link"
                      onClick={() => patch({ emergencyRuleConditionExps: [...props.value.emergencyRuleConditionExps, emptyExp()] })}
                    >
                      添加
                    </Button>
                  ) : (
                    <Button
                      type="link"
                      danger
                      onClick={() =>
                        patch({
                          emergencyRuleConditionExps: props.value.emergencyRuleConditionExps.filter((e) => e.id !== exp.id),
                        })
                      }
                    >
                      删除
                    </Button>
                  )}
                </Space>
              ))
            : props.value.emergencyRuleConditionExps.map((exp, index) => (
                <Space key={exp.id || String(index)} wrap>
                  <Input
                    style={{ width: 160 }}
                    disabled={props.readonly}
                    placeholder="参数编码"
                    value={exp.propCode || ""}
                    onUpdate:value={(v: string) => patchExp(index, { propCode: v })}
                  />
                  <Select
                    style={{ width: 100 }}
                    disabled={props.readonly}
                    options={[...COMPARATOR_OPTIONS]}
                    value={exp.op || undefined}
                    onUpdate:value={(v: string) => patchExp(index, { op: v })}
                  />
                  <Input
                    style={{ width: 140 }}
                    disabled={props.readonly}
                    placeholder="参数值"
                    value={exp.oprand}
                    onUpdate:value={(v: string) => patchExp(index, { oprand: v })}
                  />
                </Space>
              ))}
        </div>
      );
    };

    return () => (
      <div class="alarm-rule-attr" style={{ marginBottom: 12, paddingBottom: 8, borderBottom: "1px dashed #f0f0f0" }}>
        <FormItem label="报警规则">
          <Space wrap align="start">
            <Cascader
              style={{ width: 220 }}
              disabled={props.readonly}
              options={categoryTree.value as never[]}
              fieldNames={{ label: "categoryName", value: "categoryCode", children: "children" }}
              value={categoryValue()}
              changeOnSelect
              placeholder="请选择产品品类"
              onUpdate:value={(v: string[]) => {
                const codes = Array.isArray(v) ? v.map(String) : [];
                const concat = codes.join("-");
                patch({
                  deviceProdCategoryCodeConcat: concat,
                  deviceProdId: undefined,
                  deviceProdName: "",
                  deviceEventCode: undefined,
                  emergencyRuleConditionExps: [emptyExp()],
                });
                void loadProducts(concat);
              }}
            />
            <Select
              style={{ width: 180 }}
              disabled={props.readonly}
              placeholder="请选择产品名称"
              options={productOptions.value}
              value={props.value.deviceProdId || undefined}
              onUpdate:value={(v: string) => {
                const label = productOptions.value.find((o) => o.value === v)?.label || "";
                patch({
                  deviceProdId: v,
                  deviceProdName: label,
                  deviceEventCode: undefined,
                  emergencyRuleConditionExps: [emptyExp()],
                });
                void loadCondition(v);
              }}
            />
            <Select
              style={{ width: 160 }}
              disabled={props.readonly}
              placeholder="请选择条件类型"
              options={[...CONDITION_TYPE_OPTIONS]}
              value={props.value.conditionType || undefined}
              onUpdate:value={(v: string) =>
                patch({
                  conditionType: v || null,
                  emergencyRuleConditionExps: [emptyExp()],
                  deviceEventCode: undefined,
                })
              }
            />
            {props.canDelete && !props.readonly ? (
              <Button type="link" danger onClick={() => emit("delete")}>
                删除规则
              </Button>
            ) : null}
          </Space>
        </FormItem>
        {props.value.conditionType === "CUSTOM_RULE_CONDITION" ? renderCustomExps() : null}
        {props.value.conditionType === "DEVICE_EVENT_CONDITION" ? renderEventExps() : null}
      </div>
    );
  },
});
