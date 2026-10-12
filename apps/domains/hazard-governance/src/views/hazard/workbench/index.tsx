import {
  HazardActionCode,
  HazardTodoType,
  type HazardLedgerRecordVO,
  type HazardTodoItemVO,
  type HazardTodoStatisticVO,
} from "@g2-contract/hazard-governance";
import { computed, defineComponent, onMounted, reactive, ref, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ConfirmHazardModal, type ConfirmHazardModalExpose } from "../ledger/components/confirm-hazard-modal";
import { MisreportHazardModal, type MisreportHazardModalExpose } from "../ledger/components/misreport-hazard-modal";
import { renderHazardActionButtons } from "../shared/actions";
import { StatCard } from "../shared/components";
import type { HazardLevel } from "../shared/data";
import { levelColor, levelOptions, levelText, normalizeHazardStatus, statusColor, statusText } from "../shared/data";
import { createListPageStateFromQuery, syncListPageQuery } from "../shared/list";
import { pushByHistory, useLayoutTitle } from "../shared/page";
import { useHazardUrge } from "../shared/use-hazard-urge";
import { useAuthRequest } from "@/api/request";
import { getHazardTodoStatistics, pageHazardTodoItems } from "@/api/server";
import { PageLayout as PcLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { Button, Card, Page, Space, Tag } from "@/pc-ui-runtime";
import { formatTime } from "@/utils/format-time";

import "./index.less";

const todoTypes: HazardTodoType[] = [
  HazardTodoType.PENDING_CONFIRM,
  HazardTodoType.PENDING_APPROVAL,
  HazardTodoType.PENDING_RECTIFICATION,
  HazardTodoType.PENDING_ACCEPTANCE,
];

const todoDefaults: Record<HazardTodoType, Required<Pick<HazardTodoStatisticVO, "todoType" | "label" | "queryValue">>> = {
  [HazardTodoType.PENDING_CONFIRM]: { todoType: HazardTodoType.PENDING_CONFIRM, label: "待确认", queryValue: "pending-confirm" },
  [HazardTodoType.PENDING_APPROVAL]: { todoType: HazardTodoType.PENDING_APPROVAL, label: "待审批", queryValue: "pending-approval" },
  [HazardTodoType.PENDING_RECTIFICATION]: {
    todoType: HazardTodoType.PENDING_RECTIFICATION,
    label: "待整改",
    queryValue: "pending-rectify",
  },
  [HazardTodoType.PENDING_ACCEPTANCE]: { todoType: HazardTodoType.PENDING_ACCEPTANCE, label: "待验收", queryValue: "pending-accept" },
};

const todoTones: Record<HazardTodoType, "orange" | "blue" | "red" | "green"> = {
  [HazardTodoType.PENDING_CONFIRM]: "orange",
  [HazardTodoType.PENDING_APPROVAL]: "blue",
  [HazardTodoType.PENDING_RECTIFICATION]: "red",
  [HazardTodoType.PENDING_ACCEPTANCE]: "green",
};

interface PageResultVo {
  total: number;
  pages: number;
  records: unknown[];
}
interface PcTableColumn {
  dataIndex?: string | string[];
  title?: unknown;
  [key: string]: unknown;
}
const statisticHint = (item: HazardTodoStatisticVO): string => {
  if ((item.overdueCount ?? 0) > 0) {
    return `${item.overdueCount} 条已超期`;
  }
  const time = item.earliestDeadline ?? item.earliestSubmittedTime;
  return time ? `最早 ${formatTime(time)}` : "暂无待处理事项";
};

const readTodoType = (value: unknown): HazardTodoType => {
  const raw = Array.isArray(value) ? value[0] : value;
  return todoTypes.includes(raw as HazardTodoType) ? (raw as HazardTodoType) : HazardTodoType.PENDING_CONFIRM;
};

const unwrapArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  const root = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const records = data.records ?? data.list ?? data.data;
  return Array.isArray(records) ? (records as T[]) : [];
};

const unwrapPage = (value: unknown): PageResultVo => {
  const root = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const records = unwrapArray<HazardTodoItemVO>(data);
  return { records, total: Number(data.total ?? records.length), pages: Number(data.pages ?? 1) };
};

