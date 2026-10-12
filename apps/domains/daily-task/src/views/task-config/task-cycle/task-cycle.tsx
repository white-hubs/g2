// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { getCurrentDailyType, initDailyTypeFromRoute } from "@g2-client/daily-task/client";
import { defineComponent, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { TaskCycleModal } from "./task-cycle-modal";
import { cubeDailyTaskService } from "@/api/server";
import { AntModal, Button, Page, PopConfirm, PopOver, message } from "@/pc-ui-runtime";
import { PageLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { usePageName } from "@/utils/page-title";

export const TaskCycle = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const route = useRoute();
    initDailyTypeFromRoute(route);
    const tableCode = route.path.replaceAll("/", "");

    const searchFormSchema = [
      {
        component: "Input",
        label: "",
        fieldName: "keyword",
        componentProps: {
          placeholder: "周期名称",
        },
      },
    ];
    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      handleSubmit: () => {
        tableApi.query();
      },
      handleReset: () => {
        tableApi.query();
      },
      schema: searchFormSchema,
      showCollapseButton: true,
    });

    const columns = [
      {
        title: "周期名称",
        dataIndex: "name",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "表达式",
        dataIndex: "cron",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "描述",
        dataIndex: "description",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        dataIndex: "action",
        title: "操作",
        slots: {
          customRender: "action",
        },
        fixed: "right",
        width: 180,
        customRender: ({ record }: { record: { id: string } }): JSX.Element => (
          <>
            <Button
              type="link"
              size="small"
              onClick={() => {
                editRow(record);
              }}
            >
              编辑
            </Button>
            <PopConfirm
              title="确认删除该项？"
              onConfirm={() => {
                deleteRow(record.id);
              }}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </PopConfirm>
          </>
        ),
      },
    ];
    const page = reactive({
      pageNumber: 1,
      pageSize: 10,
      total: 0,
    });
    const selectedRowKeys = ref<string[]>([]);
    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode,
      rowKey: "id",
      rowSelection: "checkbox",
      fetchApi: async () => {
        const params = {
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          dailyType: getCurrentDailyType(),
          name: (formApi.formValues.keyword as string) ?? "",
        };
        return cubeDailyTaskService.getTaskCyclePage(params);
      },
      fetchLoaded: (data) => {
        page.total = data.total;
      },
      rowSelectionChange: (keys) => {
        selectedRowKeys.value = keys as string[];
      },
    });
    const handleChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      tableApi.query();
    };
    const taskCycleModalRef = ref<{ openModal: (record?: unknown) => void }>();
    const handleAdd = (): void => {
      taskCycleModalRef.value?.openModal();
    };
    const editRow = (record: unknown): void => {
      taskCycleModalRef.value?.openModal(record);
    };
    const deleteRow = async (id: string): Promise<void> => {
      try {
        await cubeDailyTaskService.batchDeleteTaskCycle({ ids: [id] });
        message.success("操作成功");
        tableApi.query();
      } catch {}
    };
    const batchDeleteLoading = ref(false);
    const handleBatchDelete = (): void => {
      const ids = selectedRowKeys.value;
      if (ids.length === 0) {
        message.warning("请选择要删除的项");
        return;
      }
      AntModal.confirm({
        centered: true,
        content: "确定要删除当前选中?",
        async onOk() {
          try {
            batchDeleteLoading.value = true;
            await cubeDailyTaskService.batchDeleteTaskCycle({ ids });
            selectedRowKeys.value = [];
            tableApi.setSelectedRowKeys([]);
            message.success("操作成功");
            tableApi.query();
          } catch {
          } finally {
            AntModal.destroyAll();
            batchDeleteLoading.value = false;
          }
        },
        onCancel() {
          AntModal.destroyAll();
        },
      });
    };
    const slots = {
      "layout-header": (): JSX.Element => (
        <Button type="primary" onClick={handleAdd}>
          新增
        </Button>
      ),
      "layout-content": (): JSX.Element => (
        <div>
          <PcForm />
          <PcTable />
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handleChange} />
      ),
      "footer-btn": (): JSX.Element => (
        <>
          <span style={{ marginRight: "16px" }}>已选 {selectedRowKeys.value.length} 项</span>
          <Button
            disabled={selectedRowKeys.value.length === 0}
            type="primary"
            danger
            loading={batchDeleteLoading.value}
            onClick={handleBatchDelete}
          >
            批量删除
          </Button>
        </>
      ),
    };
    return (): JSX.Element => (
      <PageLayout title={pageTitle} v-slots={slots}>
        <TaskCycleModal
          ref={taskCycleModalRef}
          title={pageTitle}
          onEnter={() => {
            tableApi.query();
          }}
        />
      </PageLayout>
    );
  },
});
