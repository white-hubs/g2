import { HazardActionCode, HazardGovernanceStatus, type HazardRectificationTaskVO } from "@g2-contract/hazard-governance";
import { defineComponent, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { renderHazardActionButtons } from "../shared/actions";
import type { HazardLevel, HazardStatus } from "../shared/data";
import { levelColor, levelOptions, levelText, normalizeHazardStatus, statusColor, statusOptions, statusText } from "../shared/data";
import { createListPageStateFromQuery, syncListPageQuery } from "../shared/list";
import { pushByHistory, useLayoutTitle } from "../shared/page";
import { useHazardUrge } from "../shared/use-hazard-urge";
import { useAuthRequest } from "@/api/request";
import { pageHazardRectificationTasks } from "@/api/server";
import { PageLayout as PcLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { Page, PopOver, Tag, message } from "@/pc-ui-runtime";
import type { ColumnType } from "@/pc-ui-runtime";
import { formatTime } from "@/utils/format-time";

import "./index.less";

type RectificationStatus = Exclude<HazardStatus, HazardGovernanceStatus.PENDING_CONFIRM>;

const renderValue = (value?: string | number): string => (value === undefined || value === "" ? "-" : String(value));

const renderGovernanceStatus = (value: string | undefined): JSX.Element => {
  const status = normalizeHazardStatus(value);
  return <Tag color={status ? statusColor[status] : undefined}>{status ? statusText[status] : value || "-"}</Tag>;
};

const renderLevel = (level?: string): JSX.Element => {
  const normalizedLevel = level as HazardLevel | undefined;
  return (
    <Tag color={normalizedLevel ? levelColor[normalizedLevel] : undefined}>
      {normalizedLevel ? (levelText[normalizedLevel] ?? level) : "-"}
    </Tag>
  );
};

export const RectificationTasks = defineComponent({
  name: "RectificationTasks",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const page = reactive(createListPageStateFromQuery(route.query));
    const search = reactive({
      keyword: "",
      status: "" as "" | RectificationStatus,
      level: "" as "" | HazardLevel,
    });
    const hazardUrge = useHazardUrge({
      onUrged: () => tableApi.query(),
    });

    const goPlanForm = (record: HazardRectificationTaskVO): void => {
      pushByHistory(router, { name: "rectification-form", query: { id: record.id, mode: "plan" } });
    };

    const goProgressForm = (record: HazardRectificationTaskVO): void => {
      pushByHistory(router, { name: "rectification-progress", query: { id: record.id } });
    };

    const goAcceptanceDetail = (record: HazardRectificationTaskVO): void => {
      pushByHistory(router, { name: "acceptance-detail", query: { id: record.id } });
    };

    const goApprovalDetail = (record: HazardRectificationTaskVO): void => {
      if (!record.approvalTaskId) {
        message.warning("缺少审批任务ID");
        return;
      }
      pushByHistory(router, { name: "approval-detail", query: { taskId: record.approvalTaskId } });
    };

    const goLedgerDetail = (record: HazardRectificationTaskVO): void => {
      pushByHistory(router, { name: "hazard-ledger-detail", query: { id: record.id } });
    };

    const handleUrge = async (record: HazardRectificationTaskVO): Promise<void> => {
      await hazardUrge.urge(record.id);
    };

    const renderRectificationActions = (record: HazardRectificationTaskVO): JSX.Element | null =>
      renderHazardActionButtons(
        record,
        record.actions,
        {
          FILL_PLAN: goPlanForm,
          UPDATE_PROGRESS: goProgressForm,
          APPROVAL: goApprovalDetail,
          ACCEPTANCE: goAcceptanceDetail,
          URGE: (item) => void handleUrge(item),
          VIEW: goLedgerDetail,
        },
        {
          isLoading: (action, item) => action === HazardActionCode.URGE && hazardUrge.isUrging(item.id),
          isDisabled: (action, item) => action === HazardActionCode.URGE && hazardUrge.isUrging(item.id),
        },
      );

    const columns: ColumnType[] = [
      { title: "隐患编号", dataIndex: "code", align: "center", width: 200 },
      { title: "描述", dataIndex: "description", align: "center", ellipsis: true },
      { title: "位置", dataIndex: "locationName", align: "center", width: 150 },
      {
        title: "类型",
        dataIndex: "typeName",
        align: "center",
        width: 140,
        customRender: ({ text }: { text?: string }) => renderValue(text),
      },
      { title: "等级", dataIndex: "level", align: "center", width: 100, customRender: ({ text }: { text?: string }) => renderLevel(text) },
      {
        title: "责任人",
        dataIndex: "responsibleUserName",
        align: "center",
        width: 130,
        customRender: ({ record }: { record: HazardRectificationTaskVO }) =>
          renderValue(record.responsibleUserName ?? record.responsibleUserId),
      },
      {
        title: "截止时间",
        dataIndex: "deadline",
        align: "center",
        width: 160,
        customRender: ({ text }: { text?: string }) => {
          const time = formatTime(text, "--");
          return <PopOver content={time}>{time}</PopOver>;
        },
      },
      {
        title: "状态",
        dataIndex: "governanceStatus",
        align: "center",
        width: 120,
        customRender: ({ text }: { text?: string }) => renderGovernanceStatus(text),
      },
      {
        title: "操作",
        dataIndex: "action",
        width: 200,
        customRender: ({ record }: { record: HazardRectificationTaskVO }) => renderRectificationActions(record),
      },
    ];

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Select",
          label: "状态",
          fieldName: "status",
          defaultValue: "",
          componentProps: {
            allowClear: true,
            options: statusOptions.filter((option) => option.value !== HazardGovernanceStatus.PENDING_CONFIRM),
          },
        },
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
          componentProps: { placeholder: "隐患编号/描述", allowClear: true },
        },
      ],
      syncStateRef: search,
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.status = (values.status as "" | RectificationStatus | undefined) ?? "";
        search.level = (values.level as "" | HazardLevel | undefined) ?? "";
        search.keyword = (values.keyword as string | undefined) ?? "";
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.status = "";
        search.level = "";
        search.keyword = "";
        page.pageNumber = 1;
        tableApi.query();
      },
      showCollapseButton: true,
    });

    const fetchRectificationPage = async () => {
      const result = await useAuthRequest(() =>
        pageHazardRectificationTasks({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          ownOnly: false,
          overdueFirst: true,
          ...(search.keyword ? { keyword: search.keyword } : {}),
          ...(search.level ? { level: search.level } : {}),
          ...(search.status ? { governanceStatus: search.status } : {}),
        }),
      );
      return result;
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "HAZARD_RECTIFICATION_TASKS",
      rowKey: "id",
      fetchApi: fetchRectificationPage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
      rowClassName: (record: unknown) => ((record as Partial<HazardRectificationTaskVO>)?.overdue ? "hazard-row-overdue" : ""),
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      syncListPageQuery(router, route, pageNumber, pageSize);
      tableApi.query();
    };

    const slots = {
      "layout-content": () => (
        <div class="hazard-stack hazard-table-page hazard-rectification-tasks">
          <PcForm />
          <PcTable />
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("整改任务")} v-slots={slots} />;
  },
});
