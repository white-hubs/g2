// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import {
  type DailyTaskTarget,
  DailyTaskTargetCategoryOptions,
  type ParticipateItem,
  type StandardModel,
  type TargetStandard,
  getCurrentDailyType,
} from "@g2-client/daily-task/client";
import { type PropType, defineComponent, reactive, ref, watch } from "vue";

import { cubeBusinessTagService, cubeDailyTaskService } from "@/api/server";
import { DailyStandardSelectModalTable, DailyTaskResponsibleObjectEditModal, TargetType } from "@/components/daily-task-widgets";
import { Button, Input, PopConfirm, PopOver, Table } from "@/pc-ui-runtime";
import type { AreaModel } from "@/types/daily-task";

import styles from "./target-content-table.module.css";

// ==================== 类型定义 ====================
interface ObjectDetail {
  id: string;
  name?: string | undefined;
  code?: string | undefined;
  typeId?: string | undefined;
  typeName?: string | undefined;
  tagIds: string[];
  tagNames: string;
}

type EditMode = "single" | "batch";

interface TargetTypeDataMapper {
  getCode: (record: Record<string, unknown>) => string;
  getTypeId: (record: Record<string, unknown>) => string;
  getTypeName: (record: Record<string, unknown>) => string;
}

// ==================== 常量定义 ====================
const PAGE_SIZE_OPTIONS = ["10", "20", "50", "100"] as const;
const DEFAULT_PAGE_SIZE = 10;
const ACTION_COLUMN_WIDTH = 250;
const EMPTY_TEXT = "--";
const JOIN_SEPARATOR = "、";

