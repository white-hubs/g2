// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
// 引入新增的 Pane 组件，并使用共享类型
import { type Component, type PropType, computed, defineComponent, h, reactive, ref, watch } from "vue";

import { DevicePane } from "./panes/device-pane";
import { PropertyPane } from "./panes/property-pane";
import { RiskSourcePane } from "./panes/risk-source-pane";
import { SitePointPane } from "./panes/site-point-pane";
import { SmallEngineeringPane } from "./panes/small-engineering-pane";
import { StallPane } from "./panes/stall-pane";
import { TabPane, Tabs } from "@/pc-ui-runtime";

export enum AssocType {
  DEVICE = "DEVICE",
  PROPERTY = "PROPERTY",
  STALL = "STALL",
  SITE_POINT = "SITE_POINT",
  RISK_SOURCE = "RISK_SOURCE",
  SMALL_ENGINEERING = "SMALL_ENGINEERING",
  // AREA = 'AREA',
}

interface AssociationItem {
  targetTypeId: string;
  type: string;
}

// Tab 配置接口
interface TabConfig {
  key: AssocType;
  name: string;
  component: Component;
}

// Tab 配置列表
const TAB_CONFIGS: TabConfig[] = [
  { key: AssocType.DEVICE, name: "设备", component: DevicePane },
  { key: AssocType.STALL, name: "档位", component: StallPane },
  { key: AssocType.PROPERTY, name: "资产", component: PropertyPane },
  { key: AssocType.SITE_POINT, name: "现场点", component: SitePointPane },
  { key: AssocType.RISK_SOURCE, name: "风险源", component: RiskSourcePane },
  { key: AssocType.SMALL_ENGINEERING, name: "小散工程", component: SmallEngineeringPane },
  // { key: AssocType.AREA, name: '区域', component: AreaPane },
];

// 获取所有有效的 AssocType 列表
const VALID_ASSOC_TYPES = TAB_CONFIGS.map((config) => config.key);

export const AssociationTabs = defineComponent({
  props: {
    disabled: { type: Boolean, default: false },
    activeKey: { type: String as PropType<AssocType>, default: AssocType.DEVICE },
    modelValue: {
      type: Array as PropType<
        {
          type: string;
          targetTypeId: string;
        }[]
      >,
      default: () => [],
    },
    // 指定显示的 tab 类型集合，默认显示全部
    visibleTabs: {
      type: Array as PropType<AssocType[]>,
      default: undefined,
    },
  },
  emits: ["update:activeKey", "update:modelValue"],
  setup(props, { emit }) {
    const activeKey = ref(props.activeKey);
    const modelValue = ref(props.modelValue);
    const selectionDisabled = props.disabled;

    // 根据 visibleTabs 过滤出可见的 tab 配置
    const visibleTabConfigs = computed(() => {
      const visibleTabs = props.visibleTabs;
      if (visibleTabs && visibleTabs.length > 0) {
        return TAB_CONFIGS.filter((config: TabConfig) => visibleTabs.includes(config.key));
      }
      return TAB_CONFIGS;
    });

    // 获取可见的 AssocType 列表
    const visibleAssocTypes = computed(() => visibleTabConfigs.value.map((config: TabConfig) => config.key));

    // 初始化 selectValues，使用配置驱动
    const initSelectValues = (modelVal: AssociationItem[] = []): Record<AssocType, AssociationItem[]> => {
      const result = {} as Record<AssocType, AssociationItem[]>;
      VALID_ASSOC_TYPES.forEach((type) => {
        result[type] = modelVal.filter((v) => v.type === type);
      });
      return result;
    };

    const selectValues = reactive<Record<AssocType, AssociationItem[]>>(initSelectValues(props.modelValue));

    // 监听 activeKey 变化
    watch(
      () => props.activeKey,
      (v) => {
        activeKey.value = v;
      },
    );
    watch(activeKey, (v) => emit("update:activeKey", v));
    watch(modelValue, (v) => emit("update:modelValue", v));

    // 监听 visibleTabs 变化，确保 activeKey 在可见列表中
    watch(
      visibleAssocTypes,
      (visibleTypes) => {
        if (visibleTypes.length > 0 && !visibleTypes.includes(activeKey.value)) {
          activeKey.value = visibleTypes[0];
        }
      },
      { immediate: true },
    );

    // 监听 modelValue 变化，更新 selectValues
    watch(
      () => props.modelValue,
      (newVal) => {
        VALID_ASSOC_TYPES.forEach((type) => {
          selectValues[type] = newVal?.filter((v) => v.type === type) ?? [];
        });
      },
    );

    // 处理值更新
    const handleValueUpdate = (type: AssocType, newVal: AssociationItem[]): void => {
      selectValues[type] = newVal;
      // 合并所有类型的值（包括不可见的类型，以保持数据完整性）
      modelValue.value = VALID_ASSOC_TYPES.flatMap((associationType) => selectValues[associationType]);
    };

    return (): JSX.Element => (
      <Tabs v-model:activeKey={activeKey.value}>
        {visibleTabConfigs.value.map((config) => (
          <TabPane key={config.key} tab={config.name}>
            <div style={{ height: "350px", overflowY: "auto" }}>
              {h(config.component, {
                disabled: selectionDisabled,
                selectValue: selectValues[config.key],
                "onUpdate:selectValue": (v: AssociationItem[]) => {
                  handleValueUpdate(config.key, v);
                },
              })}
            </div>
          </TabPane>
        ))}
      </Tabs>
    );
  },
});
