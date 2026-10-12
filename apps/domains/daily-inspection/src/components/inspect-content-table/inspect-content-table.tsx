// @ts-nocheck -- 从 cube daily-inspection inspect-content-table 迁入。
import { computed, defineComponent, nextTick, onMounted, reactive, ref, watch, type PropType } from "vue";
import { useRoute } from "vue-router";

import {
  InspectItemTable,
  InspectStandardTable,
  ObjectSelectModal,
  ObjectType,
  targetCategoryOptions,
  useCubeModal,
  useCubeTable,
} from "@/compat/app-design";
import { InspectBusinessType } from "@/compat/constants";
import { getDailyInspectionClient } from "@/domain-context";
import { AntModal, Button, Form, FormItem, Input, Page, PopConfirm, PopOver, Select, Space, TabPane, Tabs, message } from "@/pc-ui-runtime";

import styles from "./inspect-content-table.module.css";

const OBJECT_SELECT_TABS_WITHOUT_PATROL = (Object.values(ObjectType) as string[]).filter((t) => t !== ObjectType.PATROL_POINT);

let rowId: string[] = [];

type StandardItem = Record<string, unknown> & { id?: string; resultId?: string; isRawItem?: number };
type StandardRow = Record<string, unknown> & { id?: string; name?: string; standardItems?: StandardItem[] };
export type DataSourceType = Record<string, unknown> & {
  targetId: string;
  targetName: string;
  targetCategory: string;
  standardDTOList: StandardRow[];
};

type ObjectSelectValue = Record<string, unknown> & { id: string; name: string; type: string };

const COORDINATE_FIELDS = ["latAndLon", "lntAndLat", "lngAndlat", "lngAndLat", "coordinate", "locationCoordinate"] as const;

const getCoordinateFromRecord = (targetItem: Record<string, unknown>): string => {
  for (const field of COORDINATE_FIELDS) {
    if (targetItem[field]) return String(targetItem[field]);
  }
  const longitude = targetItem.longitude ?? targetItem.lng;
  const latitude = targetItem.latitude ?? targetItem.lat;
  if (longitude !== undefined && longitude !== null && latitude !== undefined && latitude !== null) {
    return `${String(longitude)},${String(latitude)}`;
  }
  return "";
};

const getRecordCoordinate = (targetItem: Record<string, unknown>): string => {
  const coordinate = getCoordinateFromRecord(targetItem);
  if (coordinate) return coordinate;
  const stallExpand = targetItem.stallExpand;
  if (stallExpand && typeof stallExpand === "object") {
    return getCoordinateFromRecord(stallExpand as Record<string, unknown>);
  }
  return "";
};

