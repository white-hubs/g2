// @ts-nocheck — 对齐 cube daily-inspection association-tabs；目录 API 经 dailyInspectionClient。
import { type Component, type PropType, computed, defineComponent, h, reactive, ref, watch } from "vue";

import {
  cubeAssetManagementService,
  cubeDeviceCenterService,
  cubeMaintainService,
  cubeMdataService,
  cubeRiskTypeService,
  cubeSmallEngineeringService,
} from "@/api/server";
import { TabPane, Table, Tabs } from "@/pc-ui-runtime";

export enum AssocType {
  DEVICE = "DEVICE",
  STALL = "STALL",
  PROPERTY = "PROPERTY",
  SITE_POINT = "SITE_POINT",
  RISK_SOURCE = "RISK_SOURCE",
  SMALL_ENGINEERING = "SMALL_ENGINEERING",
}

export interface AssociationItem {
  targetTypeId: string;
  type: AssocType | string;
  targetTypeName?: string;
}

interface PaneProps {
  disabled: boolean;
  selectValue: AssociationItem[];
}

interface RowItem {
  id?: string;
  categoryCode?: string;
  categoryCodeConcat?: string;
  name?: string;
  categoryName?: string;
  children?: RowItem[];
  nextList?: RowItem[];
}

const getRowId = (row: RowItem): string => String(row.id ?? row.categoryCodeConcat ?? row.categoryCode ?? "");
const getRowName = (row: RowItem): string => row.name ?? row.categoryName ?? "--";

const createPane = (
  type: AssocType,
  title: string,
  fetchApi: () => Promise<RowItem[]>,
  childrenColumnName?: "children" | "nextList",
): Component =>
  defineComponent({
    name: `${type}Pane`,
    props: {
      disabled: { type: Boolean, default: false },
      selectValue: { type: Array as PropType<AssociationItem[]>, default: () => [] },
    },
    emits: ["update:selectValue"],
    setup(props: PaneProps, { emit }) {
      const dataSource = ref<RowItem[]>([]);
      const selectedRowKeys = ref<string[]>(props.selectValue.map((e) => e.targetTypeId));

      watch(
        () => props.selectValue,
        (newVal: AssociationItem[] | undefined) => {
          selectedRowKeys.value = newVal?.map((e) => e.targetTypeId) ?? [];
        },
        { immediate: true },
      );

      fetchApi()
        .then((res) => {
          dataSource.value = res ?? [];
        })
        .catch(() => {
          dataSource.value = [];
        });

      const columns = [
        {
          title,
          dataIndex: "name",
          ellipsis: true,
          align: "left",
          customRender: ({ record }: { record: RowItem }) => getRowName(record),
        },
      ];

      return (): JSX.Element => (
        <Table
          columns={columns}
          dataSource={dataSource.value}
          rowKey={getRowId}
          pagination={false}
          size="small"
          childrenColumnName={childrenColumnName}
          rowSelection={{
            type: "checkbox",
            checkStrictly: false,
            selectedRowKeys: selectedRowKeys.value,
            onChange: (keys: string[]) => {
              selectedRowKeys.value = keys;
              emit(
                "update:selectValue",
                keys.map((key) => ({ targetTypeId: String(key), type })),
              );
            },
            getCheckboxProps: () => ({
              disabled: props.disabled,
            }),
          }}
        />
      );
    },
  });