export const HazardWorkbench = defineComponent({
  name: "HazardWorkbench",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const confirmHazardModalRef = ref<ConfirmHazardModalExpose>();
    const misreportHazardModalRef = ref<MisreportHazardModalExpose>();
    const active = shallowRef<HazardTodoType>(readTodoType(route.query.todoType));
    const statistics = ref<HazardTodoStatisticVO[]>([]);
    const search = reactive<{ keyword: string; level: "" | HazardLevel; ownOnly: boolean }>({
      keyword: "",
      level: "",
      ownOnly: true,
    });
    const page = reactive(createListPageStateFromQuery(route.query));
    const hazardUrge = useHazardUrge({
      onUrged: () => reloadTodo(),
    });
    const statisticMap = computed<Record<HazardTodoType, HazardTodoStatisticVO>>(() => {
      const result = Object.fromEntries(todoTypes.map((type) => [type, { ...todoDefaults[type], count: 0 }])) as Record<
        HazardTodoType,
        HazardTodoStatisticVO
      >;
      statistics.value.forEach((item) => {
        result[item.todoType] = { ...result[item.todoType], ...item };
      });
      return result;
    });

    const goLedgerDetail = (record: HazardTodoItemVO): void => {
      pushByHistory(router, { name: "hazard-ledger-detail", query: { id: record.hazardId } });
    };
    const goRectificationForm = (record: HazardTodoItemVO): void => {
      pushByHistory(router, { name: "rectification-form", query: { id: record.hazardId } });
    };
    const goRectificationProgress = (record: HazardTodoItemVO): void => {
      pushByHistory(router, { name: "rectification-progress", query: { id: record.hazardId } });
    };
    const goApprovalDetail = (record: HazardTodoItemVO): void => {
      pushByHistory(router, { name: "approval-detail", query: { taskId: record.approvalTaskId ?? record.hazardId } });
    };
    const goAcceptanceDetail = (record: HazardTodoItemVO): void => {
      pushByHistory(router, { name: "acceptance-detail", query: { id: record.hazardId } });
    };

    const handleUrge = async (record: HazardTodoItemVO): Promise<void> => {
      await hazardUrge.urge(record.hazardId);
    };

    const toLedgerRecord = (record: HazardTodoItemVO): HazardLedgerRecordVO => ({
      ...record,
      id: record.hazardId,
      reportedTime: record.submittedTime,
    });

    const reloadTodo = (): void => {
      void loadStatistics();
      tableApi.query();
    };

    const renderLevel = (level?: string) => {
      const normalized = level as HazardLevel | undefined;
      return <Tag color={normalized ? levelColor[normalized] : undefined}>{normalized ? (levelText[normalized] ?? level) : "-"}</Tag>;
    };

    const renderStatus = (value?: string) => {
      const status = normalizeHazardStatus(value);
      return <Tag color={status ? statusColor[status] : undefined}>{status ? statusText[status] : value || "-"}</Tag>;
    };

    const columns: PcTableColumn[] = [
      {
        title: "隐患编号",
        dataIndex: "code",
        align: "center",
        width: 200,
        customRender: ({ record }: { record: HazardTodoItemVO }) => (
          <Button type="link" size="small" onClick={() => goLedgerDetail(record)}>
            {record.code || record.hazardId}
          </Button>
        ),
      },
      { title: "隐患描述", dataIndex: "description", align: "center", ellipsis: true },
      { title: "等级", dataIndex: "level", align: "center", width: 130, customRender: ({ text }: { text?: string }) => renderLevel(text) },
      {
        title: "治理状态",
        dataIndex: "governanceStatus",
        align: "center",
        width: 130,
        customRender: ({ text }: { text?: string }) => renderStatus(text),
      },
      {
        title: "提交时间",
        dataIndex: "submittedTime",
        align: "center",
        width: 200,
        customRender: ({ text }: { text?: string }) => formatTime(text, "-"),
      },
      {
        title: "截止时间",
        dataIndex: "deadline",
        align: "center",
        width: 200,
        customRender: ({ record }: { record: HazardTodoItemVO }) => (
          <Space size={6}>
            <span>{formatTime(record.deadline, "-")}</span>
            {record.overdue ? <Tag color="red">超期 {record.overdueHours ?? 0}h</Tag> : null}
          </Space>
        ),
      },
      {
        title: "操作",
        dataIndex: "action",
        width: 250,
        customRender: ({ record }: { record: HazardTodoItemVO }) =>
          renderHazardActionButtons(
            record,
            record.actions,
            {
              CONFIRM: (item) => confirmHazardModalRef.value?.openModal(toLedgerRecord(item)),
              FALSE_REPORT: (item) => misreportHazardModalRef.value?.openModal(toLedgerRecord(item)),
              VIEW: goLedgerDetail,
              APPROVAL: goApprovalDetail,
              FILL_PLAN: goRectificationForm,
              UPDATE_PROGRESS: goRectificationProgress,
              ACCEPTANCE: goAcceptanceDetail,
              URGE: (item) => void handleUrge(item),
            },
            {
              isLoading: (action, item) => action === HazardActionCode.URGE && hazardUrge.isUrging(item.hazardId),
              isDisabled: (action, item) => action === HazardActionCode.URGE && hazardUrge.isUrging(item.hazardId),
            },
          ),
      },
    ];

    const loadStatistics = async (): Promise<void> => {
      statistics.value = unwrapArray<HazardTodoStatisticVO>(
        await useAuthRequest(() =>
          getHazardTodoStatistics({
            pageNumber: 1,
            pageSize: 10,
            ...(search.keyword ? { keyword: search.keyword } : {}),
            ...(search.level ? { level: search.level } : {}),
            ownOnly: search.ownOnly,
          }),
        ),
      );
    };

    const fetchTodoPage = async (): Promise<PageResultVo> =>
      unwrapPage(
        await useAuthRequest(() =>
          pageHazardTodoItems({
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            todoType: statisticMap.value[active.value].queryValue ?? todoDefaults[active.value].queryValue,
            ...(search.keyword ? { keyword: search.keyword } : {}),
            ...(search.level ? { level: search.level } : {}),
            ownOnly: search.ownOnly,
          }),
        ),
      );

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "HAZARD_WORKBENCH",
      rowKey: "hazardId",
      fetchApi: fetchTodoPage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

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
        { component: "Input", label: "", fieldName: "keyword", componentProps: { placeholder: "搜索编号或隐患描述", allowClear: true } },
      ],
      queryState: search,
      onHydratedQuery: () => {
        void loadStatistics();
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        search.level = (values.level as "" | HazardLevel | undefined) ?? "";
        page.pageNumber = 1;
        void loadStatistics();
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.level = "";
        page.pageNumber = 1;
        void loadStatistics();
        tableApi.query();
      },
    });

    const changeActive = (next: HazardTodoType): void => {
      active.value = next;
      page.pageNumber = 1;
      void router.replace({
        path: route.path,
        query: {
          ...route.query,
          todoType: next,
          pageNumber: "1",
        },
        hash: route.hash,
      });
      tableApi.query();
    };

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      syncListPageQuery(router, route, pageNumber, pageSize);
      tableApi.query();
    };

    onMounted(() => {
      void loadStatistics();
    });

    const slots = {
      "layout-content": () => (
        <div class="hazard-stack hazard-table-page hazard-workbench">
          <div class="hazard-stat-grid">
            {todoTypes.map((type) => {
              const item = statisticMap.value[type];
              return (
                <button
                  key={type}
                  class={["hazard-stat-button", active.value === type ? "hazard-stat-button-active" : ""].join(" ")}
                  onClick={() => changeActive(type)}
                >
                  <StatCard
                    label={item.label ?? todoDefaults[type].label}
                    value={item.count ?? 0}
                    hint={statisticHint(item)}
                    tone={todoTones[type]}
                  />
                </button>
              );
            })}
          </div>
          <PcForm />
          <Card class="table-card" title={statisticMap.value[active.value].label ?? todoDefaults[active.value].label}>
            <PcTable />
          </Card>
          <ConfirmHazardModal ref={confirmHazardModalRef} onConfirmed={reloadTodo} />
          <MisreportHazardModal ref={misreportHazardModalRef} onMisreported={reloadTodo} />
        </div>
      ),
      "footer-page": () => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          showQuickJumper={false}
          showSizeChanger
          showTotal={(total: number) => `共 ${total} 条数据`}
          pageSizeOptions={["10", "20", "50"]}
          onPageChange={handlePageChange}
        />
      ),
    };

    return () => <PcLayout title={useLayoutTitle("我的待办")} v-slots={slots} />;
  },
});
