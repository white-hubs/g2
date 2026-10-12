// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import type { TaskResultModel } from "@g2-client/daily-task/client";
import { getCurrentDailyType, initDailyTypeFromRoute } from "@g2-client/daily-task/client";
import { defineComponent, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { TaskResultModal } from "./task-result-modal";
import { cubeDailyTaskService } from "@/api/server";
import { Button, Page, PopConfirm, PopOver, message } from "@/pc-ui-runtime";
import { PageLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { usePageName } from "@/utils/page-title";

export const TaskResult = defineComponent({
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
          placeholder: "结果名称",
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
        title: "结果名称",
        dataIndex: "name",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "结果项",
        ellipsis: true,
        align: "center",
        customRender: ({ record }: { record: TaskResultModel }): JSX.Element => (
          <PopOver content={record.resultLabelList.map((item) => item.label || "--").join("、") || "--"}>
            {record.resultLabelList.map((item) => item.label || "--").join("、") || "--"}
          </PopOver>
        ),
      },
      {
        dataIndex: "action",
        title: "操作",
        slots: {
          customRender: "action",
        },
        fixed: "right",
        width: 180,
        customRender: ({ record }: { record: TaskResultModel }): JSX.Element => (
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
    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode,
      rowKey: "id",
      fetchApi: async () => {
        const params = {
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          dailyType: getCurrentDailyType(),
          name: (formApi.formValues.keyword as string) ?? "",
        };
        return cubeDailyTaskService.getDailyTaskResultPage(params);
      },
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });
    const handleChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      tableApi.query();
    };
    const resultModalRef = ref<{ openModal: (record?: TaskResultModel) => void }>();
    const handleAdd = (): void => {
      resultModalRef.value?.openModal();
    };
    const editRow = (record: TaskResultModel): void => {
      resultModalRef.value?.openModal(record);
    };
    const deleteRow = async (id: string): Promise<void> => {
      try {
        await cubeDailyTaskService.deleteDailyTaskResult(id);
        message.success("操作成功");
        tableApi.query();
      } catch {}
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
    };
    return (): JSX.Element => (
      <PageLayout title={pageTitle} v-slots={slots}>
        <TaskResultModal
          ref={resultModalRef}
          title={pageTitle}
          onEnter={() => {
            tableApi.query();
          }}
        />
      </PageLayout>
    );
  },
});
