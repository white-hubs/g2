import type { PublicOpinionReviewReportVO, ReviewReportStatus } from "@g2-contract/security-opinion";
import {
  AntModal,
  Button,
  DateRangePicker,
  downloadPDF,
  Empty,
  Form,
  FormItem,
  Input,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
  Textarea,
  message,
} from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import dayjs from "dayjs";
import { computed, defineComponent, nextTick, onMounted, reactive, ref } from "vue";

import { securityOpinionApi } from "../../api/security-opinion";
import { GPagination } from "../../components/common/pagination";
import { PageShell } from "../../components/page-shell/page-shell";
import { TABLE_PAGE_SIZE, WARNING_LEVEL_COLOR, WARNING_LEVEL_LABEL } from "../../constants";
import { formatDateTime } from "../../utils/format-datetime";
import { usePageName } from "../../utils/page-name";

import styles from "./review-report.module.css";

const REPORT_TABLE_SCROLL_X = 980;

const REPORT_STATUS_OPTIONS: Array<{ label: string; value: ReviewReportStatus | "" }> = [
  { label: "全部", value: "" },
  { label: "未生成", value: "NOT_GENERATED" },
  { label: "草稿", value: "DRAFT" },
  { label: "已定稿", value: "FINALIZED" },
];

const REPORT_STATUS_LABEL: Record<string, string> = {
  NOT_GENERATED: "未生成",
  DRAFT: "草稿",
  FINALIZED: "已定稿",
};

const REPORT_STATUS_COLOR: Record<string, string> = {
  NOT_GENERATED: "orange",
  DRAFT: "blue",
  FINALIZED: "green",
};

function reportTitle(report: PublicOpinionReviewReportVO): string {
  return report.reportName || report.eventName || report.title || "舆情事件复盘报告";
}

function eventTitle(report: PublicOpinionReviewReportVO): string {
  return report.eventName || report.title || report.reportName || report.eventCode || report.eventId || "-";
}

function timelineText(node: { node?: string; content?: string; description?: string }): string {
  return node.node || node.content || node.description || "-";
}

function actionText(action: { actionTime?: string; actionType?: string; actionContent?: string; operatorName?: string }): string {
  const time = action.actionTime ? `${formatDateTime(action.actionTime)} ` : "";
  const operator = action.operatorName ? ` ${action.operatorName}` : "";
  return `${time}${action.actionType || "应对"}：${action.actionContent || "-"}${operator}`;
}

function isEmptySpreadPathText(text: string): boolean {
  const normalized = text.trim();
  return (
    !normalized || ["系统未记录完整传播路径。", "系统未记录完整传播路径", "暂无传播路径", "暂无传播路径。", "-", "--"].includes(normalized)
  );
}

function timelinePathForPdf(report: PublicOpinionReviewReportVO): string {
  const timeline = report.timeline ?? [];
  return timeline
    .map((node) => `${formatDateTime(node.actionTime || node.time)} ${timelineText(node)}`)
    .filter((line) => line.trim())
    .join("\n");
}

function spreadPathForPdf(report: PublicOpinionReviewReportVO): string {
  const spreadPath = report.spreadPath?.trim() || "";
  const timelinePath = timelinePathForPdf(report);
  if (timelinePath) {
    if (isEmptySpreadPathText(spreadPath)) return timelinePath;
    return `${spreadPath}\n\n传播节点：\n${timelinePath}`;
  }
  return isEmptySpreadPathText(spreadPath) ? "-" : spreadPath;
}

