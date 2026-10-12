import type { DutyAssignmentSummaryVO } from "@g2-contract/safety-personnel";
import { defineComponent, onMounted, reactive } from "vue";
import type { JSX } from "vue/jsx-runtime";

import { useAuthRequest } from "@/api/request";
import { getDutySignatureTrackingStatistics, pageDutyAssignments } from "@/api/server";
import { TABLE_PAGE_SIZE } from "@/constants";
import { PageLayout, usePcForm, usePcTable, Page } from "@/pc-ui-runtime";
import { formatText, showApiError } from "@/utils";
import { usePageName } from "@/utils/page";

import styles from "./index.module.css";

const TRACK_STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "SIGNED", label: "已签收" },
  { value: "UNSIGNED", label: "未签收" },
  { value: "OVERDUE", label: "超期未签收" },
];

export const DutySignatureTrackingPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const stats = reactive({
      signedCount: 0,
      unsignedCount: 0,
      overdueUnsignedCount: 0,
    });
    const search = reactive({
      signStatus: "",
      pageNumber: 1,
      pageSize: TABLE_PAGE_SIZE,
      total: 0,
    });

    const loadStats = async (): Promise<void> => {
      try {
        const stat = await useAuthRequest(() => getDutySignatureTrackingStatistics());
        stats.signedCount = stat.signedCount ?? 0;
        stats.unsignedCount = stat.unsignedCount ?? 0;
        stats.overdueUnsignedCount = stat.overdueUnsignedCount ?? 0;
      } catch (e) {
        showApiError(e, "查询签收追踪失败");
        stats.signedCount = 0;
        stats.unsignedCount = 0;
        stats.overdueUnsignedCount = 0;
      }
    };

    onMounted(() => {
      void loadStats();
    });

    const isOverdueUnsigned = (record: DutyAssignmentSummaryVO): boolean =>
      record.signStatus === "UNSIGNED" && typeof record.remainingDays === "number" && record.remainingDays < 0;

    const renderSignStatus = (record: DutyAssignmentSummaryVO): JSX.Element => {
      if (record.signStatus === "SIGNED") {
        return <span class={styles.successText}>已签收</span>;
      }
      if (isOverdueUnsigned(record)) {
        return <span class={styles.dangerText}>超期未签收</span>;
      }
      const remaining = typeof record.remainingDays === "number" ? `剩余${record.remainingDays}天` : "";
      return <span class={styles.warningText}>未签收 {remaining}</span>;
    };

    const columns = [
      { key: "人员", title: "人员", dataIndex: "responsibleUserName", width: 160, ellipsis: true },
      { key: "角色", title: "角色", dataIndex: "roleName", width: 220, ellipsis: true },
      {
        key: "派发时间",
        title: "派发时间",
        dataIndex: "dispatchTime",
        width: 180,
        customRender: ({ text }: { text?: string | number }) => formatText(text),
      },
      {
        key: "签收状态",
        title: "签收状态",
        width: 160,
        customRender: ({ record }: { record: DutyAssignmentSummaryVO }) => renderSignStatus(record),
      },
      {
        key: "签收时间",
        title: "签收时间",
        dataIndex: "signTime",
        width: 180,
        customRender: ({ text }: { text?: string | number }) => formatText(text),
      },
    ];

    const [QueryForm] = usePcForm({
      cache: false,
      layout: "horizontal",
      syncStateRef: search,
      schema: [
        {
          component: "Select",
          label: "签收状态",
          fieldName: "signStatus",
          componentProps: {
            style: { width: "160px" },
            options: TRACK_STATUS_OPTIONS,
            placeholder: "全部",
          },
        },
      ],
      handleSubmit: (values) => {
        search.signStatus = String(values.signStatus ?? "");
        search.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.signStatus = "";
        search.pageNumber = 1;
        tableApi.query();
      },
    });

    const [DutyTable, tableApi] = usePcTable({
      tableCode: "safety-duty-signature-tracking-1",
      autoScrollY: false,
      columns,
      rowKey: "assignmentId",
      fetchApi: async () =>
        useAuthRequest(() =>
          pageDutyAssignments({
            pageNumber: search.pageNumber,
            pageSize: search.pageSize,
            signStatus: search.signStatus || undefined,
          }),
        ),
      fetchLoaded: (page) => {
        search.total = page.total ?? 0;
      },
    });

    const handleChange = (page: number, pageSize: number): void => {
      if (search.pageNumber === page && search.pageSize === pageSize) {
        return;
      }
      search.pageNumber = page;
      search.pageSize = pageSize;
      tableApi.query();
    };

    const layoutSlots = {
      "layout-content": (): JSX.Element => (
        <div class={styles.content}>
          <QueryForm />
          <div class={styles.stats}>
            <span>
              <i class={styles.successDot} />
              已签收 <strong>{stats.signedCount}人</strong>
            </span>
            <span>
              <i class={styles.warningDot} />
              未签收 <strong>{stats.unsignedCount}人</strong>
            </span>
            <span>
              <i class={styles.dangerDot} />
              超期未签收 <strong>{stats.overdueUnsignedCount}人</strong>
            </span>
          </div>
          <DutyTable />
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Page
          current={search.pageNumber}
          pageSize={search.pageSize}
          total={search.total}
          onPageChange={handleChange}
          onShowSizeChange={handleChange}
        />
      ),
    };

    return (): JSX.Element => <PageLayout title={pageTitle} v-slots={layoutSlots} />;
  },
});
