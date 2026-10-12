// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import type { DailyTaskTarget } from "@g2-client/daily-task/client";
import { type PropType, computed, defineComponent, ref, watch } from "vue";

import { TargetContentTable } from "../target-content-table/target-content-table";
import { type AdvancedResultItem, DailyObjectSelectModal, TargetType, getTargetTypeLabel } from "@/components/daily-task-widgets";
import { Button, TabPane, Tabs } from "@/pc-ui-runtime";

export const TargetContentView = defineComponent({
  props: {
    isEdit: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
    dataSource: {
      type: Object as PropType<Record<string, DailyTaskTarget[]>>,
      default: () => ({}),
    },
    // 指定允许显示的目标类型集合，默认显示全部
    allowedTargetTypes: {
      type: Array as PropType<TargetType[]>,
      default: undefined,
    },
  },
  emits: ["update:dataSource"],
  setup: (props, { expose, emit }) => {
    // 所有可用的目标类型
    const allTabTypes = computed(() => Object.values(TargetType).filter((t) => typeof t === "string") as TargetType[]);
    // 根据 allowedTargetTypes 过滤后的目标类型集合
    const tabTypes = computed(() => {
      if (props.allowedTargetTypes && props.allowedTargetTypes.length > 0) {
        return props.allowedTargetTypes;
      }
      return allTabTypes.value;
    });
    const dataSource = ref<Record<string, DailyTaskTarget[]>>(props.dataSource);
    const hasSetInitialActive = ref<boolean>(false);
    const firstDataType = (): TargetType => {
      const keys = Object.keys(dataSource.value || {});
      const found = keys.find((k) => (dataSource.value[k] || []).length > 0);
      return (found as TargetType) ?? tabTypes.value[0] ?? TargetType.AREA;
    };
    const activeKey = ref<TargetType>(firstDataType());
    const renderTabTypes = computed(() => {
      const filtered = props.isEdit ? tabTypes.value : tabTypes.value.filter((t) => (dataSource.value[t] || []).length > 0);
      return filtered;
    });

    watch(
      () => props.dataSource,
      () => {
        if (props.dataSource) {
          dataSource.value = props.dataSource;
        }
        const available = renderTabTypes.value;
        if (!props.isEdit) {
          if (!available.includes(activeKey.value)) {
            activeKey.value = available[0] ?? tabTypes.value[0] ?? TargetType.AREA;
          }
        } else if (!hasSetInitialActive.value) {
          activeKey.value = firstDataType();
          hasSetInitialActive.value = true;
        }
      },
    );

    // 监听 allowedTargetTypes 变化，确保 activeKey 在允许的类型范围内
    watch(
      () => props.allowedTargetTypes,
      () => {
        const available = renderTabTypes.value;
        if (available.length > 0 && !available.includes(activeKey.value)) {
          activeKey.value = available[0] ?? tabTypes.value[0] ?? TargetType.AREA;
        }
      },
    );

    const dailyObjectSelectModalRef = ref<{
      openModal: (defaultTab: TargetType, selectValue: Record<TargetType, DailyTaskTarget[]>) => void;
    }>();

    const getTargetContentData = (): {
      targetCategory: string;
      targetId: string;
      standardList: { id: string; name: string }[];
      participateCondition: {
        conditionType: "USER" | "CONDITION";
        participateParams: { participateType: string; targetId: string; targetName: string }[];
        abnormalUserIdList: string[];
      };
    }[] => {
      const allSelected = Object.values(dataSource.value).flat();
      const targetData = allSelected.map((item) => ({
        targetCategory: item.targetCategory,
        targetId: item.targetId,
        targetName: item.targetName,
        targetCode: item.targetCode,
        tagIds: item.tagIds,
        standardList: (item.standardList || [])
          .filter((standard) => (typeof standard.id === "string" ? standard.id.trim().length > 0 : Boolean(standard.id)))
          .map((standard) => ({
            id: standard.id,
            name: standard.name,
          })),
        participateCondition: {
          conditionType: item.participateCondition.conditionType,
          participateParams: item.participateCondition.participateParams,
          abnormalUserIdList: item.participateCondition.abnormalUserList.map((user) => user.targetId),
        },
      }));
      return targetData;
    };

    // 处理新组件的扁平数据
    const handleAddAdvancedObject = (items: AdvancedResultItem[]): void => {
      // 如果指定了允许的类型，过滤掉不允许的类型
      const allowedTypes = props.allowedTargetTypes;
      const filteredItems =
        allowedTypes && allowedTypes.length > 0 ? items.filter((item) => allowedTypes.includes(item.targetCategory)) : items;

      // 按 targetCategory 分组
      const grouped: Record<TargetType, DailyTaskTarget[]> = {
        [TargetType.AREA]: [],
        [TargetType.DEVICE]: [],
        [TargetType.PROPERTY]: [],
        [TargetType.STALL]: [],
        [TargetType.SITE_POINT]: [],
        [TargetType.PATROL_POINT]: [],
        [TargetType.RISK_SOURCE]: [],
        [TargetType.SMALL_ENGINEERING]: [],
      };

      filteredItems.forEach((item) => {
        const target: DailyTaskTarget = {
          ...item,
          standardList: [],
        };
        grouped[item.targetCategory].push(target);
      });
      // 复用现有逻辑
      handleAddObject(grouped);
    };

    const handleAddObject = (value: Record<TargetType, DailyTaskTarget[]>): void => {
      const next: Record<string, DailyTaskTarget[]> = {};
      const newTabs = tabTypes.value.filter((t) => (value[t] || []).length > 0);
      tabTypes.value.forEach((t) => {
        const prevList = dataSource.value[t] || [];
        const newList = value[t] || [];
        const newMap = new Map<string, DailyTaskTarget>(newList.map((item) => [item.targetId, item]));

        // 1. 先保留所有已存在的项（如果有新数据则合并）
        const merged: DailyTaskTarget[] = prevList.map((prev) => {
          const newItem = newMap.get(prev.targetId);
          if (newItem) {
            // 新数据中存在，合并更新 标记已处理
            newMap.delete(prev.targetId);
            return {
              ...prev,
              ...newItem,
              standardList: prev.standardList ?? newItem.standardList ?? [],
            };
          }
          // 保留原有项
          return prev;
        });

        // 2. 追加新增的项（newMap 中剩余的是新增项）
        newMap.forEach((item) => {
          merged.push(item);
        });

        next[t] = merged;
      });
      dataSource.value = next as Record<TargetType, DailyTaskTarget[]>;
      // 通知父组件数据变化
      emit("update:dataSource", dataSource.value);
      if (newTabs.length > 0) {
        activeKey.value = newTabs[0];
      }
    };

    /**
     * 获取选择的对象总数量
     */
    const getTotalCount = (): number => Object.values(dataSource.value).flat().length;

    expose({
      getTargetContentData,
      getTotalCount,
    });

    return (): JSX.Element => (
      <>
        <Tabs
          v-model:activeKey={activeKey.value}
          v-slots={{
            rightExtra: (): JSX.Element =>
              props.isEdit ? (
                <Button type="primary" onClick={() => dailyObjectSelectModalRef.value?.openModal(activeKey.value, dataSource.value)}>
                  新增
                </Button>
              ) : (
                <div></div>
              ),
          }}
        >
          {renderTabTypes.value.map((type) => (
            <TabPane tab={getTargetTypeLabel(type)} key={type}>
              <TargetContentTable
                targetType={type}
                isEdit={props.isEdit}
                dataSource={dataSource.value[type] || []}
                onUpdate:dataSource={(newDataSource: DailyTaskTarget[]) => {
                  const next = { ...dataSource.value, [type]: newDataSource };
                  dataSource.value = next;
                  // 通知父组件数据变化
                  emit("update:dataSource", dataSource.value);
                }}
              />
            </TabPane>
          ))}
        </Tabs>
        <DailyObjectSelectModal
          ref={dailyObjectSelectModalRef}
          title="选择任务对象"
          multiple={true}
          historySelected={dataSource.value}
          value={dataSource.value}
          defaultTab={activeKey.value}
          showTabs={props.allowedTargetTypes}
          onEnter={handleAddAdvancedObject}
        />
      </>
    );
  },
});
