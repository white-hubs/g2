import { HazardActionCode, type HazardLedgerRecordVO } from "@g2-contract/hazard-governance";
import { defineComponent, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { renderHazardActionButtons } from "../shared/actions";
import { PageHeaderActions } from "../shared/components";
import type { HazardLevel, HazardSourceType, HazardStatus } from "../shared/data";
import {
  levelColor,
  levelOptions,
  levelText,
  normalizeHazardSourceType,
  normalizeHazardStatus,
  sourceTypeColor,
  sourceTypeOptions,
  sourceTypeText,
  statusColor,
  statusOptions,
  statusText,
} from "../shared/data";
import { createListPageStateFromQuery, syncListPageQuery } from "../shared/list";
import { pushByHistory, useLayoutTitle } from "../shared/page";
import { useHazardUrge } from "../shared/use-hazard-urge";
import { ConfirmHazardModal, type ConfirmHazardModalExpose } from "./components/confirm-hazard-modal";
import { CreateHazardModal, type CreateHazardModalExpose } from "./components/create-hazard-modal";
import { MisreportHazardModal, type MisreportHazardModalExpose } from "./components/misreport-hazard-modal";
import { useAuthRequest } from "@/api/request";
import { pageHazardLedger } from "@/api/server";
import { PageLayout as PcLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { Button, Page, PopOver, Space, Tag, message } from "@/pc-ui-runtime";
import type { ColumnType } from "@/pc-ui-runtime";
import { formatTime } from "@/utils/format-time";

import "./index.less";

const formatHoursToDays = (hours?: number): number => (hours && hours > 0 ? Math.ceil(hours / 24) : 0);

const normalizePeriod = (period: unknown): string[] => {
  if (Array.isArray(period)) {
    return period.map((item) => String(item)).filter(Boolean);
  }
  if (typeof period === "string") {
    return period.split(",").filter(Boolean);
  }
  return [];
};

const formatPeriod = (period: unknown): string => {
  const normalizedPeriod = normalizePeriod(period);
  const [startTime, endTime] = normalizedPeriod;
  return startTime && endTime ? `${startTime},${endTime}` : "";
};

const renderLevel = (level?: string): JSX.Element => {
  const normalizedLevel = level as HazardLevel | undefined;
  return (
    <Tag color={normalizedLevel ? levelColor[normalizedLevel] : undefined}>
      {normalizedLevel ? (levelText[normalizedLevel] ?? level) : "-"}
    </Tag>
  );
};

const renderGovernanceStatus = (governanceStatus?: string): JSX.Element => {
  const status = normalizeHazardStatus(governanceStatus);
  return <Tag color={status ? statusColor[status] : undefined}>{status ? statusText[status] : governanceStatus || "-"}</Tag>;
};

const renderSourceType = (sourceType?: string): JSX.Element => {
  const normalizedSourceType = normalizeHazardSourceType(sourceType);
  return (
    <Tag color={normalizedSourceType ? sourceTypeColor[normalizedSourceType] : undefined}>
      {normalizedSourceType ? sourceTypeText[normalizedSourceType] : sourceType || "-"}
    </Tag>
  );
};

export const HazardLedger = defineComponent({
  name: "HazardLedger",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const createHazardModalRef = ref<CreateHazardModalExpose>();
    const confirmHazardModalRef = ref<ConfirmHazardModalExpose>();
    const misreportHazardModalRef = ref<MisreportHazardModalExpose>();
    const search = reactive<{
      keyword: string;
      level: "" | HazardLevel;
      status: "" | HazardStatus;
      sourceType: "" | HazardSourceType;
      period: string[];
    }>({
      keyword: "",
      level: "",
      status: "",
      sourceType: "",
      period: [],
    });
    const page = reactive(createListPageStateFromQuery(route.query));
    const hazardUrge = useHazardUrge({
      onUrged: () => tableApi.query(),
    });

    const openDetail = (record: HazardLedgerRecordVO): void => {
      pushByHistory(router, { name: "hazard-ledger-detail", query: { id: record.id } });
    };

    const goFillDetail = (record: HazardLedgerRecordVO): void => {
      pushByHistory(router, { name: "rectification-form", query: { id: record.id } });
    };

    const goProgressDetail = (record: HazardLedgerRecordVO): void => {
      pushByHistory(router, { name: "rectification-progress", query: { id: record.id } });
    };

    const goApprovalDetail = (record: HazardLedgerRecordVO): void => {
      if (!record.approvalTaskId) {
        message.warning("缺少审批任务ID");
        return;
      }
      pushByHistory(router, { name: "approval-detail", query: { taskId: record.approvalTaskId } });
    };

    const goAcceptanceDetail = (record: HazardLedgerRecordVO): void => {
      pushByHistory(router, { name: "acceptance-detail", query: { id: record.id } });
    };

    const handleUrge = async (record: HazardLedgerRecordVO): Promise<void> => {
      await hazardUrge.urge(record.id);
    };

    const renderLedgerActions = (record: HazardLedgerRecordVO): JSX.Element | null =>
      renderHazardActionButtons(
        record,
        record.actions,
        {
          CONFIRM: () => confirmHazardModalRef.value?.openModal(record),
          FALSE_REPORT: () => misreportHazardModalRef.value?.openModal(record),
          FILL_PLAN: goFillDetail,
          UPDATE_PROGRESS: goProgressDetail,
          APPROVAL: goApprovalDetail,
          ACCEPTANCE: goAcceptanceDetail,
          URGE: (item) => void handleUrge(item),
          VIEW: openDetail,
        },
        {
          isLoading: (action, item) => action === HazardActionCode.URGE && hazardUrge.isUrging(item.id),
          isDisabled: (action, item) => action === HazardActionCode.URGE && hazardUrge.isUrging(item.id),
        },
      );

    const ledgerColumns: ColumnType[] = [
      {
        title: "隐患编号",
        dataIndex: "code",
        width: 170,
        align: "center",
        customRender: ({ record }: { record: HazardLedgerRecordVO }) => (
          <Button type="link" size="small" class="hazard-table-link" onClick={() => openDetail(record)}>
            {record.code || record.id}
          </Button>
        ),
      },
      {
        title: "隐患描述",
        dataIndex: "description",
        width: 250,
        align: "center",
        ellipsis: true,
      },
      {
        title: "等级",
        dataIndex: "level",
        width: 100,
        align: "center",
        customRender: ({ text }: { text?: string }) => renderLevel(text),
      },
      {
        title: "状态",
        dataIndex: "governanceStatus",
        width: 150,
        align: "center",
        customRender: ({ record }: { record: HazardLedgerRecordVO }) => (
          <Space size={6}>
            {renderGovernanceStatus(record.governanceStatus)}
            {record.overdue ? <Tag color="red">超{formatHoursToDays(record.overdueHours)}天</Tag> : null}
          </Space>
        ),
      },
      {
        title: "来源类型",
        dataIndex: "sourceType",
        width: 130,
        align: "center",
        customRender: ({ text }: { text?: string }) => renderSourceType(text),
      },
      {
        title: "整改责任人",
        dataIndex: "responsibleUserName",
        width: 100,
        align: "center",
        customRender: ({ record }: { record: HazardLedgerRecordVO }) => record.responsibleUserName ?? record.responsibleUserId ?? "-",
      },
      {
        title: "发现时间",
        dataIndex: "reportedTime",
        width: 150,
        align: "center",
        customRender: ({ text }: { text?: string }) => {
          const time = formatTime(text, "--");
          return <PopOver content={time}>{time}</PopOver>;
        },
      },
      {
        title: "操作",
        dataIndex: "action",
        width: 200,
        customRender: ({ record }: { record: HazardLedgerRecordVO }) => renderLedgerActions(record),
      },
    ];

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Select",
          label: "来源",
          fieldName: "sourceType",
          defaultValue: "",
          componentProps: { allowClear: true, options: sourceTypeOptions },
        },
        {
          component: "Select",
          label: "状态",
          fieldName: "status",
          defaultValue: "",
          componentProps: { allowClear: true, options: statusOptions.filter((v) => v.value !== "MISREPORTED") },
        },
        {
          component: "Select",
          label: "等级",
          fieldName: "level",
          defaultValue: "",
          componentProps: { allowClear: true, options: levelOptions },
        },
        {
          component: "RangePicker",
          label: "时间",
          fieldName: "period",
          componentProps: { valueFormat: "YYYY-MM-DD HH:mm:ss" },
        },
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          componentProps: { placeholder: "关键词搜索", allowClear: true },
        },
      ],
      syncStateRef: search,
      syncMap: (values) => ({
        keyword: (values.keyword as string | undefined) ?? "",
        sourceType: (values.sourceType as "" | HazardSourceType | undefined) ?? "",
        level: (values.level as "" | HazardLevel | undefined) ?? "",
        status: (values.status as "" | HazardStatus | undefined) ?? "",
        period: normalizePeriod(values.period),
      }),
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        search.sourceType = (values.sourceType as "" | HazardSourceType | undefined) ?? "";
        search.level = (values.level as "" | HazardLevel | undefined) ?? "";
        search.status = (values.status as "" | HazardStatus | undefined) ?? "";
        search.period = normalizePeriod(values.period);
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.sourceType = "";
        search.level = "";
        search.status = "";
        search.period = [];
        page.pageNumber = 1;
        tableApi.query();
      },
      showCollapseButton: true,
    });

    const fetchLedgerPage = async () => {
      const period = formatPeriod(search.period);
      const result = await useAuthRequest(() =>
        pageHazardLedger({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          ...(search.keyword ? { keyword: search.keyword } : {}),
          ...(search.sourceType ? { sourceType: search.sourceType } : {}),
          ...(search.level ? { level: search.level } : {}),
          ...(search.status ? { governanceStatus: search.status } : {}),
          ...(period ? { period } : {}),
        }),
      );
      return result;
    };

    const [PcTable, tableApi] = usePcTable({
      columns: ledgerColumns,
      tableCode: "HAZARD_LEDGER",
      rowKey: "id",
      fetchApi: fetchLedgerPage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
      rowClassName: (record: unknown) => ((record as Partial<HazardLedgerRecordVO>)?.overdue ? "hazard-row-overdue" : ""),
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      syncListPageQuery(router, route, pageNumber, pageSize);
      tableApi.query();
    };

    const slots = {
      "layout-header": () => <PageHeaderActions primary="新建隐患" onPrimary={() => createHazardModalRef.value?.openModal()} />,
      "layout-content": () => (
        <div class="hazard-stack hazard-table-page hazard-ledger">
          <PcForm />
          <PcTable />
          <CreateHazardModal ref={createHazardModalRef} onCreated={() => tableApi.query()} />
          <ConfirmHazardModal ref={confirmHazardModalRef} onConfirmed={() => tableApi.query()} />
          <MisreportHazardModal ref={misreportHazardModalRef} onMisreported={() => tableApi.query()} />
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("隐患台账")} v-slots={slots} />;
  },
});