export const DevicePane = createPane(
  AssocType.DEVICE,
  "设备分类名称",
  async () => cubeDeviceCenterService.getIotProductCategoryTree() as unknown as RowItem[],
  "children",
);
export const StallPane = createPane(
  AssocType.STALL,
  "类型名称",
  async () => cubeMdataService.stallTypeList({ enabled: true }) as unknown as RowItem[],
);
export const PropertyPane = createPane(AssocType.PROPERTY, "类型名称", async () => {
  const res = await cubeAssetManagementService.getAssemblyClassifyPage({ pageNumber: 1, pageSize: 1000, type: "assetType" });
  return (res?.records ?? []) as unknown as RowItem[];
});
export const SitePointPane = createPane(
  AssocType.SITE_POINT,
  "类型名称",
  async () => cubeMaintainService.inspectPointTypeList() as unknown as RowItem[],
);
export const RiskSourcePane = createPane(
  AssocType.RISK_SOURCE,
  "风险源名称",
  async () =>
    cubeRiskTypeService.getRiskSourceType({ itemCode: "risk-source-type", pageNumber: 1, pageSize: 1000 }) as unknown as RowItem[],
  "nextList",
);
export const SmallEngineeringPane = createPane(
  AssocType.SMALL_ENGINEERING,
  "类型名称",
  async () => cubeSmallEngineeringService.getProjectTypeList({}) as unknown as RowItem[],
);

const TAB_CONFIGS: { key: AssocType; name: string; component: Component }[] = [
  { key: AssocType.DEVICE, name: "设备", component: DevicePane },
  { key: AssocType.STALL, name: "档位", component: StallPane },
  { key: AssocType.PROPERTY, name: "资产", component: PropertyPane },
  { key: AssocType.SITE_POINT, name: "现场点", component: SitePointPane },
  { key: AssocType.RISK_SOURCE, name: "风险源", component: RiskSourcePane },
  { key: AssocType.SMALL_ENGINEERING, name: "小散工程", component: SmallEngineeringPane },
];

const VALID_ASSOC_TYPES = TAB_CONFIGS.map((config) => config.key);

export const AssociationTabs = defineComponent({
  name: "InspectStandardAssociationTabs",
  props: {
    disabled: { type: Boolean, default: false },
    activeKey: { type: String as PropType<AssocType>, default: AssocType.DEVICE },
    modelValue: { type: Array as PropType<AssociationItem[]>, default: () => [] },
    visibleTabs: { type: Array as PropType<AssocType[]>, default: undefined },
  },
  emits: ["update:activeKey", "update:modelValue"],
  setup(props, { emit }) {
    const activeKey = ref(props.activeKey);
    const visibleTabConfigs = computed(() => {
      return props.visibleTabs?.length ? TAB_CONFIGS.filter((config) => props.visibleTabs?.includes(config.key)) : TAB_CONFIGS;
    });
    const selectValues = reactive<Record<AssocType, AssociationItem[]>>({} as Record<AssocType, AssociationItem[]>);

    const syncSelectValues = (items: AssociationItem[] = []): void => {
      VALID_ASSOC_TYPES.forEach((type) => {
        selectValues[type] = items.filter((item) => item.type === type);
      });
    };

    syncSelectValues(props.modelValue);

    watch(
      () => props.activeKey,
      (value) => {
        activeKey.value = value;
      },
    );
    watch(activeKey, (value) => {
      emit("update:activeKey", value);
    });
    watch(
      () => props.modelValue,
      (value) => {
        syncSelectValues(value);
      },
    );
    watch(
      visibleTabConfigs,
      (configs) => {
        if (configs.length && !configs.some((config) => config.key === activeKey.value)) {
          activeKey.value = configs[0].key;
        }
      },
      { immediate: true },
    );

    const handleValueUpdate = (type: AssocType, value: AssociationItem[]): void => {
      selectValues[type] = value;
      emit(
        "update:modelValue",
        VALID_ASSOC_TYPES.flatMap((assocType) => selectValues[assocType] ?? []),
      );
    };

    return (): JSX.Element => (
      <Tabs v-model:activeKey={activeKey.value}>
        {visibleTabConfigs.value.map((config) => (
          <TabPane key={config.key} tab={config.name}>
            <div style={{ height: "350px", overflowY: "auto" }}>
              {h(config.component, {
                disabled: props.disabled,
                selectValue: selectValues[config.key],
                "onUpdate:selectValue": (value: AssociationItem[]) => {
                  handleValueUpdate(config.key, value);
                },
              })}
            </div>
          </TabPane>
        ))}
      </Tabs>
    );
  },
});
