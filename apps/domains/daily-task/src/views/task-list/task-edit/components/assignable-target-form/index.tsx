// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { type DailyTaskRelateModel, DailyTaskStatusOptions, DailyTaskTargetCategoryOptions } from "@g2-client/daily-task/client";
import { defineComponent, reactive, watch } from "vue";

import { cubeDailyTaskService } from "@/api/server";
import { Button, Input, PopOver, Select, Space } from "@/pc-ui-runtime";
import { usePcTable } from "@/pc-ui-runtime";

import styles from "./index.module.css";

interface Props {
  taskId: string;
  selectedKeys?: string[];
  onSelectionChange?: (selectedRows: DailyTaskRelateModel[]) => void;
}

/** 指派处理目标表单组件 */
export const AssignableTargetForm = defineComponent({
  props: ["taskId", "selectedKeys", "onSelectionChange"],
  setup(props: Props) {
    const columns = [
      {
        title: "对象名称",
        dataIndex: "targetName",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "对象类型",
        dataIndex: "targetType",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => {
          const targetTypeName = DailyTaskTargetCategoryOptions.find((item) => item.value === text)?.label || "--";
          return <PopOver content={text || "--"}>{targetTypeName || "--"}</PopOver>;
        },
      },
      {
        title: "状态",
        dataIndex: "status",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => {
          const statusName = DailyTaskStatusOptions[text as keyof typeof DailyTaskStatusOptions] || "--";
          return <PopOver content={statusName || "--"}>{statusName || "--"}</PopOver>;
        },
      },
    ];

    const state = reactive({
      keyword: "",
      targetType: "",
    });

    const [TargetTable, tableApi] = usePcTable({
      columns,
      rowSelection: "checkbox",
      rowKey: "id",
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        size: "default",
        showSizeChanger: true,
        showTotal: (total: number) => `总共 ${total} 条数据`,
        onChange: (current: number, pageSize: number) => {
          tableApi.setState({
            pagination: {
              ...(tableApi.state.pagination as unknown as Record<string, unknown>),
              pageSize,
              current,
            },
          });
          tableApi.query();
        },
      },
      fetchApi: async (params?: Record<string, unknown>) =>
        cubeDailyTaskService.getDailyTaskRelatePage({
          pageSize: (params?.pageSize as number) || 10,
          pageNumber: (params?.current as number) || 1,
          allowAssign: true,
          taskId: props.taskId ?? "",
          keyword: state.keyword ?? "",
          targetType: state.targetType ?? "",
        }),
      getCheckboxProps: (record: Record<string, unknown>) => {
        const isDisabled = (!record?.allowAssign as boolean) || false;
        return {
          disabled: isDisabled,
        };
      },
      rowSelectionChange: (selectedRowKeys: unknown[], selectedRows: unknown[]) => {
        // SelectedRowKeys 未使用，但需要保持函数签名一致
        void selectedRowKeys;
        if (props.onSelectionChange) {
          props.onSelectionChange(selectedRows as DailyTaskRelateModel[]);
        }
      },
    });

    // 监听 selectedKeys 变化，更新表格选中状态
    watch(
      () => props.selectedKeys,
      (newKeys) => {
        if (newKeys && newKeys.length > 0) {
          tableApi.setSelectedRowKeys(newKeys);
        }
      },
      { immediate: true },
    );

    return (): JSX.Element => (
      <div class={styles.formContainer}>
        <Space class={styles.searchBar}>
          <Input v-model:value={state.keyword} placeholder="名称" />
          <Select
            v-model:value={state.targetType}
            placeholder="适用对象类型"
            allowClear={true}
            options={DailyTaskTargetCategoryOptions}
            class={styles["wide-select"]}
          />
          <Button
            type="primary"
            onClick={() => {
              tableApi.resetFetch();
            }}
          >
            搜索
          </Button>
          <Button
            onClick={() => {
              state.keyword = "";
              state.targetType = "";
              tableApi.resetFetch();
            }}
          >
            重置
          </Button>
        </Space>
        <div class={styles.tableContainer}>
          <TargetTable />
        </div>
      </div>
    );
  },
});
