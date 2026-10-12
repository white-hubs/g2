import type {
  HazardAcceptanceRootCauseCode,
  HazardRepeatedRectificationPageVO,
  HazardRepeatedRectificationStatus,
  HazardRepeatedRectificationSummaryVO,
} from "@g2-contract/hazard-governance";
import { computed, defineComponent, reactive, shallowRef } from "vue";
import type { VNodeChild } from "vue";
import { useRoute, useRouter } from "vue-router";

import { HazardCategoryCascader } from "../components/hazard-category-cascader";
import { rootCauseTagOptions } from "../shared/data";
import { createListPageStateFromQuery, syncListPageQuery } from "../shared/list";
import { pushByHistory, useLayoutTitle } from "../shared/page";
import { useAuthRequest } from "@/api/request";
import { getHazardRepeatedRectificationSummary, pageHazardRepeatedRectifications } from "@/api/server";
import { PageLayout as PcLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { Button, Page, Tag } from "@/pc-ui-runtime";
import type { ColumnType } from "@/pc-ui-runtime";
import { formatTime } from "@/utils/format-time";

import "./index.less";

type RootCauseTab = HazardRepeatedRectificationStatus;

const statusOptions: Array<{ label: string; value: RootCauseTab }> = [
  { label: "屡改屡犯中", value: "ACTIVE" },
  { label: "已关闭", value: "CLOSED" },
];

const windowOptions = [
  { label: "本月", value: 30 },
  { label: "近90天", value: 90 },
  { label: "近180天", value: 180 },
];

const statusTagColor: Record<string, string> = {
  WATCH: "warning",
  IMPORTANT: "orange",
  HIGH_REPEAT: "red",
};

const rootCauseColor: Record<string, string> = {
  MANAGEMENT_DEFECT: "blue",
  SYSTEM_DEFICIENCY: "cyan",
  EQUIPMENT_AGING: "orange",
  TRAINING_INSUFFICIENT: "purple",
  DESIGN_DEFECT: "magenta",
  FORCE_MAJEURE: "default",
  HUMAN_VIOLATION: "red",
};

const formatDate = (value?: string): string => formatTime(value, "-").slice(0, 10);

const renderRootCause = (record: HazardRepeatedRectificationPageVO): VNodeChild => {
  if (!record.finalRootCauseName && !record.finalRootCauseCode) return "-";
  return (
    <Tag color={rootCauseColor[String(record.finalRootCauseCode ?? "")]}>{record.finalRootCauseName ?? record.finalRootCauseCode}</Tag>
  );
};

const renderRiskObject = (record: HazardRepeatedRectificationPageVO, onOpen: () => void): VNodeChild => (
  <Button type="link" size="small" onClick={onOpen} class="hazard-root-cause-object-link">
    {record.riskObjectName || "-"}
    {record.riskUnitName ? <span>（{record.riskUnitName}）</span> : null}
  </Button>
);

const centerColumns = (columns: ColumnType[]): ColumnType[] => columns.map((column) => ({ ...column, align: "center" }));

const readRootCauseStatus = (value: unknown): RootCauseTab => {
  const raw = Array.isArray(value) ? value[0] : value;
  return statusOptions.some((item) => item.value === raw) ? (raw as RootCauseTab) : "ACTIVE";
};

const normalizeCategoryPath = (value: unknown): Array<string | number> => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string | number => typeof item === "string" || typeof item === "number");
  }
  if (typeof value === "string") {
    return value.split(",").filter(Boolean);
  }
  return [];
};

const normalizeDays = (value: unknown): number => {
  const days = Number(value ?? 30);
  return Number.isFinite(days) ? days : 30;
};