export const ReviewReportPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const records = ref<PublicOpinionReviewReportVO[]>([]);
    const total = ref(0);
    const pageNumber = ref(1);
    const pageSize = ref(TABLE_PAGE_SIZE);
    const loading = ref(false);
    const detailMode = ref(false);
    const activeReport = ref<PublicOpinionReviewReportVO | null>(null);
    const generating = ref(false);
    const saving = ref(false);
    const finalizing = ref(false);
    const exporting = ref(false);
    const pdfReport = ref<PublicOpinionReviewReportVO | null>(null);
    const pdfOutputRef = ref<HTMLElement | null>(null);

    const filters = reactive({
      keyword: "",
      reportStatus: "" as ReviewReportStatus | "",
      timeRange: undefined as string[] | undefined,
    });

    const draft = reactive({
      reportName: "",
      overview: "",
      spreadPath: "",
      responseProcess: "",
      improvementSuggestions: "",
    });

    const isFinalized = computed(() => String(activeReport.value?.reportStatus ?? "").toUpperCase() === "FINALIZED");

    const syncDraft = (report: PublicOpinionReviewReportVO): void => {
      draft.reportName = report.reportName || reportTitle(report);
      draft.overview = report.overview || "";
      draft.spreadPath = report.spreadPath || "";
      draft.responseProcess = report.responseProcess || "";
      draft.improvementSuggestions = report.improvementSuggestions || "";
    };

    const fetchList = async (): Promise<void> => {
      loading.value = true;
      try {
        const [startTime, endTime] = filters.timeRange ?? [];
        const result = await securityOpinionApi.pageReviewReports({
          pageNumber: pageNumber.value,
          pageSize: pageSize.value,
          keyword: filters.keyword.trim() || undefined,
          reportStatus: filters.reportStatus || undefined,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
        });
        records.value = result.records;
        total.value = result.total;
      } finally {
        loading.value = false;
      }
    };

    const onSearch = (): void => {
      pageNumber.value = 1;
      void fetchList();
    };

    const onReset = (): void => {
      filters.keyword = "";
      filters.reportStatus = "";
      filters.timeRange = undefined;
      pageNumber.value = 1;
      void fetchList();
    };

    const onPageChange = (page: number, size: number): void => {
      pageNumber.value = page;
      pageSize.value = size;
      void fetchList();
    };

    const openDetail = async (record: PublicOpinionReviewReportVO): Promise<void> => {
      const detail = await securityOpinionApi.getReviewReportEvent(record.eventId);
      activeReport.value = detail;
      syncDraft(detail);
      detailMode.value = true;
    };

    const backToList = (): void => {
      detailMode.value = false;
      activeReport.value = null;
      void fetchList();
    };

    const levelTag = (level?: string, text?: string) => {
      const value = String(level ?? "");
      if (!value) return <span>-</span>;
      return <Tag color={WARNING_LEVEL_COLOR[value] ?? "default"}>{text || WARNING_LEVEL_LABEL[value] || value}</Tag>;
    };

    const statusTag = (status?: string, text?: string) => {
      const value = String(status ?? "NOT_GENERATED").toUpperCase();
      return <Tag color={REPORT_STATUS_COLOR[value] ?? "default"}>{text || REPORT_STATUS_LABEL[value] || value}</Tag>;
    };

    const generateReport = async (): Promise<void> => {
      if (!activeReport.value?.eventId) {
        message.warning("请先选择事件");
        return;
      }
      generating.value = true;
      try {
        const result = await securityOpinionApi.generateReviewReport(activeReport.value.eventId);
        activeReport.value = result;
        syncDraft(result);
        message.success(result.degraded ? "AI 不可用，已生成降级草稿" : "报告草稿已生成");
      } finally {
        generating.value = false;
      }
    };

    const saveDraft = async (): Promise<void> => {
      if (!activeReport.value?.reportId) {
        message.warning("请先生成报告草稿");
        return;
      }
      const eventId = activeReport.value.eventId;
      saving.value = true;
      try {
        await securityOpinionApi.saveReviewReportDraft(activeReport.value.reportId, { ...draft });
        const result = await securityOpinionApi.getReviewReportEvent(eventId);
        activeReport.value = result;
        syncDraft(result);
        message.success("草稿已保存");
      } finally {
        saving.value = false;
      }
    };

    const finalizeReport = (): void => {
      if (!activeReport.value?.reportId) {
        message.warning("请先生成报告草稿");
        return;
      }
      AntModal.confirm({
        centered: true,
        title: "定稿确认",
        content: "定稿后报告将被锁定，不能继续编辑。是否确认定稿？",
        okText: "确认定稿",
        cancelText: "取消",
        onOk: async () => {
          finalizing.value = true;
          try {
            const eventId = activeReport.value!.eventId;
            await securityOpinionApi.finalizeReviewReport(activeReport.value!.reportId!);
            activeReport.value = await securityOpinionApi.getReviewReportEvent(eventId);
            syncDraft(activeReport.value);
            message.success("报告已定稿");
          } finally {
            finalizing.value = false;
          }
        },
      });
    };

    const exportPdf = async (source?: PublicOpinionReviewReportVO): Promise<void> => {
      const report = source ?? activeReport.value;
      if (!report) {
        message.warning("请先选择报告");
        return;
      }
      exporting.value = true;
      try {
        pdfReport.value = report.eventId ? await securityOpinionApi.getReviewReportEvent(report.eventId) : report;
        await nextTick();
        if (!pdfOutputRef.value) {
          message.warning("PDF内容未准备完成");
          return;
        }
        await downloadPDF(pdfOutputRef.value, `${reportTitle(pdfReport.value)}_${dayjs().format("YYYYMMDD")}`);
      } finally {
        exporting.value = false;
      }
    };

    onMounted(() => {
      void fetchList();
    });

    const columns = [
      {
        title: "事件编号",
        dataIndex: "eventCode",
        width: 160,
        customRender: ({ record }: { record: PublicOpinionReviewReportVO }) => (
          <span class={styles.mono}>{record.eventCode || record.eventId}</span>
        ),
      },
      {
        title: "事件名称",
        dataIndex: "eventName",
        width: 300,
        ellipsis: true,
        customRender: ({ record }: { record: PublicOpinionReviewReportVO }) => record.eventName || record.title || "-",
      },
      {
        title: "预警等级",
        dataIndex: "warningLevel",
        width: 110,
        align: "center" as const,
        customRender: ({ record }: { record: PublicOpinionReviewReportVO }) => levelTag(record.warningLevel, record.warningLevelText),
      },
      {
        title: "归档时间",
        dataIndex: "archiveTime",
        width: 168,
        customRender: ({ text }: { text: string }) => formatDateTime(text),
      },
      {
        title: "报告状态",
        dataIndex: "reportStatus",
        width: 110,
        align: "center" as const,
        customRender: ({ record }: { record: PublicOpinionReviewReportVO }) => statusTag(record.reportStatus, record.reportStatusText),
      },
      {
        title: "操作",
        width: 220,
        fixed: "right" as const,
        customRender: ({ record }: { record: PublicOpinionReviewReportVO }) => (
          <Space size={0}>
            <Button type="link" size="small" onClick={() => void openDetail(record)}>
              AI自动复盘
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => void exportPdf(record)}
              disabled={!record.reportId && String(record.reportStatus ?? "").toUpperCase() === "NOT_GENERATED"}
            >
              导出PDF
            </Button>
          </Space>
        ),
      },
    ];

    const renderDetail = () => {
      const report = activeReport.value;
      if (!report) return <Empty description="暂无报告详情" />;
      return (
        <div class={styles.detailPage}>
          <Button type="link" class={styles.backBtn} onClick={backToList}>
            返回归档列表
          </Button>
          <div class={styles.detailHeader}>
            <div>
              <h3>{reportTitle(report)}</h3>
              <p>事件标题：{eventTitle(report)}</p>
              <p>{report.summary || "已归档舆情事件，可生成、编辑并导出复盘报告"}</p>
            </div>
            <Space>
              {report.degraded ? <Tag color="orange">降级草稿</Tag> : null}
              {statusTag(report.reportStatus, report.reportStatusText)}
            </Space>
          </div>
          <div class={styles.overview}>
            <span>事件编号：{report.eventCode || report.eventId}</span>
            <span>事件标题：{eventTitle(report)}</span>
            <span>预警等级：{levelTag(report.warningLevel, report.warningLevelText)}</span>
            <span>热度指数：{report.heatIndex ?? "-"}</span>
            <span>来源：{report.source || "-"}</span>
            <span>预警时间：{formatDateTime(report.alertTime)}</span>
            <span>归档时间：{formatDateTime(report.archiveTime)}</span>
          </div>
          <div class={styles.panel}>
            <div class={styles.panelTitle}>传播路径分析</div>
            <div class={styles.spreadBar}>
              <div style={{ width: `${Math.max(0, Math.min(100, report.heatIndex ?? 0))}%` }}></div>
              <span>{report.heatIndex ?? 0}%</span>
            </div>
            <div class={styles.timeline}>
              {(report.timeline ?? []).length ? (
                report.timeline?.map((node, idx) => (
                  <div key={`${node.time}-${idx}`} class={styles.timelineItem}>
                    <div class={styles.timelineDot}></div>
                    <div>
                      <div class={styles.timelineTime}>{formatDateTime(node.actionTime || node.time)}</div>
                      <div class={styles.timelineText}>{timelineText(node)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <Empty description="暂无传播路径" />
              )}
            </div>
          </div>
          <div class={styles.panel}>
            <div class={styles.panelTitle}>AI 复盘报告</div>
            <Form layout="vertical" class={styles.reportForm}>
              <FormItem label="报告名称">
                <Input v-model:value={draft.reportName} disabled={isFinalized.value} placeholder="请输入报告名称" allowClear />
              </FormItem>
              <FormItem label="一、事件概述">
                <Textarea v-model:value={draft.overview} disabled={isFinalized.value} rows={5} placeholder="点击 AI 生成报告创建草稿" />
              </FormItem>
              <FormItem label="二、传播路径">
                <Textarea v-model:value={draft.spreadPath} disabled={isFinalized.value} rows={5} placeholder="传播路径分析" />
              </FormItem>
              <FormItem label="三、应对过程">
                <Textarea v-model:value={draft.responseProcess} disabled={isFinalized.value} rows={5} placeholder="应对过程记录" />
              </FormItem>
              <FormItem label="四、改进建议">
                <Textarea v-model:value={draft.improvementSuggestions} disabled={isFinalized.value} rows={5} placeholder="改进建议" />
              </FormItem>
            </Form>
          </div>
        </div>
      );
    };

    const renderDetailFooter = () => {
      const report = activeReport.value;
      if (!report) return <div class={styles.detailActions} />;
      return (
        <div class={styles.detailActions}>
          {isFinalized.value ? (
            <Button type="primary" loading={exporting.value} disabled={!report.reportId} onClick={() => void exportPdf()}>
              导出PDF
            </Button>
          ) : (
            <Space>
              <Button loading={generating.value} onClick={() => void generateReport()}>
                {report.reportId ? "重新生成" : "AI生成报告"}
              </Button>
              <Button type="primary" loading={saving.value} disabled={!report.reportId} onClick={() => void saveDraft()}>
                保存草稿
              </Button>
              <Button loading={finalizing.value} disabled={!report.reportId} onClick={finalizeReport}>
                定稿
              </Button>
              <Button loading={exporting.value} disabled={!report.reportId} onClick={() => void exportPdf()}>
                导出PDF
              </Button>
            </Space>
          )}
        </div>
      );
    };

    const renderPdf = (report: PublicOpinionReviewReportVO) => (
      <div
        class={styles.pdfContent}
        ref={(el) => {
          pdfOutputRef.value = el as HTMLElement | null;
        }}
      >
        <h1>{reportTitle(report)}</h1>
        <div class={styles.pdfMeta}>
          <span>事件编号：{report.eventCode || report.eventId}</span>
          <span>事件标题：{eventTitle(report)}</span>
          <span>预警等级：{report.warningLevelText || WARNING_LEVEL_LABEL[String(report.warningLevel ?? "")] || "-"}</span>
          <span>热度指数：{report.heatIndex ?? "-"}</span>
          <span>来源：{report.source || "-"}</span>
          <span>预警时间：{formatDateTime(report.alertTime)}</span>
          <span>归档时间：{formatDateTime(report.archiveTime)}</span>
        </div>
        <h2>一、事件概述</h2>
        <p>{report.overview || "-"}</p>
        <h2>二、传播路径</h2>
        <p>{spreadPathForPdf(report)}</p>
        <h2>三、应对过程</h2>
        <p>{report.responseProcess || "-"}</p>
        {(report.responseActions ?? []).length ? (
          <ul>
            {report.responseActions?.map((action, idx) => (
              <li key={idx}>{actionText(action)}</li>
            ))}
          </ul>
        ) : null}
        <h2>四、改进建议</h2>
        <p>{report.improvementSuggestions || "-"}</p>
      </div>
    );

    return () => (
      <PageShell
        title={pageTitle.value}
        v-slots={{
          "layout-content": () => (
            <>
              {detailMode.value ? (
                renderDetail()
              ) : (
                <>
                  <Form layout="inline" class={styles.searchForm} data-layout-toolbar>
                    <FormItem label="报告状态" class={styles.searchItem}>
                      <Select v-model:value={filters.reportStatus} allowClear placeholder="全部状态" style={{ width: "130px" }}>
                        {REPORT_STATUS_OPTIONS.map((item) => (
                          <SelectOption key={item.value || "all"} value={item.value}>
                            {item.label}
                          </SelectOption>
                        ))}
                      </Select>
                    </FormItem>
                    <FormItem label="归档时间" class={styles.searchItem}>
                      <DateRangePicker
                        v-model:value={filters.timeRange}
                        showTime={{ format: "HH:mm" }}
                        format="YYYY-MM-DD HH:mm"
                        valueFormat="YYYY-MM-DD HH:mm"
                        allowClear
                      />
                    </FormItem>
                    <FormItem class={styles.searchItem}>
                      <Input
                        v-model:value={filters.keyword}
                        placeholder="搜索事件名称/编号"
                        allowClear
                        showCount={false}
                        onPressEnter={onSearch}
                        style={{ width: "240px" }}
                      />
                    </FormItem>
                    <FormItem class={styles.searchItem}>
                      <Button type="primary" onClick={onSearch}>
                        查询
                      </Button>
                      <Button style={{ marginLeft: "10px" }} onClick={onReset}>
                        重置
                      </Button>
                    </FormItem>
                  </Form>
                  <div class="tableWrap">
                    <Table
                      class="security-opinion-monitoring-table"
                      columns={columns}
                      dataSource={records.value}
                      rowKey={(record: PublicOpinionReviewReportVO) => record.eventId || record.reportId || ""}
                      loading={loading.value}
                      pagination={false}
                      scroll={{ x: REPORT_TABLE_SCROLL_X }}
                      tableLayout="fixed"
                      locale={{ emptyText: <Empty description="暂无归档事件" /> }}
                    />
                  </div>
                </>
              )}
              {pdfReport.value ? renderPdf(pdfReport.value) : null}
            </>
          ),
          "footer-page": () =>
            detailMode.value ? (
              renderDetailFooter()
            ) : (
              <GPagination total={total.value} current={pageNumber.value} pageSize={pageSize.value} onChange={onPageChange} />
            ),
        }}
      />
    );
  },
});