export const InspectContentTable = defineComponent({
  props: {
    dataSource: {
      type: Array as PropType<DataSourceType[]>,
      default: () => [],
    },
    apiFunction: {
      type: Function as PropType<(param: Record<string, unknown>) => Promise<void>> | null,
      default: null,
    },
    handlePage: {
      type: Object as PropType<Record<string, unknown>> | null,
      default: null,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    targetCategories: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
  },
  setup: (props, { expose }) => {
    const state = reactive<{ keyword: string; targetCategory: string | null; deptId: string | undefined }>({
      targetCategory: null,
      keyword: "",
      deptId: undefined,
    });
    const route = useRoute();
    let initDataSource: DataSourceType[] = [];
    const standardTableRef = ref<{
      getStandardSelectedRows: () => StandardRow[];
      setStandardSelectedRows: (rows: StandardRow[]) => void;
    }>();
    const inspectItemTableRef = ref<{
      getInspectItemSelectedRows: () => StandardItem[];
      setInspectItemSelectedRows: (rows: StandardItem[]) => void;
    }>();

    const columns = [
      {
        title: "对象",
        dataIndex: "targetName",
        key: "targetName",
        customRender: ({ text }: { text: string }) => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "类型",
        dataIndex: "targetCategory",
        key: "targetCategory",
        ellipsis: true,
        customRender: ({ text }: { text: string }) => {
          const textVal = targetCategoryOptions.slice(1).find((item) => item.value === text)?.label;
          return <PopOver content={textVal || "--"}>{textVal || "--"}</PopOver>;
        },
      },
      {
        title: "内容",
        dataIndex: "content",
        key: "content",
        customRender: ({ record }: { record: DataSourceType }) => {
          if (!record.standardDTOList?.length) return "--";
          const text = record.standardDTOList.map((item) => item.name).join(",");
          return <PopOver content={text || "--"}>{text || "--"}</PopOver>;
        },
      },
      {
        title: "操作",
        dataIndex: "action",
        key: "action",
        customRender: ({ record }: { record: DataSourceType }) => (
          <>
            <Button
              type="link"
              onClick={() => {
                rowId = [record.targetId];
                inspectContentModalApi.open();
                nextTick(() => {
                  standardTableRef.value?.setStandardSelectedRows(record.standardDTOList ?? []);
                  const standard = (record.standardDTOList ?? []).find((item) => item.standardItems?.length);
                  if (standard) {
                    inspectItemTableRef.value?.setInspectItemSelectedRows(standard.standardItems ?? []);
                  }
                });
              }}
            >
              添加巡检内容
            </Button>
            <PopConfirm
              title="是否确定删除?"
              onConfirm={() => {
                initDataSource = initDataSource.filter((item) => item.targetId !== record.targetId);
                tableApi.setDataSource(initDataSource);
              }}
            >
              <Button type="link" danger>
                删除
              </Button>
            </PopConfirm>
          </>
        ),
      },
    ];

    const getApiParams = (): unknown[] => {
      const params: unknown[] = [];
      initDataSource.forEach((targetItem) => {
        const baseTargetObj = {
          targetCategory: targetItem.targetCategory,
          targetId: targetItem.targetId,
          targetType: targetItem.targetTypeName,
          targetName: targetItem.targetName,
          targetParentId: "",
          targetAddress:
            targetItem?.locationDes ||
            targetItem?.location ||
            targetItem?.address ||
            String(targetItem.constructionSite || "") ||
            String(targetItem.detailAddress || ""),
          latAndLon: getRecordCoordinate(targetItem),
          targetCode: targetItem.code || targetItem.codeNum || targetItem.serialNumber || targetItem.projectNum,
          location: "",
          targetAreaId: targetItem?.areaId || targetItem?.area?.id || "",
          targetAreaName:
            targetItem?.areaName ||
            targetItem?.areaNames ||
            (Array.isArray(targetItem?.area) ? targetItem?.area?.map((e) => e?.name).join("-") : targetItem?.area?.name) ||
            "",
        };
        let hasStandardItem = false;
        (targetItem.standardDTOList ?? []).forEach((standardItem) => {
          if (standardItem.standardItems?.length) {
            standardItem.standardItems.forEach((items) => {
              hasStandardItem = true;
              params.push({
                ...baseTargetObj,
                standardId: standardItem.id,
                itemId: items.id,
                resultCode: items.resultId,
                isRawItem: items.isRawItem ?? 0,
              });
            });
          }
        });
        if (!hasStandardItem) {
          params.push({
            ...baseTargetObj,
            standardId: "",
            itemId: "",
            resultCode: "",
            isRawItem: 0,
          });
        }
      });
      return params;
    };

    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    watch(
      () => props.handlePage,
      () => {
        page.total = (props.handlePage?.total as number) ?? 0;
      },
      { immediate: true, deep: true },
    );

    // 向导内嵌表格高度随内容，不走 PageLayout 的 autoScrollY 固定可视高度
    const [CubeTable, tableApi] = useCubeTable({
      columns: props.readonly || route.query.type === "info" ? columns.slice(0, columns.length - 1) : columns,
      dataSource: initDataSource,
      rowSelection: props.readonly || route.query.type === "info" ? undefined : "checkbox",
      rowKey: "targetId",
      autoFetch: false,
      autoScrollY: false,
      pagination: props.handlePage
        ? false
        : {
            current: 1,
            pageSize: 10,
            total: 0,
            showSizeChanger: true,
            showTotal: (total: number) => `总共 ${total} 条数据`,
            onChange: (current: number, pageSize: number) => {
              tableApi.setState({
                pagination: { ...(tableApi.state.pagination as object), pageSize, current },
              });
            },
          },
    });

    watch(
      () => props.dataSource,
      () => {
        if (props.dataSource.length) {
          nextTick(() => {
            initDataSource = props.dataSource.map((item) => ({
              ...item,
              standardDTOList: Array.isArray(item.standardDTOList) ? item.standardDTOList : [],
            }));
            tableApi.setDataSource(initDataSource);
          });
        } else {
          initDataSource = [];
          tableApi.setDataSource([]);
        }
      },
    );

    const handleChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      if (props.apiFunction) {
        void props.apiFunction({ ...state, ...page });
      }
    };

    const [InspectContentModal, inspectContentModalApi] = useCubeModal({
      title: "添加巡检内容",
      width: "800px",
      destroyOnClose: false,
      onConfirm() {
        const standardRows: StandardRow[] = [];
        const selectedStandardRows = (standardTableRef.value?.getStandardSelectedRows() || []).filter((row) => Boolean(row?.id));
        selectedStandardRows.forEach((row) => {
          if (!standardRows.some((item) => item.id === row.id)) standardRows.push({ ...row });
        });
        standardRows.forEach((standard) => {
          standard.standardItems = (standard.standardItems ?? []).map((item) => ({ ...item, isRawItem: 1 }));
        });
        if (!standardRows.length) {
          message.warning("请选择巡检标准");
          return;
        }
        const selectedStandardItems = (inspectItemTableRef.value?.getInspectItemSelectedRows() || []).map((item) => ({
          ...item,
          isRawItem: 0,
        }));
        standardRows[0].standardItems = [...(standardRows[0].standardItems ?? []), ...selectedStandardItems];
        initDataSource = initDataSource.map((item) => {
          if (rowId.includes(item.targetId)) return { ...item, standardDTOList: standardRows };
          return item;
        });
        tableApi.setDataSource(initDataSource);
        inspectContentModalApi.close();
      },
    });

    const handleTabChange = (key: string): void => {
      if (rowId.length > 1) return;
      const row = initDataSource.find((item) => rowId.includes(item.targetId));
      if (!row) return;
      if (key === "1") {
        const selectRows = (standardTableRef.value?.getStandardSelectedRows() || []).filter((item) => Boolean(item?.id));
        const initRows = row.standardDTOList ?? [];
        standardTableRef.value?.setStandardSelectedRows([...selectRows, ...initRows]);
      } else {
        const standard = (row.standardDTOList ?? []).find((item) => item.standardItems?.length);
        if (!standard) return;
        nextTick(() => {
          inspectItemTableRef.value?.setInspectItemSelectedRows(standard.standardItems ?? []);
        });
      }
    };

    const handleBatchRemove = (): void => {
      AntModal.confirm({
        title: "提示",
        content: "确定要移除选中的巡检对象吗？",
        onOk: () => {
          const selectedRowKeys = tableApi.getSelectedRowKeys();
          initDataSource = initDataSource.filter((item) => !selectedRowKeys.includes(item.targetId));
          tableApi.setDataSource(initDataSource);
          tableApi.setSelectedRowKeys([]);
        },
      });
    };

    const handleBatchChange = (): void => {
      rowId = tableApi.getSelectedRowKeys() as string[];
      inspectContentModalApi.open();
    };

    const batchDisabled = computed(() => !tableApi.getSelectedRowKeys().length);
    const objectSelected = ref<{ id: string; name: string; type?: string }[]>([]);
    const objectModalRef = ref<{ openModal: () => void }>();

    const onSelectEnter = async (value: ObjectSelectValue[]): Promise<void> => {
      const handleRows = await Promise.all(
        value.map(async (item) => {
          let patrolObjStandard: StandardRow[] = [];
          try {
            const standards = await getDailyInspectionClient().getStandardsByTarget(item.type, item.id ?? "");
            patrolObjStandard = standards.map((standard) => ({
              code: standard.code,
              describe: standard.remark,
              enable: standard.enable,
              id: standard.id,
              name: standard.name,
              standardItems: (Array.isArray(standard.standardItems) ? standard.standardItems : []).map((si) => ({
                isRawItem: 1,
                content: "",
                ...(si as Record<string, unknown>),
              })),
            }));
          } catch {
            patrolObjStandard = [];
          }
          return {
            ...item,
            id: item.id,
            name: item.name,
            type: item.type,
            targetId: item.id,
            targetName: item.name,
            standardDTOList: patrolObjStandard,
            targetCategory: item.type,
          } as DataSourceType;
        }),
      );
      const dataList = (tableApi.state.dataSource as DataSourceType[]) ?? [];
      initDataSource = handleRows.map((item) => {
        const obj = dataList.find((e) => e.targetId === item.targetId);
        return {
          ...obj,
          ...item,
          standardDTOList: obj?.standardDTOList?.length ? obj.standardDTOList : item.standardDTOList,
        };
      });
      tableApi.setDataSource(initDataSource);
    };

    onMounted(() => {
      if (props.apiFunction) void props.apiFunction({ ...state, ...page });
    });

    const getDataSource = (): DataSourceType[] => initDataSource;

    const validate = (): boolean => {
      if (!initDataSource.length) {
        message.error("请先选择巡检对象");
        return false;
      }
      const noStandardTargets = initDataSource.filter(
        (targetItem) => !targetItem.standardDTOList?.some((standard) => Boolean(standard.id)),
      );
      if (noStandardTargets.length) {
        message.error(
          noStandardTargets.length === 1 ? `请为${noStandardTargets[0].targetName || "巡检对象"}选择巡检标准` : "请选择巡检标准",
        );
        return false;
      }
      const noInspectItemTargets = initDataSource.filter(
        (targetItem) =>
          !targetItem.standardDTOList?.some((standard) => standard.standardItems?.some((standardItem) => Boolean(standardItem.id))),
      );
      if (noInspectItemTargets.length) {
        message.error(
          noInspectItemTargets.length === 1 ? `请为${noInspectItemTargets[0].targetName || "巡检对象"}选择巡检项` : "请选择巡检项",
        );
        return false;
      }
      return true;
    };

    const categoryFilterOptions = computed(() => {
      if (!props.targetCategories?.length) return targetCategoryOptions;
      const allowed = new Set(props.targetCategories);
      return targetCategoryOptions.filter((item) => !item.value || allowed.has(String(item.value)));
    });

    const isReadonly = computed(() => props.readonly || route.query.type === "info");

    watch(
      () => props.targetCategories.join(","),
      () => {
        if (!props.targetCategories?.length) return;
        const allowed = new Set(props.targetCategories);
        initDataSource = initDataSource.filter((item) => allowed.has(String(item.targetCategory)));
        tableApi.setDataSource(initDataSource);
      },
    );

    expose({ getApiParams, getDataSource, validate });

    return () => (
      <div>
        <div class={styles.searchContent}>
          <Form layout="inline">
            <FormItem label="对象类型" class={styles.searchItem}>
              <Select
                value={state.targetCategory}
                placeholder="对象类型"
                options={categoryFilterOptions.value}
                style={{ width: "150px" }}
                allowClear
                onUpdate:value={(v) => (state.targetCategory = v ?? null)}
              />
            </FormItem>
            <FormItem label="" class={styles.searchItem}>
              <Input value={state.keyword} placeholder="请输入巡检对象名称" onUpdate:value={(v) => (state.keyword = v)} />
            </FormItem>
            <FormItem label="" class={styles.searchItem}>
              <Button
                type="primary"
                onClick={() => {
                  if (props.apiFunction) {
                    void props.apiFunction(state);
                    return;
                  }
                  let dataSource: DataSourceType[] = [...initDataSource];
                  if (state.targetCategory) dataSource = initDataSource.filter((item) => item.targetCategory === state.targetCategory);
                  if (state.keyword) dataSource = dataSource.filter((item) => String(item.targetName ?? "").includes(state.keyword));
                  tableApi.setDataSource(dataSource);
                }}
              >
                查询
              </Button>
              <Button
                style={{ marginLeft: "10px" }}
                onClick={() => {
                  state.keyword = "";
                  state.targetCategory = "";
                  page.pageNumber = 1;
                  if (props.apiFunction) {
                    void props.apiFunction({ ...state, ...page });
                    return;
                  }
                  tableApi.setDataSource(initDataSource);
                }}
              >
                重置
              </Button>
            </FormItem>
          </Form>
          {!isReadonly.value ? (
            <Space>
              <Button type="primary" onClick={handleBatchChange} disabled={batchDisabled.value}>
                批量修改
              </Button>
              <Button type="primary" onClick={handleBatchRemove} disabled={batchDisabled.value}>
                批量移除
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  const selectedRows = (tableApi.state.dataSource as DataSourceType[]) ?? [];
                  objectModalRef.value?.openModal();
                  objectSelected.value = selectedRows.map((item) => ({
                    id: item.targetId,
                    name: item.targetName,
                    type: item.targetCategory,
                  }));
                }}
              >
                添加对象
              </Button>
            </Space>
          ) : null}
        </div>
        <CubeTable />
        {props.handlePage ? (
          <div class={styles.pagination}>
            <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handleChange} />
          </div>
        ) : null}
        <InspectContentModal>
          {inspectContentModalApi.state.isOpen ? (
            <Tabs defaultActiveKey="1" onChange={handleTabChange} forceRender>
              <TabPane tab="巡检标准" key="1">
                <InspectStandardTable businessType={InspectBusinessType.DAILY_INSPECTION} ref={standardTableRef} />
              </TabPane>
              <TabPane tab="巡检项" key="2">
                <InspectItemTable businessType={InspectBusinessType.DAILY_INSPECTION} ref={inspectItemTableRef} />
              </TabPane>
            </Tabs>
          ) : null}
        </InspectContentModal>
        {!isReadonly.value ? (
          <ObjectSelectModal
            ref={objectModalRef}
            title="选择巡检对象"
            oldDailyInspection
            showTabs={
              props.targetCategories?.length
                ? props.targetCategories.filter((item) => item !== "DRONE" && item !== "ROBOT_DOG")
                : OBJECT_SELECT_TABS_WITHOUT_PATROL
            }
            value={objectSelected.value}
            multiple
            onEnter={async (value: ObjectSelectValue[]) => {
              await onSelectEnter(value);
            }}
          />
        ) : null}
      </div>
    );
  },
});
