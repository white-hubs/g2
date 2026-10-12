import type { HazardAcceptanceTaskPageVO } from "@g2-contract/hazard-governance";
import { defineComponent, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { renderHazardActionButtons } from "../shared/actions";
import type { HazardLevel } from "../shared/data";
import { levelColor, levelOptions, levelText } from "../shared/data";
import { createListPageStateFromQuery, syncListPageQuery } from "../shared/list";
import { pushByHistory, useLayoutTitle } from "../shared/page";
import { useAuthRequest } from "@/api/request";
import { pageHazardAcceptanceTasks } from "@/api/server";
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

export const AcceptanceList = defineComponent({
  name: "AcceptanceList",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const page = reactive(createListPageStateFromQuery(route.query));
    const search = reactive({
      keyword: "",
      level: "" as "" | HazardLevel,
    });

    const columns: ColumnType[] = [
      { title: "隐患编号", dataIndex: "code", align: "center", width: 180 },
      { title: "隐患描述", dataIndex: "description", align: "center", ellipsis: true },
      {
        title: "等级",
        dataIndex: "level",
        align: "center",
        width: 100,
        customRender: ({ text }: { text?: string }) => renderLevel(text),
      },
      {
        title: "整改责任人",
        dataIndex: "responsibleUserName",
        align: "center",
        width: 130,
        customRender: ({ record }: { record: HazardAcceptanceTaskPageVO }) =>
          renderValue(record.responsibleUserName ?? record.responsibleUserId),
      },
      {
        title: "验收人",
        dataIndex: "acceptanceUserName",
        align: "center",
        width: 120,
        customRender: ({ record }: { record: HazardAcceptanceTaskPageVO }) =>
          renderValue(record.acceptanceUserName ?? record.acceptanceUserId),
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
        width: 160,
        customRender: ({ text }: { text?: string | number }) => formatTime(text),
      },
      {
        title: "剩余小时",
        dataIndex: "remainingHours",
        align: "center",
        width: 100,
        customRender: ({ text }: { text?: number }) => renderValue(text),
      },
      {
        title: "操作",
        dataIndex: "action",
        align: "center",
        width: 160,
        customRender: ({ record }: { record: HazardAcceptanceTaskPageVO }) =>
          renderHazardActionButtons(record, record.actions, {
            ACCEPTANCE: () => pushByHistory(router, { name: "acceptance-detail", query: { id: record.id } }),
            VIEW: () => pushByHistory(router, { name: "acceptance-detail", query: { id: record.id } }),
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
          componentProps: { placeholder: "隐患编号/描述/责任人", allowClear: true },
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

    const fetchAcceptancePage = async () => {
      const result = await useAuthRequest(() =>
        pageHazardAcceptanceTasks({
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
      tableCode: "HAZARD_ACCEPTANCE_LIST",
      rowKey: "id",
      fetchApi: fetchAcceptancePage,
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
        <div class="hazard-stack hazard-table-page hazard-acceptance-list">
          <PcForm />
          <PcTable />
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("验收列表")} v-slots={slots} />;
  },
});
