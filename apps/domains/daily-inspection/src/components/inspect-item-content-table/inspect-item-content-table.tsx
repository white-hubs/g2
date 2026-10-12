// @ts-nocheck -- 从 cube InspectItemContentTable 迁入并适配 pc-ui。
import { computed, defineComponent, onMounted, reactive, ref, watch } from "vue";

import { InspectResultSelect } from "./inspect-result-select";
import { InspectTagSelect } from "./inspect-tag-select";
import type { InspectItemContent, InspectResultItem } from "./type";
import { useValidate } from "./use-validate";
import type { InspectBusinessTypeValue } from "@/compat/constants";
import { getDailyInspectionClient } from "@/domain-context";
import { Button, Input, PopConfirm, PopOver, Select, Switch, Table } from "@/pc-ui-runtime";

import styles from "./inspect-item-content-table.module.css";

interface Props {
  value: InspectItemContent[];
  readonly: boolean;
  scrollY: number;
  id?: string | undefined;
  action: "add" | "edit" | "detail";
  showAdd: boolean;
  businessType?: InspectBusinessTypeValue | string;
  isResultItem?: boolean;
  columnTitles?: Record<string, string>;
  columnWidths?: Record<string, number>;
  compactRowResultColumns?: boolean;
}

const migrateLegacyRecord = (record: InspectItemContent): void => {
  if (typeof record.imageResult === "string") {
    record.imageResult = record.imageResult ? record.imageResult.split(",") : undefined;
  }
  if (typeof record.remarkResult === "string") {
    record.remarkResult = record.remarkResult ? record.remarkResult.split(",") : undefined;
  }
};

const isResultItemEnabled = (value: unknown): boolean => {
  return value !== false && value !== "false" && value !== 0 && value !== "0";
};

