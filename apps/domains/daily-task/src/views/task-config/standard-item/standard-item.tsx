// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { DailyTaskTargetCategoryOptions, getCurrentDailyType } from "@g2-client/daily-task/client";
import type { StandardItemModel } from "@g2-client/daily-task/client";
import { initDailyTypeFromRoute } from "@g2-client/daily-task/client";
import { defineComponent, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { cubeDailyTaskService } from "@/api/server";
import { Button, Page, PopConfirm, PopOver, message } from "@/pc-ui-runtime";
import { PageLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { usePageName } from "@/utils/page-title";

/** 标准项列表 */
export const StandardItem = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const route = useRoute();
    const router = useRouter();
    initDailyTypeFromRoute(route);
    const tableCode = route.path.replaceAll("/", "");
    const searchParams = reactive({
      pageNumber: 1,
      pageSize: 10,
      keyword: "",
      targetType: "",
      total: 0,
    });

    const searchFormSchema = [
      {
        component: "Select",
        label: "适用对象类型",
        fieldName: "targetType",
        defaultValue: null,
        componentProps: {
          placeholder: "适用对象类型",
          options: DailyTaskTargetCategoryOptions,
        },
      },
      {
        component: "Input",
        label: "",
        fieldName: "keyword",
        componentProps: {
          placeholder: "标准项名称",
        },
      },
    ];
    const [PcForm] = usePcForm({
      syncStateRef: searchParams,
      onHydratedQuery: () => {
        tableApi.query();
      },
      layout: "horizontal",
      handleSubmit: (data) => {
        searchParams.keyword = (data.keyword as string) ?? "";
        searchParams.targetType = (data.targetType as string) ?? "";
        searchParams.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        searchParams.keyword = "";
        searchParams.targetType = "";
        searchParams.pageNumber = 1;
        tableApi.query();
      },
      schema: searchFormSchema,
      showCollapseButton: true,
    });

    const columns = [
      {
        title: "标准项名称",
        dataIndex: "itemName",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "标准项内容",
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
          const text = record.resultLabelList.map((item) => item.label).join(" ");
          return <PopOver content={text || "--"}>{text || "--"}</PopOver>;
        },
      },
      {
        title: "适用对象",
        dataIndex: "targetTypes",
        ellipsis: true,
        align: "center",
        customRender: ({ record }: { record: StandardItemModel }): JSX.Element => {
          const text = record.targetTypes
            .map((item) => DailyTaskTargetCategoryOptions.find((option) => option.value === item)?.label || "--")
            .join("、");
          return <PopOver content={text || "--"}>{text || "--"}</PopOver>;
        },
      },
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
            <Button
              type="link"
              size="small"
              onClick={() => {
                detailRow(record.itemId);
              }}
            >
              详情
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => {
                editRow(record.itemId);
              }}
            >
              编辑
            </Button>
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
    ];
    const page = reactive({
      pageNumber: searchParams.pageNumber,
      pageSize: searchParams.pageSize,
      total: searchParams.total,
    });
    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode,
      rowKey: "id",
      fetchApi: async () => {
        const params = {
          pageNumber: searchParams.pageNumber,
          pageSize: searchParams.pageSize,
          dailyType: getCurrentDailyType(),
          itemName: searchParams.keyword ?? "",
          targetType: searchParams.targetType ?? "",
        };
        return cubeDailyTaskService.getStandardItemPage(params);
      },
      fetchLoaded: (data) => {
        page.total = data.total;
        searchParams.total = data.total;
        page.pageNumber = searchParams.pageNumber;
        page.pageSize = searchParams.pageSize;
      },
    });
    const handleChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      searchParams.pageNumber = pageNumber;
      searchParams.pageSize = pageSize;
      tableApi.query();
    };
    const handleAdd = (): void => {
      void router.push(`/d/daily-task/standard-item-form?type=add`);
    };
    const editRow = (id: string): void => {
      void router.push(`/d/daily-task/standard-item-form?type=edit&id=${id}`);
    };
    const detailRow = (id: string): void => {
      void router.push(`/d/daily-task/standard-item-form?type=detail&id=${id}`);
    };
    const deleteRow = async (id: string): Promise<void> => {
      try {
        await cubeDailyTaskService.deleteStandardItem(id);
        message.success("操作成功");
        tableApi.query();
      } catch (error) {
        message.error((error as { errorMessage: string })?.errorMessage ?? "操作失败");
      }
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
    return (): JSX.Element => <PageLayout title={pageTitle} v-slots={slots} />;
  },
});
