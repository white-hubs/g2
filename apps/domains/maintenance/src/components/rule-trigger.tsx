import type { MaintenanceRuleCondition, MaintenanceRuleConditionExp } from "@g2-client/maintenance/client";
import { Button, Cascader, Input, InputNumber, Select, message } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref, type PropType } from "vue";

import { getDeviceCenterClient } from "@/domain-context";
import { ATTRIBUTE_TYPE_OPTIONS, COMPARATOR_OPTIONS } from "@/utils/enum";
import { toNumber, toText, toTextArray } from "@/utils/form-value";
import { guid } from "@/utils/guid";
import { PRODUCT_CATEGORY_FIELD_NAMES, loadProductCategoryTree, type ProductCategoryNode } from "@/utils/product-category";
import { asArray } from "@/utils/response";

import styles from "./rule-trigger.module.css";

interface ProductModel {
  id: string;
  name: string;
}

interface ProductProp {
  id?: string;
  propCode: string;
  propName: string;
}

interface ProductEvent {
  eventCode: string;
  eventName: string;
  eventConfig?: { triggerType?: string; eventRelatedProp?: string[] };
}

interface ProductConditionVo {
  productPropVoList?: ProductProp[];
  productEventVoList?: ProductEvent[];
}

const BASIC_PROP_OPTIONS = [{ label: "创建时间", value: "createTime" }];
const BASIC_OP_OPTIONS = [
  { label: "大于", value: "GT" },
  { label: "大于等于", value: "GE" },
];

/** 新增一条空的条件表达式，字段与旧页保持一致。 */
export function createRuleConditionExp(): MaintenanceRuleConditionExp {
  return {
    id: guid(),
    propCode: undefined,
    op: null,
    oprand: "",
    delayTime: 0,
    startDelayTime: 0,
    endDelayTime: 0,
    propName: "",
    propUnit: "",
    emergencyRuleConditionId: "",
    emergencyRuleId: "",
  };
}

/** 新增一条空规则。 */
export function createRuleCondition(): MaintenanceRuleCondition {
  return {
    id: guid(),
    deviceProdCategoryCodeConcat: "",
    deviceProdId: "",
    conditionType: null,
    deviceEventCode: "",
    emergencyRuleConditionExps: [createRuleConditionExp()],
  };
}