/** 添加巡检项内容组件 */
export const InspectItemContentTable = defineComponent({
  name: "InspectItemContentTable",
  props: [
    "value",
    "readonly",
    "scrollY",
    "id",
    "action",
    "showAdd",
    "businessType",
    "isResultItem",
    "columnTitles",
    "columnWidths",
    "compactRowResultColumns",
  ],
  emits: ["update:value"],
  setup: (props: Props, { slots, emit, expose }) => {
    const dataSource = ref<InspectItemContent[]>(props.value ?? []);
    const {
      isValid,
      isResultItem: isResultItemRef,
      inspectItemContent,
      nameChange,
      itemTagChange,
      resultIdChange,
      resultItemValueChange,
      imageResultChange,
      remarkResultChange,
      validate,
    } = useValidate();
    const isResultItem = computed(() => props.isResultItem ?? true);
    const useRowResultItem = computed(() => props.isResultItem === undefined);
    const getRowIsResultItem = (record: InspectItemContent): boolean => {
      return useRowResultItem.value ? isResultItemEnabled(record.isResultItem) : isResultItem.value;
    };
    watch(
      isResultItem,
      (val, oldVal) => {
        isResultItemRef.value = val;
        if (oldVal === undefined) {
          return;
        }
        inspectItemContent.value.forEach((record) => {
          if (val === false && oldVal === true) {
            record.imageResult = undefined;
            record.remarkResult = undefined;
            record.imageResultError = false;
            record.imageResultErrorMsg = "";
            record.remarkResultError = false;
            record.remarkResultErrorMsg = "";
          }
          if (val === true && oldVal === false) {
            record.imageResult = undefined;
            record.remarkResult = undefined;
            record.imageResultError = false;
            record.imageResultErrorMsg = "";
            record.remarkResultError = false;
            record.remarkResultErrorMsg = "";
          }
        });
      },
      { immediate: true },
    );

    const initContent = (data: InspectItemContent[]): void => {
      dataSource.value = data;
      inspectItemContent.value = data;
      try {
        dataSource.value?.forEach((record) => {
          migrateLegacyRecord(record);
          if (getRowIsResultItem(record) && record.resultId) {
            handleChangeResultId(record.resultId, record as unknown as InspectResultItem, record);
          }
        });
      } catch {
        /* ignore hydrate errors */
      }
    };

    watch(
      () => props.value,
      () => {
        if (props.value) {
          initContent(props.value);
        }
      },
      { immediate: true },
    );

    const isEdit = computed(() => {
      return props.action !== "detail";
    });
    const resetRecordByResultMode = (record: InspectItemContent, checked: boolean): void => {
      record.isResultItem = checked;
      if (checked) {
        record.imageResult = undefined;
        record.remarkResult = undefined;
      } else {
        record.resultId = undefined;
        record.resultItemValue = undefined;
        record.imageResult = undefined;
        record.remarkResult = undefined;
        record.itemTag = undefined;
      }
      record.resultIdError = false;
      record.resultItemValueError = false;
      record.imageResultError = false;
      record.remarkResultError = false;
    };
    const curItem = ref<InspectItemContent>();
    const handleChangeResultId = (e: unknown, data: InspectResultItem, record: InspectItemContent): void => {
      const row = { ...record };
      curItem.value = row;
      const options = data?.options;
      record.options = options;
      record.resultItemValue = row.resultItemValue ?? options?.[0]?.itemValue;
      const errOptions = options?.filter((opt) => opt.errorFlag);
      record.errOptions = errOptions;
      record.imageResult = Array.isArray(row.imageResult) ? row.imageResult : (errOptions?.[0]?.itemValue?.split(",") ?? undefined);
      record.remarkResult = Array.isArray(row.remarkResult) ? row.remarkResult : (errOptions?.[0]?.itemValue?.split(",") ?? undefined);
      resultIdChange(e as string, record);
    };

    const inspectResultOptions = reactive<InspectResultItem[]>([]);
    const getInfo = async (): Promise<void> => {
      const params = props.businessType !== undefined ? { businessType: props.businessType } : {};
      const res = await getDailyInspectionClient().listResultOptions(params);
      inspectResultOptions.splice(
        0,
        inspectResultOptions.length,
        ...(res ?? []).map((e) => ({
          ...e,
          id: e.id ? String(e.id) : undefined,
          name: e.name ? String(e.name) : e.resultName ? String(e.resultName) : undefined,
          options: Array.isArray(e.options)
            ? e.options.map((opt: Record<string, unknown>) => ({
                itemName: String(opt.itemName ?? ""),
                itemValue: String(opt.itemValue ?? ""),
                errorFlag: Boolean(opt.errorFlag),
              }))
            : [],
        })),
      );
    };
    onMounted(() => {
      if (props.action === "detail") void getInfo();
    });

    const yesNoOptions = [
      { itemName: "是", itemValue: true },
      { itemName: "否", itemValue: false },
    ];
    const renderYesNoText = (value: boolean | undefined): string => {
      if (value === true) return "是";
      if (value === false) return "否";
      return "--";
    };

    const hiddenWhenResultItem: string[] = [];
    const hiddenWhenNotResultItem = ["resultId", "resultItemValue", "itemTag"];
    const getColumnTitle = (dataIndex: string, fallback: string): string => {
      return props.columnTitles?.[dataIndex] ?? fallback;
    };
    const getColumnWidth = (dataIndex: string, fallback: number): number => {
      return props.columnWidths?.[dataIndex] ?? fallback;
    };
    const resultItemColumn = {
      dataIndex: "isResultItem",
      title: getColumnTitle("isResultItem", "结果巡检项"),
      align: "center",
      width: getColumnWidth("isResultItem", 120),
      fixed: "left",
      customRender: ({ record }: { record: InspectItemContent }): JSX.Element => {
        return (
          <Switch
            checked={record.isResultItem}
            checkedChildren="开"
            unCheckedChildren="关"
            disabled={!isEdit.value}
            onChange={(checked: boolean) => {
              resetRecordByResultMode(record, Boolean(checked));
            }}
          />
        );
      },
    };
    const baseColumns = computed(() => [
      {
        dataIndex: "name",
        title: getColumnTitle("name", "内容描述"),
        align: "center",
        width: getColumnWidth("name", 240),
        fixed: "left",
        customRender: ({ record }: { record: InspectItemContent }): JSX.Element => {
          return (
            <div class={styles["input-wrap"]}>
              <>
                {!isEdit.value && <PopOver content={record.name ?? "--"}>{record.name ?? "--"}</PopOver>}
                {isEdit.value && (
                  <>
                    <Input
                      value={record.name}
                      placeholder="请输入内容描述"
                      maxlength={100}
                      onUpdate:value={(e: string) => {
                        record.name = e;
                        nameChange(e, record);
                      }}
                    />
                    {record.nameError && <span class={styles["error-msg"]}>{record.nameErrorMsg}</span>}
                  </>
                )}
              </>
            </div>
          );
        },
      },
      ...(useRowResultItem.value ? [resultItemColumn] : []),
      {
        dataIndex: "resultId",
        title: getColumnTitle("resultId", "巡检结果"),
        align: "center",
        width: getColumnWidth("resultId", 150),
        customRender: ({ record }: { record: InspectItemContent }): JSX.Element => {
          const textVal = inspectResultOptions?.find((opt) => record.resultId === opt.id)?.name;
          if (useRowResultItem.value && !getRowIsResultItem(record)) return <span>--</span>;
          return (
            <div class={styles["input-wrap"]}>
              <>
                {!isEdit.value && <PopOver content={textVal ?? "--"}>{textVal ?? "--"}</PopOver>}
                {isEdit.value && (
                  <>
                    <InspectResultSelect
                      value={record.resultId}
                      businessType={props.businessType}
                      disabled={!getRowIsResultItem(record)}
                      onUpdate:value={(ev: string) => {
                        record.resultId = ev;
                      }}
                      onChange={(ev: string, itemData: InspectResultItem) => {
                        handleChangeResultId(ev, itemData, record);
                      }}
                    />
                    {record.resultIdError && <span class={styles["error-msg"]}>{record.resultIdErrorMsg}</span>}
                  </>
                )}
              </>
            </div>
          );
        },
      },
      {
        dataIndex: "resultItemValue",
        title: getColumnTitle("resultItemValue", "默认结果"),
        align: "center",
        width: getColumnWidth("resultItemValue", 150),
        customRender: ({ record }: { record: InspectItemContent }): JSX.Element => {
          const list = inspectResultOptions.find((opt) => opt.id === record.resultId)?.options ?? [];
          const textVal = list
            ?.filter((opt) => record?.resultItemValue?.split(",")?.includes(opt.itemValue))
            .map((opt) => opt.itemName)
            .join(",");
          if (useRowResultItem.value && !getRowIsResultItem(record)) return <span>--</span>;
          return (
            <div class={styles["input-wrap"]}>
              <>
                {!isEdit.value && <PopOver content={textVal ?? "--"}>{textVal ?? "--"}</PopOver>}
                {isEdit.value && (
                  <>
                    <Select
                      value={record.resultItemValue}
                      disabled={!getRowIsResultItem(record)}
                      options={record.options}
                      fieldNames={{ label: "itemName", value: "itemValue" }}
                      onUpdate:value={(ev: string) => {
                        record.resultItemValue = ev;
                        resultItemValueChange(ev, record);
                      }}
                      placeholder="请选择默认结果"
                    />
                    {record.resultItemValueError && <span class={styles["error-msg"]}>{record.resultItemValueErrorMsg}</span>}
                  </>
                )}
              </>
            </div>
          );
        },
      },
      {
        dataIndex: "imageResult",
        title: getColumnTitle("imageResult", "以下巡检结果必须拍照"),
        align: "center",
        width: getColumnWidth("imageResult", 150),
        customRender: ({ record }: { record: InspectItemContent }): JSX.Element => {
          const rowIsResultItem = getRowIsResultItem(record);
          const list = inspectResultOptions.find((opt) => opt.id === record.resultId)?.options ?? [];
          const textVal = list
            ?.filter((opt) => Array.isArray(record?.imageResult) && record.imageResult.includes(opt.itemValue))
            .map((opt) => opt.itemName)
            .join(",");
          const booleanTextVal = renderYesNoText(typeof record.imageResult === "boolean" ? record.imageResult : undefined);
          return (
            <div class={styles["input-wrap"]}>
              <>
                {!isEdit.value && (
                  <PopOver content={rowIsResultItem ? textVal || "--" : booleanTextVal}>
                    {rowIsResultItem ? textVal || "--" : booleanTextVal}
                  </PopOver>
                )}
                {isEdit.value && rowIsResultItem && (
                  <>
                    <Select
                      value={record.imageResult}
                      mode="multiple"
                      options={record.options}
                      fieldNames={{ label: "itemName", value: "itemValue" }}
                      onUpdate:value={(ev: string[]) => {
                        record.imageResult = ev;
                        imageResultChange(ev, record);
                      }}
                      placeholder="请选择以下巡检结果必须拍照"
                    />
                    {record.imageResultError && <span class={styles["error-msg"]}>{record.imageResultErrorMsg}</span>}
                  </>
                )}
                {isEdit.value && !rowIsResultItem && (
                  <>
                    <Select
                      value={record.imageResult}
                      options={yesNoOptions}
                      fieldNames={{ label: "itemName", value: "itemValue" }}
                      onUpdate:value={(ev: boolean) => {
                        record.imageResult = ev;
                        imageResultChange(ev, record);
                      }}
                      placeholder="请选择以下巡检结果必须拍照"
                    />
                    {record.imageResultError && <span class={styles["error-msg"]}>{record.imageResultErrorMsg}</span>}
                  </>
                )}
              </>
            </div>
          );
        },
      },
      {
        dataIndex: "remarkResult",
        title: getColumnTitle("remarkResult", "以下巡检结果必须备注"),
        align: "center",
        width: getColumnWidth("remarkResult", 150),
        customRender: ({ record }: { record: InspectItemContent }): JSX.Element => {
          const rowIsResultItem = getRowIsResultItem(record);
          const list = inspectResultOptions.find((opt) => opt.id === record.resultId)?.options ?? [];
          const textVal = list
            ?.filter((opt) => Array.isArray(record?.remarkResult) && record.remarkResult.includes(opt.itemValue))
            .map((opt) => opt.itemName)
            .join(",");
          const booleanTextVal = renderYesNoText(typeof record.remarkResult === "boolean" ? record.remarkResult : undefined);
          return (
            <div class={styles["input-wrap"]}>
              <>
                {!isEdit.value && (
                  <PopOver content={rowIsResultItem ? textVal || "--" : booleanTextVal}>
                    {rowIsResultItem ? textVal || "--" : booleanTextVal}
                  </PopOver>
                )}
                {isEdit.value && rowIsResultItem && (
                  <>
                    <Select
                      value={record.remarkResult}
                      mode="multiple"
                      options={record.options}
                      fieldNames={{ label: "itemName", value: "itemValue" }}
                      onUpdate:value={(ev: string[]) => {
                        record.remarkResult = ev;
                        remarkResultChange(ev, record);
                      }}
                      placeholder="请选择以下巡检结果必须备注"
                    />
                    {record.remarkResultError && <span class={styles["error-msg"]}>{record.remarkResultErrorMsg}</span>}
                  </>
                )}
                {isEdit.value && !rowIsResultItem && (
                  <>
                    <Select
                      value={record.remarkResult}
                      options={yesNoOptions}
                      fieldNames={{ label: "itemName", value: "itemValue" }}
                      onUpdate:value={(ev: boolean) => {
                        record.remarkResult = ev;
                        remarkResultChange(ev, record);
                      }}
                      placeholder="请选择以下巡检结果必须备注"
                    />
                    {record.remarkResultError && <span class={styles["error-msg"]}>{record.remarkResultErrorMsg}</span>}
                  </>
                )}
              </>
            </div>
          );
        },
      },
      {
        dataIndex: "itemTag",
        title: getColumnTitle("itemTag", "标签"),
        align: "center",
        width: getColumnWidth("itemTag", 150),
        customRender: ({ record }: { record: InspectItemContent }): JSX.Element => {
          const textVal = [
            { value: "CHARGE", label: "违规充电" },
            { value: "PARKING", label: "违规停放" },
          ].find((opt) => record.itemTag === opt.value)?.label;
          if (useRowResultItem.value && !getRowIsResultItem(record)) return <span>--</span>;
          return (
            <div class={styles["input-wrap"]}>
              <>
                {!isEdit.value && <PopOver content={textVal ?? "--"}>{textVal ?? "--"}</PopOver>}
                {isEdit.value && (
                  <>
                    <InspectTagSelect
                      value={record.itemTag}
                      disabled={!getRowIsResultItem(record)}
                      onUpdate:value={(ev: string) => {
                        record.itemTag = ev;
                      }}
                      onChange={(ev: string) => {
                        itemTagChange(ev, record);
                      }}
                    />
                    {record.itemTagError && <span class={styles["error-msg"]}>{record.itemTagErrorMsg}</span>}
                  </>
                )}
              </>
            </div>
          );
        },
      },
    ]);
    const visibleColumns = computed(() => {
      if (useRowResultItem.value) {
        if (!props.compactRowResultColumns) return baseColumns.value;
        const visible = ["name", "isResultItem", "resultId", "resultItemValue", "imageResult", "remarkResult", "itemTag"];
        return baseColumns.value.filter((col) => visible.includes(col.dataIndex as string));
      }
      const hide = isResultItem.value ? hiddenWhenResultItem : hiddenWhenNotResultItem;
      return baseColumns.value.filter((col) => !hide.includes(col.dataIndex as string));
    });
    const tableColumns = computed(() => {
      const action =
        props.readonly || dataSource.value.length < 2
          ? []
          : [
              {
                title: "操作",
                dataIndex: "action",
                align: "center",
                width: getColumnWidth("action", 180),
                customRender: ({ index }: { index: number }): JSX.Element => {
                  return (
                    <>
                      <PopConfirm
                        title="确认删除该项？"
                        onConfirm={() => {
                          handleDeleteRow(index);
                        }}
                      >
                        <Button type="link" size="small" danger>
                          删除
                        </Button>
                      </PopConfirm>
                    </>
                  );
                },
              },
            ];
      return [...visibleColumns.value, ...action];
    });
    const tableScrollX = computed(() => {
      return tableColumns.value.reduce((total, col) => {
        const width = Number(col.width);
        return total + (Number.isFinite(width) ? width : 0);
      }, 0);
    });
    const handleDeleteRow = (index: number): void => {
      dataSource.value?.splice(index, 1);
      inspectItemContent.value = [...dataSource.value];
    };
    const addContent = (): void => {
      dataSource.value.push({
        id: `${Date.now()}`,
        name: undefined,
        resultId: undefined,
        resultItemValue: undefined,
        imageResult: undefined,
        remarkResult: undefined,
        itemTag: undefined,
        isResultItem: props.isResultItem ?? true,
        isEdit: true,
      });
      inspectItemContent.value = [...dataSource.value];
    };
    const checkData = async (): Promise<unknown> => {
      try {
        if (props.isResultItem !== undefined) {
          inspectItemContent.value.forEach((record) => {
            record.isResultItem = props.isResultItem;
          });
        }
        await validate();

        if (isValid.value) {
          emit("update:value", inspectItemContent.value);
          return Promise.resolve(inspectItemContent.value);
        }
        return Promise.reject(new Error("校验失败"));
      } catch (error) {
        return Promise.reject(error);
      }
    };
    expose({
      checkData,
      isValid,
      dataSource,
      addContent,
      initContent,
    });
    return (): JSX.Element => (
      <>
        <div class={styles["mb-16"]}>
          {props.showAdd && (
            <Button type="primary" onClick={addContent}>
              添加
            </Button>
          )}
          {slots.default?.()}
        </div>
        <div class={styles["stable-table"]}>
          <Table
            columns={tableColumns.value}
            dataSource={inspectItemContent.value}
            pagination={false}
            rowKey={(record: InspectItemContent) => String(record.id ?? Math.random())}
            scroll={{
              x: tableScrollX.value || undefined,
              y: props.scrollY || undefined,
            }}
          />
        </div>
      </>
    );
  },
});