export const TargetContentTable = defineComponent({
  props: {
    isEdit: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
    targetType: {
      type: String as PropType<TargetType>,
      default: TargetType.AREA,
    },
    dataSource: {
      type: Array as PropType<DailyTaskTarget[]>,
      default: () => [],
    },
  },
  emits: ["update:dataSource"],
  setup: (props, { emit }) => {
    // ==================== 状态管理 ====================
    // 数据源状态
    const baseDataSource = ref<DailyTaskTarget[]>(props.dataSource);
    const displayDataSource = ref<DailyTaskTarget[]>(props.dataSource);
    const selectedRowKeys = ref<string[]>([]);
    const loading = ref<boolean>(false);
    const skipReload = ref<boolean>(false);

    // 筛选状态
    const filterState = reactive({
      keyword: "",
      tagIds: [] as string[],
      pageNumber: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      total: 0,
    });

    // 标准编辑状态
    const standardTableRef = ref<{ openModal: (keys?: string[]) => void }>();
    const editingTargetId = ref<string>("");
    const editingMode = ref<EditMode>("single");
    const editingTargetIds = ref<string[]>([]);

    // 参与条件编辑状态
    const participateConditionEditModalRef = ref<{ openModal: (defaultData?: ParticipateItem) => void }>();
    const editingParticipateConditionTargetId = ref<string>("");
    const editingParticipateConditionTargetIds = ref<string[]>([]);
    const editingParticipateConditionMode = ref<EditMode>("single");

    // ==================== 工具函数 ====================
    /** 获取当前数据源的所有ID */
    const getCurrentDataSourceIds = (): string[] => baseDataSource.value.map((r) => r.targetId).filter((id): id is string => Boolean(id));

    /** 获取区域树的所有叶子节点 */
    const getLeafAreaNodes = (nodes: AreaModel[]): AreaModel[] => {
      const result: AreaModel[] = [];
      const stack: AreaModel[] = [...nodes];
      while (stack.length > 0) {
        const node = stack.pop() as AreaModel;
        const children: AreaModel[] = Array.isArray(node.children) ? node.children : [];
        if (children.length === 0) {
          result.push(node);
        } else {
          for (const child of children) {
            stack.push(child);
          }
        }
      }
      const uniq: AreaModel[] = [];
      const seen = new Set<string>();
      for (const n of result) {
        const id = n.id;
        if (!seen.has(id)) {
          seen.add(id);
          uniq.push(n);
        }
      }
      return uniq;
    };

    /** 更新数据源并触发重新加载 */
    const updateDataSource = (newData: DailyTaskTarget[]): void => {
      baseDataSource.value = newData;
      skipReload.value = true;
      emit("update:dataSource", baseDataSource.value);
      loadPageDetails();
    };

    /** 将记录映射为 ObjectDetail */
    const mapToObjectDetail = (record: Record<string, unknown>, mapper: TargetTypeDataMapper): ObjectDetail => ({
      id: record.id as string,
      name: (record.name as string) || undefined,
      code: mapper.getCode(record),
      typeId: mapper.getTypeId(record),
      typeName: mapper.getTypeName(record),
      tagIds: (record.tagIds as string[]) || [],
      tagNames: (record.tagNames as string) || "",
    });

    // ==================== 数据获取配置 ====================
    /** 不同类型的数据映射器配置 */
    const getTargetTypeMapper = (targetType: TargetType): TargetTypeDataMapper => {
      const mappers: Record<TargetType, TargetTypeDataMapper> = {
        [TargetType.AREA]: {
          getCode: (r: Record<string, unknown>) => (r.code as string) || "",
          getTypeId: (r: Record<string, unknown>) => (r.id as string) || "",
          getTypeName: (r: Record<string, unknown>) => (r.name as string) || "",
        },
        [TargetType.DEVICE]: {
          getCode: (r: Record<string, unknown>) => (r.code as string) || "",
          getTypeId: (r: Record<string, unknown>) => {
            const productInfo = r.productInfo as Record<string, unknown> | undefined;
            const category = productInfo?.productCategory as Record<string, unknown> | undefined;
            return (category?.code as string) || "";
          },
          getTypeName: (r: Record<string, unknown>) => {
            const productInfo = r.productInfo as Record<string, unknown> | undefined;
            const category = productInfo?.productCategory as Record<string, unknown> | undefined;
            return (category?.name as string) || "";
          },
        },
        [TargetType.PROPERTY]: {
          getCode: (r: Record<string, unknown>) => (r.serialNumber as string) || "",
          getTypeId: (r: Record<string, unknown>) => (r.typeId as string) || "",
          getTypeName: (r: Record<string, unknown>) => (r.typeName as string) || "",
        },
        [TargetType.SITE_POINT]: {
          getCode: (r: Record<string, unknown>) => (r.codeNum as string) || "",
          getTypeId: (r: Record<string, unknown>) => (r.typeId as string) || "",
          getTypeName: (r: Record<string, unknown>) => (r.typeName as string) || "",
        },
        [TargetType.RISK_SOURCE]: {
          getCode: (r: Record<string, unknown>) => (r.serialNumber as string) || "",
          getTypeId: (r: Record<string, unknown>) => (r.typeCode as string) || "",
          getTypeName: (r: Record<string, unknown>) => (r.typeName as string) || "",
        },
        [TargetType.STALL]: {
          getCode: (r: Record<string, unknown>) => (r.code as string) || "",
          getTypeId: (r: Record<string, unknown>) => (r.type as string) || "",
          getTypeName: (r: Record<string, unknown>) => (r.typeName as string) || "",
        },
        [TargetType.SMALL_ENGINEERING]: {
          getCode: (r: Record<string, unknown>) => (r.projectNum as string) || "",
          getTypeId: (r: Record<string, unknown>) => (r.projectType as string) || "",
          getTypeName: (r: Record<string, unknown>) => (r.projectTypeName as string) || "",
        },
        [TargetType.PATROL_POINT]: {
          getCode: (r: Record<string, unknown>) => (r.codeNum as string) || "",
          getTypeId: (r: Record<string, unknown>) => (r.typeId as string) || "",
          getTypeName: (r: Record<string, unknown>) => (r.typeName as string) || "",
        },
      };
      return mappers[targetType];
    };

    /** 获取不同类型的数据 */
    const fetchTargetData = async (targetType: TargetType): Promise<{ rows: ObjectDetail[]; total: number }> => {
      const ids = getCurrentDataSourceIds();
      const name = (filterState.keyword || "").trim();
      const tagIds: string[] = filterState.tagIds || [];
      const mapper = getTargetTypeMapper(targetType);

      try {
        let response: AreaModel[] | Record<string, unknown>;
        let records: Record<string, unknown>[] = [];

        switch (targetType) {
          case TargetType.AREA: {
            const areaResponse = await cubeBusinessTagService.getTagAreaTreeList({ ids, name, tagIds });
            const leafNodes = getLeafAreaNodes((areaResponse ?? []) as AreaModel[]);
            records = leafNodes as unknown as Record<string, unknown>[];
            response = areaResponse as AreaModel[];
            break;
          }
          case TargetType.DEVICE: {
            response = (await cubeBusinessTagService.getTagDevicePageList({
              pageNumber: filterState.pageNumber,
              pageSize: filterState.pageSize,
              ids,
              name,
              tagIds,
            })) as unknown as Record<string, unknown>;
            records = (response?.records as Record<string, unknown>[]) || [];
            break;
          }
          case TargetType.PROPERTY: {
            response = (await cubeBusinessTagService.getTagPropertyPageList({
              pageNumber: filterState.pageNumber,
              pageSize: filterState.pageSize,
              ids,
              name,
              tagIds,
            })) as unknown as Record<string, unknown>;
            records = (response?.records as Record<string, unknown>[]) || [];
            break;
          }
          case TargetType.SITE_POINT: {
            response = (await cubeBusinessTagService.getTagSitePointPageList({
              pageNumber: filterState.pageNumber,
              pageSize: filterState.pageSize,
              ids,
              name,
              tagIds,
            })) as unknown as Record<string, unknown>;
            records = (response?.records as Record<string, unknown>[]) || [];
            break;
          }
          case TargetType.RISK_SOURCE: {
            response = (await cubeBusinessTagService.getTagRiskSourcePageList({
              pageNumber: filterState.pageNumber,
              pageSize: filterState.pageSize,
              ids,
              name,
              tagIds,
            })) as unknown as Record<string, unknown>;
            records = (response?.records as Record<string, unknown>[]) || [];
            break;
          }
          case TargetType.STALL: {
            response = (await cubeBusinessTagService.getTagStallPageList({
              pageNumber: filterState.pageNumber,
              pageSize: filterState.pageSize,
              ids,
              name,
              tagIds,
            })) as unknown as Record<string, unknown>;
            records = (response?.records as Record<string, unknown>[]) || [];
            break;
          }
          case TargetType.SMALL_ENGINEERING: {
            response = (await cubeBusinessTagService.getTagSmallEngineeringPageList({
              pageNumber: filterState.pageNumber,
              pageSize: filterState.pageSize,
              ids,
              name,
              tagIds,
            })) as unknown as Record<string, unknown>;
            records = (response?.records as Record<string, unknown>[]) || [];
            break;
          }
          case TargetType.PATROL_POINT: {
            response = (await cubeBusinessTagService.getTagPatrolPointPageList({
              pageNumber: filterState.pageNumber,
              pageSize: filterState.pageSize,
              ids,
              name,
              tagIds,
            })) as unknown as Record<string, unknown>;
            records = (response?.records as Record<string, unknown>[]) || [];
            break;
          }
          default: {
            return { rows: [], total: 0 };
          }
        }

        const rows = records.map((r: Record<string, unknown>) => mapToObjectDetail(r, mapper));
        const total =
          targetType === TargetType.AREA ? rows.length : Number(((response as Record<string, unknown>)?.total ?? records.length) as number);

        return { rows, total };
      } catch {
        // 错误时使用基础数据
        const rows = baseDataSource.value.map((item) => ({
          id: item.targetId,
          name: item.targetName ?? "",
          code: item.targetCode,
          typeId: targetType === TargetType.AREA ? item.targetId : "",
          typeName: "",
          tagIds: [],
          tagNames: "",
        }));
        return { rows, total: rows.length };
      }
    };

    // ==================== 数据加载 ====================
    const loadPageDetails = async (): Promise<void> => {
      loading.value = true;
      const ids = getCurrentDataSourceIds();

      if (ids.length === 0) {
        displayDataSource.value = [];
        loading.value = false;
        return;
      }

      const { rows, total: respTotal } = await fetchTargetData(props.targetType);

      // 构建详情映射
      const detailMap: Record<string, ObjectDetail> = {};
      rows.forEach((r) => {
        detailMap[r.id] = r;
      });

      // 获取标准数据
      const selectedTypeIds: string[] = Array.from(
        new Set(baseDataSource.value.map((d) => detailMap[d.targetId]?.typeId ?? "").filter((id): id is string => Boolean(id))),
      );

      let standardMap: Record<string, TargetStandard[]> = {};
      try {
        standardMap = await cubeDailyTaskService.getDailyStandardByTypeIds({
          type: props.targetType,
          typeIds: selectedTypeIds,
          dailyType: getCurrentDailyType(),
        });
      } catch {
        standardMap = {};
      }

      // 合并数据
      const merged = baseDataSource.value.map((d) => {
        const detail = detailMap[d.targetId];
        const typeId = detail?.typeId ?? "";
        return {
          targetId: d.targetId,
          targetName: detail?.name && detail.name.trim().length > 0 ? detail.name : (d.targetName ?? ""),
          targetCode: detail?.code ?? d.targetCode ?? "",
          targetCategory: d.targetCategory || "",
          tagIds: detail?.tagIds ?? d.tagIds ?? [],
          tagNames: detail?.tagNames ?? d.tagNames ?? "",
          standardList:
            Array.isArray(d.standardList) && d.standardList.length > 0 ? d.standardList : typeId ? (standardMap[typeId] ?? []) : [],
          participateCondition: d.participateCondition,
        } as DailyTaskTarget;
      });

      baseDataSource.value = merged;

      // 更新显示数据
      if (props.targetType === TargetType.AREA) {
        displayDataSource.value = merged;
        filterState.total = merged.length;
      } else {
        const pageIdSet = new Set(rows.map((r) => r.id));
        displayDataSource.value = merged.filter((d) => pageIdSet.has(d.targetId));
        filterState.total = respTotal;
      }

      skipReload.value = true;
      emit("update:dataSource", baseDataSource.value);
      loading.value = false;
    };

    // ==================== 监听器 ====================
    watch(
      () => props.dataSource,
      () => {
        baseDataSource.value = props.dataSource;
        const currentIds = new Set((baseDataSource.value || []).map((r) => r.targetId));
        selectedRowKeys.value = selectedRowKeys.value.filter((id) => currentIds.has(id));
        if (editingTargetId.value && !currentIds.has(editingTargetId.value)) {
          editingTargetId.value = "";
        }
        if (skipReload.value) {
          skipReload.value = false;
          return;
        }
        loadPageDetails();
      },
    );

    watch(
      () => filterState.keyword,
      () => {
        filterState.pageNumber = 1;
        loadPageDetails();
      },
    );

    watch(
      () => filterState.tagIds,
      () => {
        filterState.pageNumber = 1;
        loadPageDetails();
      },
    );

    // ==================== 列渲染函数 ====================
    const renderTextColumn = (text: string): JSX.Element => {
      const displayText = text || EMPTY_TEXT;
      return <PopOver content={displayText}>{displayText}</PopOver>;
    };

    const renderListColumn = (items: string[]): JSX.Element => {
      const triggerText = items.length > 0 ? items.join(JOIN_SEPARATOR) : EMPTY_TEXT;
      return (
        <PopOver
          v-slots={{
            content: (): JSX.Element => <div>{items.length > 0 ? items.map((n, i) => <div key={i}>{n}</div>) : EMPTY_TEXT}</div>,
          }}
        >
          {triggerText}
        </PopOver>
      );
    };

    const renderStandardList = ({ record }: { record: DailyTaskTarget }): JSX.Element => {
      const names = (record.standardList || []).map((item) => item.name);
      return renderListColumn(names);
    };

    const renderParticipateCondition = ({ record }: { record: DailyTaskTarget }): JSX.Element => {
      const names = record.participateCondition?.participateParams?.map((item) => item.targetName) ?? [];
      return renderListColumn(names);
    };

    const renderActionColumn = ({ record }: { record: DailyTaskTarget }): JSX.Element => (
      <>
        <Button type="link" size="small" onClick={() => editStandard(record)}>
          编辑标准
        </Button>
        <Button type="link" size="small" onClick={() => editParticipateCondition(record)}>
          编辑负责人
        </Button>
        <PopConfirm title="确认删除该项？" onConfirm={() => deleteRow(record.targetId)}>
          <Button type="link" size="small" danger>
            删除
          </Button>
        </PopConfirm>
      </>
    );

    // ==================== 表格列定义 ====================
    const columns = [
      {
        title: "对象名称",
        dataIndex: "targetName",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => renderTextColumn(text),
      },
      {
        title: "对象类型",
        dataIndex: "targetCategory",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => {
          const targetTypeName = DailyTaskTargetCategoryOptions.find((item) => item.value === text)?.label || EMPTY_TEXT;
          return renderTextColumn(targetTypeName);
        },
      },
      {
        title: "对象标准",
        dataIndex: "standardList",
        ellipsis: true,
        align: "center",
        customRender: renderStandardList,
      },
      {
        title: "发放给",
        dataIndex: "participateCondition",
        ellipsis: true,
        align: "center",
        customRender: renderParticipateCondition,
      },
      ...(props.isEdit
        ? [
            {
              dataIndex: "action",
              title: "操作",
              slots: {
                customRender: "action",
              },
              fixed: "right",
              width: ACTION_COLUMN_WIDTH,
              customRender: renderActionColumn,
            },
          ]
        : []),
    ];

    // ==================== 数据操作函数 ====================
    /** 删除单行数据 */
    const deleteRow = (id: string): void => {
      const newData = baseDataSource.value.filter((item) => item.targetId !== id);
      updateDataSource(newData);
    };

    /** 批量删除选中的数据 */
    const batchRemove = (): void => {
      const selected = new Set(selectedRowKeys.value);
      const newData = baseDataSource.value.filter((row) => !selected.has(row.targetId));
      selectedRowKeys.value = [];
      updateDataSource(newData);
    };

    // ==================== 标准编辑相关函数 ====================
    /** 编辑单条记录的标准 */
    const editStandard = (record: DailyTaskTarget): void => {
      editingMode.value = "single";
      editingTargetId.value = record.targetId;
      const preselectKeys: string[] = (record.standardList || []).map((item) => item.id).filter((id): id is string => Boolean(id));
      standardTableRef.value?.openModal(preselectKeys);
    };

    /** 批量设置标准 */
    const handleBatchSetStandard = (): void => {
      if (selectedRowKeys.value.length === 0) {
        return;
      }
      editingMode.value = "batch";
      editingTargetIds.value = [...selectedRowKeys.value];
      standardTableRef.value?.openModal();
    };

    /** 将 StandardModel 转换为 TargetStandard */
    const mapStandardModelsToTargetStandard = (selectedRows: StandardModel[]): TargetStandard[] => {
      const validRows: StandardModel[] = (selectedRows ?? []).filter((s): s is StandardModel => Boolean(s));
      return validRows.map((standard: StandardModel) => {
        const items = Array.isArray(standard.items) ? standard.items : [];
        return {
          id: standard.id || "",
          name: standard.name || "",
          description: standard.description || "",
          itemList: items.map((stdItem) => ({
            id: stdItem.itemId || "",
            name: stdItem.itemName || "",
            content: stdItem.itemContent || "",
            tag: stdItem.tag || "",
            resultList: [
              {
                id: stdItem.resultId || "",
                name: stdItem.resultName || "",
                defaultResultItem: stdItem.defaultResultItem || "",
                mustTakePhotoResultItems: stdItem.mustTakePhotoResultItems || "",
                mustRemarkResultItems: stdItem.mustRemarkResultItems || "",
                resultLabelJson: JSON.stringify(stdItem.resultLabelList || []),
              },
            ],
          })),
          createTime: "",
        };
      });
    };

    /** 处理标准编辑结果 */
    const handleAddStandard = (selectedRows: StandardModel[]): void => {
      if (editingMode.value === "batch") {
        if ((selectedRows ?? []).length === 0) {
          return;
        }
        const standardList: TargetStandard[] = mapStandardModelsToTargetStandard(selectedRows);
        const newData = baseDataSource.value.map((row: DailyTaskTarget) =>
          editingTargetIds.value.includes(row.targetId) ? { ...row, standardList } : row,
        );
        editingTargetIds.value = [];
        selectedRowKeys.value = [];
        editingMode.value = "single";
        updateDataSource(newData);
      } else {
        if (!editingTargetId.value) {
          return;
        }
        const standardList: TargetStandard[] = mapStandardModelsToTargetStandard(selectedRows);
        const newData = baseDataSource.value.map((row: DailyTaskTarget) =>
          row.targetId === editingTargetId.value ? { ...row, standardList } : row,
        );
        editingTargetId.value = "";
        updateDataSource(newData);
      }
    };

    // ==================== 参与条件编辑相关函数 ====================
    /** 编辑单条记录的参与条件 */
    const editParticipateCondition = (record: DailyTaskTarget): void => {
      editingParticipateConditionMode.value = "single";
      editingParticipateConditionTargetId.value = record.targetId;
      participateConditionEditModalRef.value?.openModal(record.participateCondition);
    };

    /** 批量设置参与条件 */
    const handleBatchSetParticipateCondition = (): void => {
      if (selectedRowKeys.value.length === 0) {
        return;
      }
      editingParticipateConditionMode.value = "batch";
      editingParticipateConditionTargetIds.value = [...selectedRowKeys.value];
      participateConditionEditModalRef.value?.openModal();
    };

    /** 处理参与条件编辑结果 */
    const handleParticipateConditionEdit = (participateItem: ParticipateItem): void => {
      if (editingParticipateConditionMode.value === "batch") {
        // 批量模式：更新所有选中的记录
        const newData = baseDataSource.value.map((row: DailyTaskTarget) =>
          editingParticipateConditionTargetIds.value.includes(row.targetId) ? { ...row, participateCondition: participateItem } : row,
        );
        editingParticipateConditionTargetIds.value = [];
        selectedRowKeys.value = [];
        editingParticipateConditionMode.value = "single";
        updateDataSource(newData);
      } else {
        // 单个模式：更新单条记录
        if (!editingParticipateConditionTargetId.value) {
          return;
        }
        const newData = baseDataSource.value.map((row: DailyTaskTarget) =>
          row.targetId === editingParticipateConditionTargetId.value ? { ...row, participateCondition: participateItem } : row,
        );
        editingParticipateConditionTargetId.value = "";
        updateDataSource(newData);
      }
    };

    loadPageDetails();

    return (): JSX.Element => (
      <>
        <div class={styles.tableActions}>
          <div class={styles.filters}>
            <Input placeholder={"对象名称"} v-model:value={filterState.keyword} />
          </div>
          <div class={styles.actions}>
            {props.isEdit && selectedRowKeys.value.length > 0 && (
              <>
                <Button size="middle" type="primary" onClick={handleBatchSetStandard}>
                  批量设置标准
                </Button>
                <Button size="middle" type="primary" onClick={handleBatchSetParticipateCondition}>
                  批量设置负责人
                </Button>
                <PopConfirm title={`确认移除选中的 ${selectedRowKeys.value.length} 项？`} onConfirm={batchRemove}>
                  <Button size="middle" danger>
                    批量移除 ({selectedRowKeys.value.length})
                  </Button>
                </PopConfirm>
              </>
            )}
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={displayDataSource.value}
          loading={loading.value}
          rowKey={"targetId"}
          pagination={
            props.targetType === TargetType.AREA
              ? false
              : {
                  current: filterState.pageNumber,
                  pageSize: filterState.pageSize,
                  total: filterState.total,
                  showSizeChanger: true,
                  pageSizeOptions: PAGE_SIZE_OPTIONS,
                  onChange: (current: number, size: number): void => {
                    filterState.pageNumber = current;
                    filterState.pageSize = size;
                    loadPageDetails();
                  },
                }
          }
          {...(props.isEdit
            ? {
                rowSelection: {
                  selectedRowKeys: selectedRowKeys.value,
                  onChange: (keys: string[]): void => {
                    selectedRowKeys.value = keys;
                  },
                },
              }
            : {})}
        />
        <DailyStandardSelectModalTable ref={standardTableRef} title={"添加标准"} onEnter={handleAddStandard} />
        <DailyTaskResponsibleObjectEditModal
          ref={participateConditionEditModalRef}
          title={"编辑发放成员"}
          onEnter={handleParticipateConditionEdit}
        />
      </>
    );
  },
});