export const RootCauseList = defineComponent({
  name: "RootCauseList",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const page = reactive(createListPageStateFromQuery(route.query));
    const summary = shallowRef<HazardRepeatedRectificationSummaryVO>({});
    const search = reactive<{
      status: RootCauseTab;
      categoryId: string | number | undefined;
      categoryPath: Array<string | number>;
      rootCauseCode: string | undefined;
      keyword: string;
      days: number;
    }>({
      status: readRootCauseStatus(route.query.status),
      categoryId: undefined,
      categoryPath: [],
      rootCauseCode: undefined,
      keyword: "",
      days: 30,
    });

    const activeStatusLabel = computed(() => statusOptions.find((item) => item.value === search.status)?.label ?? "");

    const buildParams = () => ({
      pageNumber: page.pageNumber,
      pageSize: page.pageSize,
      status: search.status,
      days: search.days,
      ...(search.categoryId ? { categoryId: search.categoryId } : {}),
      ...(search.rootCauseCode ? { rootCauseCode: search.rootCauseCode as HazardAcceptanceRootCauseCode } : {}),
      ...(search.keyword ? { keyword: search.keyword } : {}),
    });

    const openDetail = (record: HazardRepeatedRectificationPageVO): void => {
      if (!record.id) return;
      pushByHistory(router, {
        name: "root-cause-detail",
        query: {
          id: record.id,
          status: search.status,
          days: search.days,
          pageNumber: 1,
          pageSize: 1000,
        },
      });
    };

    const createActiveColumns = (): ColumnType[] =>
      centerColumns([
        {
          title: "风险对象",
          dataIndex: "riskObjectName",
          width: 260,
          customRender: ({ record }: { record: HazardRepeatedRectificationPageVO }) => renderRiskObject(record, () => openDetail(record)),
        },
        {
          title: "隐患类型",
          dataIndex: "categoryName",
          width: 170,
          customRender: ({ record }: { record: HazardRepeatedRectificationPageVO }) =>
            record.categoryName ? <Tag color="orange">{record.categoryName}</Tag> : "-",
        },
        {
          title: `近${search.days}天次数`,
          dataIndex: "currentRecurrenceCount",
          width: 130,
          customRender: ({ text }: { text?: number }) => <span class="hazard-root-cause-count">{text ?? 0}次</span>,
        },
        {
          title: "平均复发天数",
          dataIndex: "averageRecurrenceDays",
          width: 150,
          customRender: ({ text }: { text?: number }) => (text == null ? "-" : `${text}天`),
        },
        {
          title: "最近发生时间",
          dataIndex: "latestHazardClosedTime",
          width: 170,
          customRender: ({ text }: { text?: string }) => formatDate(text),
        },
        {
          title: "状态标签",
          dataIndex: "statusTagName",
          width: 150,
          customRender: ({ record }: { record: HazardRepeatedRectificationPageVO }) =>
            record.statusTagName ? <Tag color={statusTagColor[String(record.statusTag ?? "")]}>{record.statusTagName}</Tag> : "-",
        },
        {
          title: "裁定状态",
          dataIndex: "finalRootCauseName",
          width: 180,
          customRender: ({ record }: { record: HazardRepeatedRectificationPageVO }) => renderRootCause(record),
        },
      ]);

    const createClosedColumns = (): ColumnType[] =>
      centerColumns([
        {
          title: "风险对象",
          dataIndex: "riskObjectName",
          width: 300,
          customRender: ({ record }: { record: HazardRepeatedRectificationPageVO }) => renderRiskObject(record, () => openDetail(record)),
        },
        {
          title: "隐患类型",
          dataIndex: "categoryName",
          width: 180,
          customRender: ({ record }: { record: HazardRepeatedRectificationPageVO }) =>
            record.categoryName ? <Tag color="orange">{record.categoryName}</Tag> : "-",
        },
        {
          title: "历史最高复发",
          dataIndex: "maxRecurrenceCount",
          width: 150,
          customRender: ({ text }: { text?: number }) => `${text ?? 0}次`,
        },
        {
          title: "关闭时间",
          dataIndex: "latestHazardClosedTime",
          width: 170,
          customRender: ({ text }: { text?: string }) => formatDate(text),
        },
        {
          title: "裁定状态",
          dataIndex: "finalRootCauseName",
          width: 190,
          customRender: ({ record }: { record: HazardRepeatedRectificationPageVO }) => renderRootCause(record),
        },
      ]);

    const createColumns = (): ColumnType[] => (search.status === "ACTIVE" ? createActiveColumns() : createClosedColumns());

    const queryTable = (): void => {
      tableApi.setColumns(createColumns());
      tableApi.query();
    };

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: HazardCategoryCascader,
          label: "",
          fieldName: "categoryPath",
          defaultValue: [],
          componentProps: { placeholder: "全部隐患类型", allowClear: true },
        },
        {
          component: "Select",
          label: "",
          fieldName: "days",
          defaultValue: 30,
          componentProps: {
            options: windowOptions,
            style: { display: search.status === "CLOSED" ? undefined : "none" },
          },
        },
        {
          component: "Select",
          label: "",
          fieldName: "rootCauseCode",
          componentProps: {
            placeholder: "全部裁定状态",
            allowClear: true,
            options: rootCauseTagOptions,
          },
        },
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          componentProps: { placeholder: "搜索风险对象", allowClear: true },
        },
      ],
      syncStateRef: search,
      syncMap: (values) => {
        const categoryPath = normalizeCategoryPath(values.categoryPath);
        return {
          categoryPath,
          categoryId: categoryPath.at(-1),
          rootCauseCode: (values.rootCauseCode as string | undefined) || undefined,
          keyword: (values.keyword as string | undefined) ?? "",
          days: normalizeDays(values.days),
        };
      },
      onHydratedQuery: () => {
        queryTable();
      },
      handleSubmit: (values) => {
        const categoryPath = normalizeCategoryPath(values.categoryPath);
        search.categoryPath = categoryPath;
        search.categoryId = categoryPath.at(-1) ?? undefined;
        search.rootCauseCode = (values.rootCauseCode as string | undefined) || undefined;
        search.keyword = (values.keyword as string | undefined) ?? "";
        search.days = normalizeDays(values.days);
        page.pageNumber = 1;
        queryTable();
      },
      handleReset: () => {
        search.categoryPath = [];
        search.categoryId = undefined;
        search.rootCauseCode = undefined;
        search.keyword = "";
        search.days = 30;
        page.pageNumber = 1;
        queryTable();
      },
    });

    const [PcTable, tableApi] = usePcTable({
      columns: createColumns(),
      tableCode: "HAZARD_REPEATED_RECTIFICATION_LIST",
      rowKey: "id",
      fetchApi: async () => {
        const params = buildParams();
        const [summaryResult, pageResult] = await Promise.all([
          useAuthRequest(() => getHazardRepeatedRectificationSummary(params)),
          useAuthRequest(() => pageHazardRepeatedRectifications(params)),
        ]);
        summary.value = summaryResult;
        return pageResult;
      },
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const handleStatusChange = (status: RootCauseTab): void => {
      if (search.status === status) return;
      search.status = status;
      page.pageNumber = 1;
      void router.replace({
        path: route.path,
        query: {
          ...route.query,
          status,
          pageNumber: "1",
        },
        hash: route.hash,
      });
      queryTable();
    };

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      syncListPageQuery(router, route, pageNumber, pageSize);
      tableApi.query();
    };

    const slots = {
      "layout-content": () => (
        <div class="hazard-root-cause-list">
          <section class="hazard-root-cause-summary">
            <div class="hazard-root-cause-summary-title">屡改屡犯对象</div>
            <div class="hazard-root-cause-summary-body">
              <div class="hazard-root-cause-summary-item">
                <span>总数</span>
                <strong class="is-red">{summary.value.activeTotal ?? 0}</strong>
                <em>当前在复发</em>
              </div>
              <div class="hazard-root-cause-summary-item">
                <span>本月新增</span>
                <strong class="is-orange">{summary.value.currentMonthNewTotal ?? 0}</strong>
                <em>↑ 较上月 +{summary.value.monthNewDiff ?? 0}</em>
              </div>
            </div>
          </section>
          <div class="hazard-root-cause-tabs">
            {statusOptions.map((item) => (
              <button
                class={search.status === item.value ? "is-active" : ""}
                key={item.value}
                onClick={() => handleStatusChange(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <section class="hazard-root-cause-table-section">
            <div class="hazard-root-cause-filters">
              <PcForm />
            </div>
            <div class="hazard-root-cause-table-title">{activeStatusLabel.value}</div>
            <PcTable />
          </section>
        </div>
      ),
      "footer-page": () => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          showQuickJumper={false}
          showSizeChanger={true}
          showTotal={(total: number) => `共 ${total} 条数据`}
          pageSizeOptions={["10", "20", "50", "100"]}
          onPageChange={handlePageChange}
          onShowSizeChange={handlePageChange}
        />
      ),
    };

    return () => <PcLayout title={useLayoutTitle("根因分析")} v-slots={slots} />;
  },
});