export const RuleTrigger = defineComponent({
  name: "MaintenanceRuleTrigger",
  props: {
    ruleData: { type: Object as PropType<MaintenanceRuleCondition>, required: true },
    attrIndex: { type: Number, default: 0 },
    /** 详情态只读。 */
    readonly: Boolean,
  },
  emits: ["deleteAttr"],
  setup(props, { emit }) {
    const categoryOptions = ref<ProductCategoryNode[]>([]);
    const productOptions = ref<ProductModel[]>([]);
    const propOptions = ref<ProductProp[]>([]);
    const eventOptions = ref<ProductEvent[]>([]);
    const triggerType = ref("");

    const loadProducts = async (categoryCode?: string): Promise<void> => {
      if (!categoryCode) {
        productOptions.value = [];
        return;
      }
      try {
        const client = await getDeviceCenterClient();
        productOptions.value = asArray<ProductModel>(await client.getProductModelByCategory(categoryCode));
      } catch (error) {
        message.error(error instanceof Error ? error.message : "产品列表加载失败");
      }
    };

    const loadConditions = async (productId?: string): Promise<void> => {
      if (!productId) {
        propOptions.value = [];
        eventOptions.value = [];
        return;
      }
      try {
        const client = await getDeviceCenterClient();
        const list = asArray<ProductConditionVo>(await client.getDeviceCondition({ prodIds: productId, withPropertySpec: true }));
        if (list.length === 0) {
          return;
        }
        propOptions.value = list[0]?.productPropVoList ?? [];
        eventOptions.value = list[0]?.productEventVoList ?? [];
        triggerType.value =
          eventOptions.value.find((event) => event.eventCode === props.ruleData.deviceEventCode)?.eventConfig?.triggerType ?? "";
      } catch (error) {
        message.error(error instanceof Error ? error.message : "触发条件加载失败");
      }
    };

    onMounted(() => {
      void loadProductCategoryTree()
        .then((tree) => {
          categoryOptions.value = tree;
        })
        .catch((error: unknown) => {
          message.error(error instanceof Error ? error.message : "产品品类加载失败");
        });
      // 回显时品类以 `a-b-c` 拼接保存，接口只认末级编码。
      void loadProducts(props.ruleData.deviceProdCategoryCodeConcat?.split("-").pop());
      void loadConditions(props.ruleData.deviceProdId);
    });

    const exps = (): MaintenanceRuleConditionExp[] => props.ruleData.emergencyRuleConditionExps ?? [];

    const addExp = (): void => {
      props.ruleData.emergencyRuleConditionExps = [...exps(), createRuleConditionExp()];
    };

    const removeExp = (id?: string): void => {
      props.ruleData.emergencyRuleConditionExps = exps().filter((item) => item.id !== id);
    };

    const actionButtons = (index: number): JSX.Element | null => {
      if (props.readonly) {
        return null;
      }
      return index === 0 ? (
        <Button type="link" style={{ color: "#00ba8b" }} onClick={addExp}>
          添加
        </Button>
      ) : (
        <Button type="link" danger onClick={() => removeExp(exps()[index]?.id)}>
          删除
        </Button>
      );
    };

    const renderCustomCondition = (): JSX.Element[] =>
      exps().map((item, index) => (
        <div class={styles.expRow} key={item.id}>
          <div class={styles.expCol}>
            <Select
              value={item.propCode}
              disabled={props.readonly}
              placeholder="请选择设备属性"
              options={propOptions.value.map((prop) => ({ label: prop.propName, value: prop.propCode }))}
              onUpdate:value={(raw: unknown) => {
                const value = toText(raw);
                item.propCode = value;
                item.propName = propOptions.value.find((prop) => prop.propCode === value)?.propName ?? "";
              }}
            />
          </div>
          <div class={styles.expCol}>
            <Select
              value={item.op ?? undefined}
              disabled={props.readonly}
              placeholder="比较操作"
              options={COMPARATOR_OPTIONS}
              onUpdate:value={(raw: unknown) => {
                item.op = toText(raw);
              }}
            />
          </div>
          <div class={styles.expCol}>
            <Input
              value={item.oprand}
              disabled={props.readonly}
              placeholder="请输入属性值"
              onUpdate:value={(value: string) => {
                item.oprand = value;
              }}
            />
          </div>
          <div class={styles.delayCol}>
            <InputNumber
              value={item.delayTime}
              disabled={props.readonly}
              min={0}
              formatter={(value: string | number | undefined) => `${value ?? 0} 秒`}
              placeholder="状态持续时延"
              onUpdate:value={(raw: unknown) => {
                item.delayTime = toNumber(raw);
              }}
            />
          </div>
          <div class={styles.actionCol}>{actionButtons(index)}</div>
        </div>
      ));

    const renderEventCondition = (): JSX.Element => (
      <div class={styles.eventCondition}>
        <div class={styles.eventSelect}>
          <Select
            value={props.ruleData.deviceEventCode}
            disabled={props.readonly}
            placeholder="请选择设备事件"
            options={eventOptions.value.map((event) => ({ label: event.eventName, value: event.eventCode }))}
            onUpdate:value={(raw: unknown) => {
              const value = toText(raw);
              props.ruleData.deviceEventCode = value;
              triggerType.value = eventOptions.value.find((event) => event.eventCode === value)?.eventConfig?.triggerType ?? "";
            }}
          />
        </div>
        {triggerType.value === "SIMPLE" ? (
          <div>
            {exps().map((item, index) => (
              <div class={styles.eventDelay} key={item.id}>
                <InputNumber
                  class={styles.delayInput}
                  value={item.delayTime}
                  disabled={props.readonly}
                  min={0}
                  formatter={(value: string | number | undefined) => `${value ?? 0} 秒`}
                  placeholder="状态持续时延"
                  onUpdate:value={(raw: unknown) => {
                    item.delayTime = toNumber(raw);
                  }}
                />
                {actionButtons(index)}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );

    const renderBasicCondition = (): JSX.Element[] =>
      exps().map((item, index) => (
        <div class={styles.expRow} key={item.id}>
          <div class={styles.expCol}>
            <Select
              value={item.propCode}
              disabled={props.readonly}
              placeholder="请选择"
              options={BASIC_PROP_OPTIONS}
              onUpdate:value={(raw: unknown) => {
                const value = toText(raw);
                item.propCode = value;
                item.propName = BASIC_PROP_OPTIONS.find((option) => option.value === value)?.label ?? "";
              }}
            />
          </div>
          <div class={styles.basicRangeCol}>
            <span class={styles.basicLabel}>距今日</span>
            <div class={styles.basicRange}>
              <Select
                value={item.op ?? undefined}
                disabled={props.readonly}
                placeholder="请选择"
                options={BASIC_OP_OPTIONS}
                onUpdate:value={(raw: unknown) => {
                  item.op = toText(raw);
                }}
              />
              <Input
                type="number"
                value={item.oprand}
                disabled={props.readonly}
                addonAfter="天"
                placeholder="请输入属性值"
                onUpdate:value={(value: string) => {
                  item.oprand = value;
                }}
              />
            </div>
          </div>
          <div class={styles.actionCol}>{actionButtons(index)}</div>
        </div>
      ));

    const renderCondition = (): JSX.Element | JSX.Element[] | null => {
      switch (props.ruleData.conditionType) {
        case "CUSTOM_RULE_CONDITION":
          return renderCustomCondition();
        case "DEVICE_EVENT_CONDITION":
          return renderEventCondition();
        case "BASIC_INFORMATION":
          return renderBasicCondition();
        default:
          return null;
      }
    };

    return () => (
      <div class={styles.ruleRow}>
        <div class={styles.baseCol}>
          <Cascader
            value={props.ruleData.deviceProdCategoryCodeConcat ? props.ruleData.deviceProdCategoryCodeConcat.split("-") : []}
            options={categoryOptions.value}
            fieldNames={PRODUCT_CATEGORY_FIELD_NAMES}
            disabled={props.readonly}
            changeOnSelect
            placeholder="请选择产品品类"
            onUpdate:value={(raw: unknown) => {
              const path = toTextArray(raw);
              props.ruleData.deviceProdId = "";
              props.ruleData.deviceProdCategoryCodeConcat = path.join("-");
              void loadProducts(path[path.length - 1]);
            }}
          />
        </div>
        <div class={styles.baseCol}>
          <Select
            value={props.ruleData.deviceProdId}
            disabled={props.readonly}
            placeholder="请选择产品名称"
            options={productOptions.value.map((product) => ({ label: product.name, value: product.id }))}
            onUpdate:value={(raw: unknown) => {
              const value = toText(raw);
              props.ruleData.deviceProdId = value;
              void loadConditions(value);
            }}
          />
        </div>
        <div class={styles.baseCol}>
          <Select
            value={props.ruleData.conditionType ?? undefined}
            disabled={props.readonly}
            placeholder="请选择条件类型"
            options={ATTRIBUTE_TYPE_OPTIONS}
            onUpdate:value={(raw: unknown) => {
              // 切换条件类型时重置表达式，避免残留上一类型的字段。
              props.ruleData.emergencyRuleConditionExps = [createRuleConditionExp()];
              props.ruleData.conditionType = toText(raw);
            }}
          />
        </div>
        <div class={styles.conditionCol}>
          <div class={styles.conditionContent}>{renderCondition()}</div>
          {!props.readonly && props.attrIndex !== 0 && exps().length > 0 ? (
            <Button type="link" danger onClick={() => emit("deleteAttr")}>
              删除规则
            </Button>
          ) : null}
        </div>
      </div>
    );
  },
});
