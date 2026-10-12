// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import type {
  StandardItemModel,
  StandardItemResultModel,
  StandardModel,
  StandardRetItem,
  TaskResultItemModel,
} from "@g2-client/daily-task/client";
import { type PropType, defineComponent, ref, watch } from "vue";

import { ResultItem } from "../../views/task-record/record-info/components/result-item/result-item";
import { cubeDailyTaskService } from "@/api/server";
import { DailyStandardItemSelectModalTable, DailyStandardSelectModalTable } from "@/components/daily-task-widgets";
import { Button, Modal, PopConfirm, PopOver, Table, message } from "@/pc-ui-runtime";

import styles from "./standard-item-view.module.css";

export const StandardItemView = defineComponent({
  props: {
    isEdit: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
    dataSource: {
      type: Object as PropType<StandardRetItem[]>,
      default: () => [],
    },
  },
  setup(props, { expose }) {
    const toItems = (rows: StandardRetItem[]): StandardItemModel[] =>
      (rows || []).map((r) => {
        const first = (r.resultList || [])[0];
        const labels: TaskResultItemModel[] = ((): TaskResultItemModel[] => {
          try {
            const parsed = first?.resultLabelJson ? (JSON.parse(first.resultLabelJson) as TaskResultItemModel[]) : [];
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();
        const item: StandardItemModel = {
          itemId: r.id || "",
          itemName: r.name || "",
          targetTypes: [],
          itemContent: r.content || "",
          operationGuide: r.operationGuide || "",
          resultId: first?.id || "",
          resultName: first?.name || "",
          resultLabelList: labels,
          defaultResultItem: first?.defaultResultItem || "",
          mustTakePhotoResultItems: first?.mustTakePhotoResultItems || "",
          mustRemarkResultItems: first?.mustRemarkResultItems || "",
          tag: r.tag || "",
          createTime: "",
          updateTime: "",
          executeResult: r.executeResult || {
            record: "",
            itemId: "",
            itemName: "",
            resultId: "",
            resultName: "",
            errorFlag: false,
            remark: "",
            fileList: [],
          },
        };
        return item;
      });

    const dataSource = ref<StandardItemModel[]>(toItems(props.dataSource as StandardRetItem[]));
    watch(
      () => props.dataSource,
      () => {
        dataSource.value = toItems(props.dataSource as StandardRetItem[]);
      },
    );
    const selectedRowKeys = ref<string[]>([]);
    const resultModalVisible = ref<boolean>(false);
    const currentResultData = ref<StandardItemResultModel[]>([]);

    const columns = [
      {
        title: "名称",
        dataIndex: "itemName",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "内容描述",
        dataIndex: "itemContent",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "结果项",
        dataIndex: "resultId",
        ellipsis: true,
        align: "center",
        customRender: ({ record }: { record: StandardItemModel }): JSX.Element => {
          const text = record.resultName;
          return <PopOver content={text || "--"}>{text || "--"}</PopOver>;
        },
      },
      {
        title: "默认结果",
        dataIndex: "defaultResultItem",
        ellipsis: true,
        align: "center",
        customRender: ({ record }: { record: StandardItemModel }): JSX.Element => {
          const options = record.resultLabelList ?? [];
          const textVal = options
            ?.filter((e) => record?.defaultResultItem?.split(",")?.includes(e.value))
            .map((e) => e.label)
            .join(",");
          return <PopOver content={textVal || "--"}>{textVal || "--"}</PopOver>;
        },
      },
      {
        title: "以下结果必须拍照",
        dataIndex: "mustTakePhotoResultItems",
        ellipsis: true,
        align: "center",
        customRender: ({ record }: { record: StandardItemModel }): JSX.Element => {
          const options = record.resultLabelList ?? [];
          const textVal =
            options
              ?.filter((e) => record?.mustTakePhotoResultItems?.includes(e.value))
              .map((e) => e.label)
              .join(",") || "--";
          return <PopOver content={textVal || "--"}>{textVal || "--"}</PopOver>;
        },
      },
      {
        title: "以下巡检结果必须备注",
        dataIndex: "mustRemarkResultItems",
        ellipsis: true,
        align: "center",
        customRender: ({ record }: { record: StandardItemModel }): JSX.Element => {
          const options = record.resultLabelList ?? [];
          const textVal =
            options
              ?.filter((e) => record?.mustRemarkResultItems?.includes(e.value))
              .map((e) => e.label)
              .join(",") || "--";
          return <PopOver content={textVal || "--"}>{textVal || "--"}</PopOver>;
        },
      },
      {
        title: "操作指引",
        dataIndex: "operationGuide",
        ellipsis: true,
        align: "center",
        width: 260,
        customRender: ({ text }: { text: string }): JSX.Element => (
          <PopOver content={<div class={styles["rich-text-content"]} v-html={text || "--"} />}>
            <span
              style={{
                display: "inline-block",
                maxWidth: "220px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                verticalAlign: "middle",
              }}
            >
              {text
                ?.replace(/<[^>]*>/g, "")
                .replace(/&nbsp;/g, " ")
                .trim() || "--"}
            </span>
          </PopOver>
        ),
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
              width: 180,
              customRender: ({ record }: { record: StandardItemModel }): JSX.Element => (
                <>
                  <PopConfirm
                    title="确认删除该项？"
                    onConfirm={() => {
                      deleteRow(record.itemId);
                    }}
                  >
                    <Button type="link" size="small" danger>
                      删除
                    </Button>
                  </PopConfirm>
                </>
              ),
            },
          ]
        : [
            {
              dataIndex: "action",
              title: "操作",
              slots: {
                customRender: "action",
              },
              fixed: "right",
              width: 180,
              customRender: ({ record }: { record: StandardItemModel }): JSX.Element => {
                const hasResult = record.executeResult && record.executeResult.resultId;
                return (
                  <>
                    <Button
                      type="link"
                      size="small"
                      disabled={!hasResult}
                      onClick={() => {
                        if (hasResult) {
                          // 将 executeResult 转换为 StandardItemResultModel[] 格式
                          const resultData: StandardItemResultModel[] = [
                            {
                              masterId: record.executeResult.record || "",
                              standardId: "",
                              itemId: record.executeResult.itemId || "",
                              itemName: record.executeResult.itemName || "",
                              resultId: record.executeResult.resultId || "",
                              resultName: record.executeResult.resultName || "",
                              errorFlag: record.executeResult.errorFlag || false,
                              remark: record.executeResult.remark || "",
                              fileList: record.executeResult.fileList || [],
                            },
                          ];
                          currentResultData.value = resultData;
                          resultModalVisible.value = true;
                        }
                      }}
                    >
                      结果项详情
                    </Button>
                  </>
                );
              },
            },
          ]),
    ];

    const deleteRow = async (id: string): Promise<void> => {
      dataSource.value = dataSource.value.filter((e) => e.itemId !== id);
    };

    const standardItemTableRef = ref<{ openModal: (keys?: string[]) => void }>();
    const standardTableRef = ref<{ openModal: (keys?: string[]) => void }>();

    const appendStandardItems = (values: StandardItemModel[]): number => {
      const exist = new Set<string>(dataSource.value.map((e) => e.itemId).filter(Boolean));
      const rows = (values || []).filter((v): v is StandardItemModel => {
        if (!v?.itemId || exist.has(v.itemId)) {
          return false;
        }
        exist.add(v.itemId);
        return true;
      });
      dataSource.value = [...dataSource.value, ...rows];
      return rows.length;
    };

    const handleAddStandardItem = (values: StandardItemModel[]): void => {
      appendStandardItems(values);
    };

    const handleAddStandardItemsFromStandard = async (values: StandardModel[]): Promise<void> => {
      const standardIds = (values || []).map((item) => item.id).filter(Boolean);
      if (standardIds.length === 0) {
        return;
      }
      try {
        const standards = await Promise.all(standardIds.map((standardId) => cubeDailyTaskService.getDailyStandard(standardId)));
        const items = standards.flatMap((standard) => standard.items || []);
        const addedCount = appendStandardItems(items);
        if (items.length === 0) {
          message.warning("所选标准暂无标准项");
          return;
        }
        if (!addedCount) {
          message.warning("所选标准中的标准项已全部添加");
        }
      } catch (error) {
        const errorMessage = (error as { errorMessage?: string })?.errorMessage || "添加标准中的标准项失败";
        message.error(errorMessage);
      }
    };

    const batchRemove = (): void => {
      const selected = new Set<string>(selectedRowKeys.value);
      dataSource.value = dataSource.value.filter((row) => !selected.has(row.itemId));
      selectedRowKeys.value = [];
    };

    const getStandardItemIds = (): string[] => dataSource.value.map((e) => e.itemId);

    expose({ getStandardItemIds });

    return (): JSX.Element => (
      <>
        {props.isEdit && (
          <div class={styles.tableActions}>
            <Button
              type="primary"
              onClick={() => {
                const keys = dataSource.value.map((e) => e.itemId);
                standardItemTableRef.value?.openModal(keys);
              }}
            >
              添加标准项
            </Button>
            <Button
              type="primary"
              onClick={() => {
                standardTableRef.value?.openModal();
              }}
            >
              添加标准中标准项
            </Button>
            {selectedRowKeys.value.length > 0 && (
              <PopConfirm title={`确认移除选中的 ${selectedRowKeys.value.length} 项？`} onConfirm={batchRemove}>
                <Button danger>批量移除 ({selectedRowKeys.value.length})</Button>
              </PopConfirm>
            )}
          </div>
        )}
        <Table
          columns={columns}
          dataSource={dataSource.value}
          pagination={false}
          loading={false}
          rowKey={"itemId"}
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
        <DailyStandardItemSelectModalTable ref={standardItemTableRef} title={"添加标准项"} onEnter={handleAddStandardItem} />
        <DailyStandardSelectModalTable ref={standardTableRef} title={"添加标准中标准项"} onEnter={handleAddStandardItemsFromStandard} />
        <Modal title="处理结果" v-model:visible={resultModalVisible.value} width="800px" footer={null}>
          <ResultItem patrolResult={currentResultData.value} />
        </Modal>
      </>
    );
  },
});
