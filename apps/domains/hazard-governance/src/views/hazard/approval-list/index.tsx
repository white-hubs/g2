import type { HazardApprovalTaskPageVO } from "@g2-contract/hazard-governance";
import { defineComponent, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { renderHazardActionButtons } from "../shared/actions";
import type { HazardLevel } from "../shared/data";
import { levelColor, levelOptions, levelText } from "../shared/data";
import { createListPageStateFromQuery, syncListPageQuery } from "../shared/list";
import { pushByHistory, useLayoutTitle } from "../shared/page";
import { useAuthRequest } from "@/api/request";
import { pageHazardApprovalTasks } from "@/api/server";
import { PageLayout as PcLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { Page, Tag } from "@/pc-ui-runtime";
import type { ColumnType } from "@/pc-ui-runtime";
import { formatTime } from "@/utils/format-time";

import "./index.less";

const renderValue = (value?: string | number): string => (value === undefined || value === "" ? "-" : String(value));

const renderLevel = (level?: string): JSX.Element => {
  const normalizedLevel = level as HazardLevel | undefined;
  return (
    <Tag color={normalizedLevel ? levelColor[normalizedLevel] : undefined}>
      {normalizedLevel ? (levelText[normalizedLevel] ?? level) : "-"}
    </Tag>
  );
};

export const ApprovalList = defineComponent({
  name: "ApprovalList",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const page = reactive(createListPageStateFromQuery(route.query));
    const search = reactive({
      keyword: "",
      level: "" as "" | HazardLevel,
    });
    const columns: ColumnType[] = [
      { title: "隐患编号", dataIndex: "code", align: "center", width: 200 },
      { title: "隐患描述", dataIndex: "description", align: "center", ellipsis: true },
      {
        title: "等级",
        dataIndex: "level",
        align: "center",
        width: 100,
        customRender: ({ text }: { text?: string }) => renderLevel(text),
      },
      {
        title: "提交人",
        dataIndex: "submittedByName",
        align: "center",
        width: 100,
        customRender: ({ record }: { record: HazardApprovalTaskPageVO }) => renderValue(record.submittedByName ?? record.submittedBy),
      },
      {
        title: "提交时间",
        dataIndex: "submittedTime",
        align: "center",
        width: 160,
        customRender: ({ text }: { text?: string | number }) => formatTime(text),
      },
      {
        title: "截止时间",
        dataIndex: "deadline",
        align: "center",
        width: 150,
        customRender: ({ text }: { text?: string | number }) => formatTime(text),
      },
      {
        title: "操作",
        dataIndex: "action",
        width: 200,
        customRender: ({ record }: { record: HazardApprovalTaskPageVO }) =>
          renderHazardActionButtons(record, record.actions, {
            APPROVAL: () => pushByHistory(router, { name: "approval-detail", query: { taskId: record.approvalTaskId } }),
            VIEW: () => pushByHistory(router, { name: "approval-detail", query: { taskId: record.approvalTaskId } }),
          }),
      },
    ];

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Select",
          label: "等级",
          fieldName: "level",
          defaultValue: "",
          componentProps: { allowClear: true, options: levelOptions },
        },
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          componentProps: { placeholder: "方案标题/提交人/节点", allowClear: true },
        },
      ],
      syncStateRef: search,
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.level = (values.level as "" | HazardLevel | undefined) ?? "";
        search.keyword = (values.keyword as string | undefined) ?? "";
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.level = "";
        search.keyword = "";
        page.pageNumber = 1;
        tableApi.query();
      },
      showCollapseButton: true,
    });

    const fetchApprovalPage = async () => {
      const result = await useAuthRequest(() =>
        pageHazardApprovalTasks({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          ownOnly: false,
          ...(search.keyword ? { keyword: search.keyword } : {}),
          ...(search.level ? { level: search.level } : {}),
        }),
      );
      return result;
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "HAZARD_APPROVAL_LIST",
      rowKey: "approvalTaskId",
      fetchApi: fetchApprovalPage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      syncListPageQuery(router, route, pageNumber, pageSize);
      tableApi.query();
    };

    const slots = {
      "layout-content": () => (
        <div class="hazard-stack hazard-table-page hazard-approval-list">
          <PcForm />
          <PcTable />
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("审批列表")} v-slots={slots} />;
  },
});
