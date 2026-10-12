// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { type DailyTaskRelateModel, DailyTaskStatusOptions, DailyTaskTargetCategoryOptions } from "@g2-client/daily-task/client";
import { defineComponent, nextTick, reactive } from "vue";

import { cubeDailyTaskService } from "@/api/server";
import { Button, Input, PopOver, Select, Space } from "@/pc-ui-runtime";
import { usePcModal, usePcTable } from "@/pc-ui-runtime";

import styles from "./index.module.css";

interface Props {
  title: string;
  taskId: string;
}
/** 指派处理目标弹窗 */
export const AssignableTargetModal = defineComponent({
  props: ["title", "taskId"],
  emits: ["enter", "cancel"],
  setup(props: Props, { emit, expose }) {
    const [PcModal, modalApi] = usePcModal({
      title: `${props.title}`,
      width: "800px",
      onConfirm: async () => {
        emit("enter", (tableApi.getSelectedRows() as DailyTaskRelateModel[]) || []);
        modalApi.close();
      },
      onCancel: () => {
        emit("cancel");
        modalApi.close();
      },
    });
    const openModal = (keys?: string[]): void => {
      modalApi.open();
      void nextTick(() => {
        tableApi.setSelectedRowKeys(keys || []);
      });
    };
    expose({
      openModal,
    });

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
        current: 1, // 当前页码
        pageSize: 10, // 每页显示条数
        total: 0, // 总条数
        size: "default", // 分页组件大小
        showSizeChanger: true, // 是否允许改变每页显示条数
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
    });

    const modalSlots = {
      default: (): JSX.Element => (
        <>
          <Space>
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
          <div style={{ marginTop: "12px" }}>
            <TargetTable />
          </div>
        </>
      ),
    };
    return (): JSX.Element => <PcModal v-slots={modalSlots} />;
  },
});
