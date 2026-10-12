// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { getCurrentDailyType, initDailyTypeFromRoute } from "@g2-client/daily-task/client";
import { defineComponent, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import { UrgencyLevelEditModal } from "./urgency-level-edit-modal";
import { cubeDailyTaskService } from "@/api/server";
import { Button, Page, PopConfirm, PopOver, message } from "@/pc-ui-runtime";
import { PageLayout, usePcTable } from "@/pc-ui-runtime";
import { usePageName } from "@/utils/page-title";

export const UrgencyLevel = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const route = useRoute();
    initDailyTypeFromRoute(route);
    const tableCode = route.path.replaceAll("/", "");

    const columns = [
      {
        title: "优先级",
        dataIndex: "level",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: number }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "名称",
        dataIndex: "name",
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
    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode,
      rowKey: "id",
      fetchApi: async () =>
        cubeDailyTaskService.getUrgencyPage({
          pageSize: page.pageSize,
          pageNumber: page.pageNumber,
          dailyType: getCurrentDailyType(),
        }),
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });
    const handleChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      tableApi.query();
    };
    const editModalRef = ref<{ openModal: (record?: unknown) => void }>();
    const handleAdd = (): void => {
      editModalRef.value?.openModal();
    };
    const editRow = (record: unknown): void => {
      editModalRef.value?.openModal(record);
    };
    const deleteRow = async (id: string): Promise<void> => {
      try {
        await cubeDailyTaskService.deleteUrgency(id);
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
          <PcTable />
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handleChange} />
      ),
    };
    return (): JSX.Element => (
      <PageLayout title={pageTitle} v-slots={slots}>
        <UrgencyLevelEditModal
          ref={editModalRef}
          onEnter={() => {
            tableApi.query();
          }}
          title={pageTitle}
        />
      </PageLayout>
    );
  },
});
