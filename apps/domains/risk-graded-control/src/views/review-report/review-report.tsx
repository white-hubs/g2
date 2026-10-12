import type {
  RiskReviewReportComplianceItemVO,
  RiskReviewReportEvidenceVO,
  RiskReviewReportHiddenDangerVO,
  RiskReviewReportParam,
  RiskReviewReportSummaryVO,
  RiskReviewReportVO,
} from "@g2-contract/risk-graded-control";
import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import { defineComponent, nextTick, onMounted, reactive, ref } from "vue";

import { getUsersByIds } from "@/api/ouaa";
import {
  createReviewReportDraft,
  generateReviewReport,
  getRiskObject,
  getReviewReport,
  pageAreas,
  pageReviewReports,
  recheckReviewReport,
  saveReviewReportDraft,
  submitNewReviewReport,
  submitReviewReport,
} from "@/api/server";
import { FORM_INPUT_PROPS, LIST_ACTION_LINK_PROPS, OBJECT_STATUS_LABEL, RISK_LEVEL_LABEL, TABLE_PAGE_SIZE } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import {
  AntModal,
  Button,
  Card,
  Col,
  DatePicker,
  RangePicker,
  Empty,
  FormItem,
  Input,
  Page,
  PageLayout as PcLayout,
  Progress,
  Result,
  Row,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
  Textarea,
  message,
  usePcForm,
  usePcTable,
  type ColumnType,
  type Dayjs,
} from "@/pc-ui-runtime";
import type { RiskLevel, ZoneVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { createListPageState } from "@/utils/list-page";
import { downloadPDF, useLayoutTitle } from "@/utils/page-title";
import { mapZoneFromApi, toId } from "@/utils/risk-control-mapper";

import styles from "./review-report.module.less";

dayjs.extend(quarterOfYear);

type ReportMode = "list" | "wizard";
type WizardStep = "params" | "generating" | "review" | "empty" | "degraded";
type PeriodType = "MONTH" | "QUARTER" | "YEAR" | "CUSTOM";

interface NormalizedSummary {
  unitTotal?: number;
  objectTotal?: number;
  majorRiskUnitCount?: number;
  largeRiskUnitCount?: number;
  generalRiskUnitCount?: number;
  lowRiskUnitCount?: number;
  measureCoveredObjectCount?: number;
  measureCoverageRate?: number;
  assessmentCompletedObjectCount?: number;
  assessmentCompletionRate?: number;
  assessmentPlanExecutionCount?: number;
}

const REPORT_STATUS = {
  DRAFT: { label: "草稿", color: "blue" },
  SUBMITTED: { label: "已提交", color: "green" },
} as const;

const PERIOD_OPTIONS: Array<{ label: string; value: PeriodType }> = [
  { label: "月度", value: "MONTH" },
  { label: "季度", value: "QUARTER" },
  { label: "年度", value: "YEAR" },
  { label: "自定义", value: "CUSTOM" },
];

const QUARTER_OPTIONS = [
  { label: "Q1", value: "1" },
  { label: "Q2", value: "2" },
  { label: "Q3", value: "3" },
  { label: "Q4", value: "4" },
];

const DATE_FORMAT = "YYYY-MM-DD";

const CONCLUSION_OPTIONS = [
  { label: "符合", value: "COMPLIANT" },
  { label: "部分符合", value: "PARTIAL" },
  { label: "不符合", value: "NON_COMPLIANT" },
  { label: "待人工核验", value: "PENDING_MANUAL" },
];

const CONCLUSION_LABEL: Record<string, string> = {
  COMPLIANT: "符合",
  PASS: "符合",
  PARTIAL: "部分符合",
  PARTLY: "部分符合",
  NON_COMPLIANT: "不符合",
  FAIL: "不符合",
  PENDING_MANUAL: "待人工核验",
  MANUAL_REQUIRED: "待人工核验",
};

const CONCLUSION_COLOR: Record<string, string> = {
  COMPLIANT: "green",
  PASS: "green",
  PARTIAL: "orange",
  PARTLY: "orange",
  NON_COMPLIANT: "red",
  FAIL: "red",
  PENDING_MANUAL: "gold",
  MANUAL_REQUIRED: "gold",
};

const ASSESSMENT_TYPE_LABEL: Record<string, string> = {
  INHERENT: "固有风险评估",
  INNATE: "固有风险评估",
  CONTROL: "控制风险评估",
};

const MEASURE_EXEC_STATUS_LABEL: Record<string, string> = {
  PENDING: "待执行",
  EXECUTING: "执行中",
  IN_PROGRESS: "执行中",
  COMPLETED: "已完成",
  DONE: "已完成",
  OVERDUE: "已逾期",
};

const HAZARD_GOVERNANCE_STATUS_LABEL: Record<string, string> = {
  PENDING_CONFIRM: "待确认",
  PENDING_PLAN: "待填写整改方案",
  PENDING_APPROVAL: "待审批",
  PLAN_REJECTED: "方案被退回",
  RECTIFYING: "整改中",
  PENDING_ACCEPTANCE: "待验收",
  ACCEPTANCE_REJECTED: "验收不通过",
  MISREPORTED: "误报",
  ACCEPTANCE_COMPLETED: "验收完成",
};

interface EvidenceDetailContext {
  riskObjectNameMap?: Map<string, string>;
  userNameMap?: Map<string, string>;
  detail?: Record<string, unknown>;
}

function normalizeStatus(status?: string): keyof typeof REPORT_STATUS {
  const value = String(status ?? "").toUpperCase();
  if (value === "SUBMITTED" || value === "已提交") return "SUBMITTED";
  return "DRAFT";
}

function parseDateTime(value: unknown): ReturnType<typeof dayjs> | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    const date = dayjs(value);
    return date.isValid() ? date : null;
  }
  const text = String(value).trim();
  if (!text) return null;
  const date = /^\d+$/.test(text) ? dayjs(Number(text)) : dayjs(text);
  return date.isValid() ? date : null;
}

function dateTimeText(value: unknown): string {
  return parseDateTime(value)?.format("YYYY-MM-DD HH:mm:ss") ?? "--";
}

function dateValueText(value: unknown): string {
  return parseDateTime(value)?.format(DATE_FORMAT) ?? "";
}

function periodLabel(report: RiskReviewReportVO): string {
  if (report.periodName) return report.periodName;
  const start = dateTimeText(report.startDate ?? report.startTime);
  const end = dateTimeText(report.endDate ?? report.endTime);
  return start !== "--" && end !== "--" ? `${start} ~ ${end}` : "--";
}

function reportName(report: RiskReviewReportVO): string {
  return String(report.reportName ?? report.name ?? "未命名评审报告");
}

function valueText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join("、");
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.userName ?? record.username ?? record.title ?? record.name ?? record.clause ?? record.code ?? record.id ?? "");
  }
  return "";
}

function rateText(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  return value > 1 ? `${Math.round(value)}%` : `${Math.round(value * 100)}%`;
}

function numericText(value?: number): string {
  return value === undefined || value === null || Number.isNaN(value) ? "--" : String(value);
}

function readNumber(source: Record<string, unknown> | undefined, keys: string[]): number | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  }
  return undefined;
}

function normalizeSummary(summary?: RiskReviewReportSummaryVO): NormalizedSummary {
  const source = summary as Record<string, unknown> | undefined;
  return {
    unitTotal: readNumber(source, ["unitTotal", "unitCount"]),
    objectTotal: readNumber(source, ["objectTotal"]),
    majorRiskUnitCount: readNumber(source, ["majorRiskUnitCount", "majorCount"]),
    largeRiskUnitCount: readNumber(source, ["largeRiskUnitCount", "largeCount"]),
    generalRiskUnitCount: readNumber(source, ["generalRiskUnitCount", "generalCount"]),
    lowRiskUnitCount: readNumber(source, ["lowRiskUnitCount", "lowCount"]),
    measureCoveredObjectCount: readNumber(source, ["measureCoveredObjectCount"]),
    measureCoverageRate: readNumber(source, ["measureCoverageRate"]),
    assessmentCompletedObjectCount: readNumber(source, ["assessmentCompletedObjectCount"]),
    assessmentCompletionRate: readNumber(source, ["assessmentCompletionRate"]),
    assessmentPlanExecutionCount: readNumber(source, ["assessmentPlanExecutionCount"]),
  };
}

function normalizeHiddenDanger(report: RiskReviewReportVO): RiskReviewReportHiddenDangerVO {
  const hiddenDanger = (report.hiddenDanger ?? {}) as RiskReviewReportHiddenDangerVO;
  const source = hiddenDanger as Record<string, unknown>;
  const summary = report.summary as Record<string, unknown> | undefined;
  return {
    ...hiddenDanger,
    totalCount: readNumber(source, ["totalCount"]) ?? readNumber(summary, ["hiddenDangerTotalCount"]),
    activeCount: readNumber(source, ["activeCount"]) ?? readNumber(summary, ["activeHiddenDangerCount"]),
    closedCount: readNumber(source, ["closedCount"]) ?? readNumber(summary, ["closedHiddenDangerCount"]),
    overdueCount: readNumber(source, ["overdueCount"]) ?? readNumber(summary, ["overdueHiddenDangerCount"]),
    closureRate: readNumber(source, ["closureRate"]) ?? readNumber(summary, ["hiddenDangerClosureRate"]),
    evidences: hiddenDanger.evidences ?? [],
  };
}

function complianceStandardText(item: RiskReviewReportComplianceItemVO): string {
  return valueText(item.standard) || String(item.standardName ?? item.clause ?? "--");
}

function complianceEvidences(item: RiskReviewReportComplianceItemVO): RiskReviewReportEvidenceVO[] {
  return item.evidences ?? item.evidence ?? [];
}

function evidenceName(evidence: RiskReviewReportEvidenceVO): string {
  return String(
    evidence.evidenceName ?? evidence.label ?? evidence.sourceNo ?? evidence.evidenceId ?? evidence.sourceId ?? evidence.id ?? "--",
  );
}

function evidenceSource(evidence: RiskReviewReportEvidenceVO): string {
  return String(evidence.sourceModule ?? evidence.evidenceType ?? evidence.sourceType ?? "--");
}

function complianceItemKey(item: RiskReviewReportComplianceItemVO, index = 0): string {
  const id = toId(item.id ?? item.standardId);
  if (id) return id;
  return `${index}-${complianceStandardText(item)}-${String(item.checkpoint ?? "")}`;
}

function evidenceText(item: RiskReviewReportComplianceItemVO): string {
  if (item.evidenceText) return String(item.evidenceText);
  const list = complianceEvidences(item);
  return list.map(evidenceName).filter(Boolean).join("、") || "--";
}

function evidenceDetails(evidence: RiskReviewReportEvidenceVO): Array<Record<string, unknown>> {
  return Array.isArray(evidence.details) ? evidence.details : [];
}

function normalizeCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function riskLevelText(value: unknown): string {
  const code = normalizeCode(value);
  const level = code === "LARGE" ? "SIGNIFICANT" : code;
  return RISK_LEVEL_LABEL[level as RiskLevel] ?? (valueText(value) || "--");
}

function fieldText(detail: Record<string, unknown> | undefined, keys: string[]): string {
  if (!detail) return "";
  for (const key of keys) {
    const text = valueText(detail[key]).trim();
    if (text) return text;
  }
  return "";
}

function idText(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function isRiskObjectField(label: string): boolean {
  return label.includes("关联风险对象") || label === "riskObjectId" || label === "objectId";
}

function isUserField(label: string): boolean {
  return label.includes("执行人") || label === "executorUserId" || label === "executor";
}

function isScoreField(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return label.includes("总分") || label.includes("分数") || normalized === "score" || normalized === "totalscore";
}

function shouldRenderEvidenceField(label: string, value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (isScoreField(label)) return false;
  const normalized = label.trim().toLowerCase();
  if (normalized === "id" || normalized.endsWith("id") || label.includes("证据ID") || label.includes("链接")) return false;
  return true;
}

function evidenceDetailValue(label: string, value: unknown, context: EvidenceDetailContext = {}): string {
  if (value === undefined || value === null || value === "") return "--";
  if (Array.isArray(value)) {
    const text = value
      .map((item) => evidenceDetailValue(label, item, context))
      .filter((item) => item !== "--")
      .join("、");
    return text || "--";
  }
  if (label.includes("时间") || label.includes("日期") || label.includes("期限")) {
    return dateTimeText(value);
  }
  if (label.includes("固有风险") || label.includes("控制风险") || label.includes("风险等级") || label.toLowerCase().includes("risklevel")) {
    return riskLevelText(value);
  }
  if (label.includes("评估类型") || label === "assessmentType") {
    return ASSESSMENT_TYPE_LABEL[normalizeCode(value)] ?? (valueText(value) || "--");
  }
  if (label.includes("治理状态") || label === "governanceStatus") {
    return HAZARD_GOVERNANCE_STATUS_LABEL[normalizeCode(value)] ?? (valueText(value) || "--");
  }
  if (label.includes("执行状态") || label === "executionStatus" || label === "execStatus") {
    return MEASURE_EXEC_STATUS_LABEL[normalizeCode(value)] ?? (valueText(value) || "--");
  }
  if (label === "状态" || label === "status") {
    const code = normalizeCode(value);
    return (
      OBJECT_STATUS_LABEL[code as keyof typeof OBJECT_STATUS_LABEL] ??
      MEASURE_EXEC_STATUS_LABEL[code] ??
      HAZARD_GOVERNANCE_STATUS_LABEL[code] ??
      (valueText(value) || "--")
    );
  }
  if (isRiskObjectField(label)) {
    const name =
      fieldText(context.detail, ["关联风险对象名称", "风险对象名称", "风险对象", "对象名称", "objectName", "riskObjectName"]) ||
      context.riskObjectNameMap?.get(idText(value));
    return name || valueText(value) || "--";
  }
  if (isUserField(label)) {
    const name =
      fieldText(context.detail, ["执行人名称", "executorUserName", "executorName", "userName", "name"]) ||
      context.userNameMap?.get(idText(value));
    return name || valueText(value) || "--";
  }
  if (typeof value === "object") return valueText(value);
  return String(value);
}

function normalizedEvidenceDetailEntries(detail: Record<string, unknown>, context: EvidenceDetailContext): Array<[string, string]> {
  return Object.entries(detail)
    .filter(([label, value]) => shouldRenderEvidenceField(label, value))
    .map(([label, value]) => [label, evidenceDetailValue(label, value, { ...context, detail })] as [string, string])
    .filter(([, value]) => value !== "--");
}

function collectEvidenceDetailIds(evidences: RiskReviewReportEvidenceVO[], predicate: (label: string) => boolean): string[] {
  const ids = new Set<string>();
  evidences.forEach((evidence) => {
    evidenceDetails(evidence).forEach((detail) => {
      Object.entries(detail).forEach(([label, value]) => {
        const id = idText(value);
        if (predicate(label) && id) ids.add(id);
      });
    });
  });
  return [...ids];
}

function previousPeriodValue(type: PeriodType): string {
  if (type === "MONTH") return dayjs().subtract(1, "month").format("YYYY-MM");
  if (type === "YEAR") return dayjs().subtract(1, "year").format("YYYY");
  const previousQuarter = dayjs().subtract(1, "quarter");
  return `${previousQuarter.format("YYYY")}-Q${previousQuarter.quarter()}`;
}

function parseQuarterValue(value: string): { year: string; quarter: string } {
  const fallback = previousPeriodValue("QUARTER");
  const match = /^(\d{4})-Q([1-4])$/.exec(value || fallback);
  return {
    year: match?.[1] ?? dayjs().format("YYYY"),
    quarter: match?.[2] ?? String(dayjs().quarter()),
  };
}

function rangeFromPeriodValue(type: PeriodType, value: string): string[] {
  if (type === "MONTH") {
    const normalized = /^\d{4}-\d{2}$/.test(value) ? value : previousPeriodValue("MONTH");
    const date = dayjs(`${normalized}-01`);
    return [date.startOf("month").format(DATE_FORMAT), date.endOf("month").format(DATE_FORMAT)];
  }
  if (type === "YEAR") {
    const normalized = /^\d{4}$/.test(value) ? value : previousPeriodValue("YEAR");
    const date = dayjs(`${normalized}-01-01`);
    return [date.startOf("year").format(DATE_FORMAT), date.endOf("year").format(DATE_FORMAT)];
  }
  if (type === "QUARTER") {
    const { year, quarter } = parseQuarterValue(value);
    const start = dayjs(`${year}-${String((Number(quarter) - 1) * 3 + 1).padStart(2, "0")}-01`);
    const end = start.add(2, "month").endOf("month");
    return [start.startOf("month").format(DATE_FORMAT), end.format(DATE_FORMAT)];
  }
  return [];
}

function periodValueFromRange(type: PeriodType, range: string[]): string {
  const [start] = range;
  const date = start ? dayjs(start) : null;
  if (!date?.isValid()) return type === "CUSTOM" ? "" : previousPeriodValue(type);
  if (type === "MONTH") return date.format("YYYY-MM");
  if (type === "YEAR") return date.format("YYYY");
  if (type === "QUARTER") return `${date.format("YYYY")}-Q${date.quarter()}`;
  return "";
}

function defaultQuarterRange(): string[] {
  return rangeFromPeriodValue("QUARTER", previousPeriodValue("QUARTER"));
}

function buildDefaultReportName(range: string[]): string {
  const [start, end] = range;
  if (!start || !end) return "安全风险评审报告";
  return `${dayjs(start).format("YYYY年MM月DD日")}至${dayjs(end).format("YYYY年MM月DD日")}安全风险评审报告`;
}

export const ReviewReportPage = defineComponent({
  name: "ReviewReportPage",
  setup() {
    const layoutTitle = useLayoutTitle("评审报告");
    const mode = ref<ReportMode>("list");
    const step = ref<WizardStep>("params");
    const zones = ref<ZoneVO[]>([]);
    const activeReport = ref<RiskReviewReportVO | null>(null);
    const pdfReport = ref<RiskReviewReportVO | null>(null);
    const pdfOutputRef = ref<HTMLDivElement | null>(null);
    const generating = ref(false);
    const saving = ref(false);
    const pdfLoading = ref(false);
    const openingReport = ref(false);
    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const search = reactive({
      keyword: "",
      status: "",
      periodType: "",
    });

    const defaultPeriodType = "QUARTER" as PeriodType;
    const defaultPeriodValue = previousPeriodValue(defaultPeriodType);
    const defaultRange = rangeFromPeriodValue(defaultPeriodType, defaultPeriodValue);
    const form = reactive({
      reportName: buildDefaultReportName(defaultRange),
      periodType: "QUARTER" as PeriodType,
      periodValue: defaultPeriodValue,
      range: defaultRange,
      scopeType: "ALL" as "ALL" | "AREA",
      areaId: "",
    });

    const loadZones = async (): Promise<void> => {
      try {
        const result = await useAuthRequest(() => pageAreas({ pageNumber: 1, pageSize: 500, view: "option" }));
        zones.value = (result?.records ?? []).map(mapZoneFromApi);
      } catch {
        zones.value = [];
      }
    };

    const statusTag = (status?: string): JSX.Element => {
      const normalized = normalizeStatus(status);
      const meta = REPORT_STATUS[normalized];
      return <Tag color={meta.color}>{meta.label}</Tag>;
    };

    const columns: ColumnType[] = [
      {
        title: "报告名称",
        dataIndex: "reportName",
        width: 520,
        ellipsis: true,
        customRender: ({ record }: { record: RiskReviewReportVO }) => {
          const name = reportName(record);
          return (
            <span class={styles.reportNameCell} title={name}>
              {name}
            </span>
          );
        },
      },
      {
        title: "评审周期",
        width: 360,
        customRender: ({ record }: { record: RiskReviewReportVO }) => {
          const period = periodLabel(record);
          return (
            <span class={styles.periodCell} title={period}>
              {period}
            </span>
          );
        },
      },
      {
        title: "生成时间",
        dataIndex: "generatedTime",
        width: 180,
        customRender: ({ text }: { text?: string | number }) => dateTimeText(text),
      },
      { title: "状态", dataIndex: "status", width: 90, customRender: ({ text }: { text?: string }) => statusTag(text) },
      {
        title: "操作",
        fixed: "right",
        width: 120,
        customRender: ({ record }: { record: RiskReviewReportVO }) => {
          const submitted = normalizeStatus(record.status) === "SUBMITTED";
          return (
            <Space size={4}>
              <Button {...LIST_ACTION_LINK_PROPS} onClick={() => void openReport(record)}>
                {submitted ? "查看" : "编辑"}
              </Button>
              {submitted && (
                <Button {...LIST_ACTION_LINK_PROPS} loading={pdfLoading.value} onClick={() => void exportPdf(record)}>
                  导出
                </Button>
              )}
            </Space>
          );
        },
      },
    ];

    const fetchReportPage = async () => {
      const result = await useAuthRequest(() =>
        pageReviewReports({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: search.keyword.trim() || undefined,
          status: search.status || undefined,
          periodType: search.periodType || undefined,
        }),
      );
      const records = (result?.records ?? []).map((item) => ({
        ...item,
        id: toId(item.id),
      }));
      return {
        total: result?.total ?? 0,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_REVIEW_REPORTS",
      rowKey: "id",
      fetchApi: fetchReportPage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Select",
          label: "评审周期",
          fieldName: "periodType",
          defaultValue: "",
          componentProps: {
            allowClear: true,
            placeholder: "全部周期",
            options: [
              { label: "全部周期", value: "" },
              ...PERIOD_OPTIONS.filter((item) => item.value !== "CUSTOM").map((item) => ({
                label: item.label,
                value: item.value,
              })),
            ],
          },
        },
        {
          component: "Select",
          label: "状态",
          fieldName: "status",
          defaultValue: "",
          componentProps: {
            allowClear: true,
            placeholder: "全部状态",
            options: [
              { label: "全部状态", value: "" },
              ...Object.entries(REPORT_STATUS).map(([value, meta]) => ({ label: meta.label, value })),
            ],
          },
        },
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          componentProps: { placeholder: "报告名称", allowClear: true, maxlength: 100 },
        },
      ],
      syncStateRef: search,
      syncMap: (values) => ({
        keyword: (values.keyword as string | undefined) ?? "",
        status: (values.status as string | undefined) ?? "",
        periodType: (values.periodType as string | undefined) ?? "",
      }),
      onHydratedQuery: () => {
        if (mode.value === "list") tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        search.status = (values.status as string | undefined) ?? "";
        search.periodType = (values.periodType as string | undefined) ?? "";
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.status = "";
        search.periodType = "";
        page.pageNumber = 1;
        tableApi.query();
      },
      showCollapseButton: true,
      collapsedVisibleCount: 2,
    });

    onMounted(() => {
      void loadZones();
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      tableApi.query();
    };

    const resetForm = (): void => {
      const periodValue = previousPeriodValue("QUARTER");
      const range = rangeFromPeriodValue("QUARTER", periodValue);
      form.periodType = "QUARTER";
      form.periodValue = periodValue;
      form.range = range;
      form.reportName = buildDefaultReportName(range);
      form.scopeType = "ALL";
      form.areaId = "";
    };

    const syncFormFromReport = (report: RiskReviewReportVO): void => {
      const startDate = dateValueText(report.startDate ?? report.startTime);
      const endDate = dateValueText(report.endDate ?? report.endTime);
      const periodType = String(report.periodType ?? "QUARTER");
      form.periodType = PERIOD_OPTIONS.some((item) => item.value === periodType) ? (periodType as PeriodType) : "CUSTOM";
      form.range = startDate && endDate ? [startDate, endDate] : defaultQuarterRange();
      form.periodValue = periodValueFromRange(form.periodType, form.range);
      form.reportName = reportName(report);
      form.scopeType = String(report.scopeType ?? "ALL") === "AREA" ? "AREA" : "ALL";
      form.areaId = report.areaId == null ? "" : String(report.areaId);
    };

    const openCreate = (): void => {
      resetForm();
      activeReport.value = null;
      mode.value = "wizard";
      step.value = "params";
    };

    const backToList = async (): Promise<void> => {
      mode.value = "list";
      step.value = "params";
      activeReport.value = null;
      page.pageNumber = 1;
      tableApi.query();
    };

    const onPeriodTypeChange = (value: PeriodType): void => {
      form.periodType = value;
      if (value === "CUSTOM") {
        form.periodValue = "";
        form.range = [];
        return;
      }
      const periodValue = previousPeriodValue(value);
      const range = rangeFromPeriodValue(value, periodValue);
      form.periodValue = periodValue;
      form.range = range;
      form.reportName = buildDefaultReportName(range);
    };

    const onPeriodValueChange = (value?: string | Dayjs): void => {
      if (!value) return;
      const normalized = typeof value === "string" ? value : value.format(form.periodType === "YEAR" ? "YYYY" : "YYYY-MM");
      form.periodValue = normalized;
      const range = rangeFromPeriodValue(form.periodType, normalized);
      form.range = range;
      form.reportName = buildDefaultReportName(range);
    };

    const onQuarterPartChange = (next: { year?: string; quarter?: string }): void => {
      const current = parseQuarterValue(form.periodValue);
      onPeriodValueChange(`${next.year ?? current.year}-Q${next.quarter ?? current.quarter}`);
    };

    const onCustomRangeChange = (value?: [string, string] | [Dayjs, Dayjs]): void => {
      form.range = Array.isArray(value)
        ? value.map((item) => (typeof item === "string" ? item : item.format(DATE_FORMAT))).slice(0, 2)
        : [];
      if (form.range.length === 2 && form.range[0] && form.range[1]) {
        form.reportName = buildDefaultReportName(form.range);
      }
    };

    const periodRangeHint = (): string => {
      const [start, end] = form.range;
      return start && end ? `覆盖 ${start} 至 ${end}` : "";
    };

    const validateParams = (): boolean => {
      if (!form.reportName.trim()) {
        message.error("请填写报告名称");
        return false;
      }
      if (form.range.length !== 2 || !form.range[0] || !form.range[1]) {
        message.error("请选择评审起止时间");
        return false;
      }
      if (dayjs(form.range[1]).isBefore(dayjs(form.range[0]))) {
        message.error("结束日期不能早于开始日期");
        return false;
      }
      if (form.scopeType === "AREA" && !form.areaId) {
        message.error("请选择统计区域");
        return false;
      }
      return true;
    };

    const buildParam = (report?: RiskReviewReportVO | null): RiskReviewReportParam => {
      const [startDate, endDate] = form.range;
      return {
        reportName: form.reportName.trim(),
        periodType: form.periodType,
        startDate,
        endDate,
        scopeType: form.scopeType,
        areaId: form.scopeType === "AREA" ? form.areaId : undefined,
        summary: report?.summary,
        complianceItems: report?.complianceItems,
        hiddenDanger: report?.hiddenDanger,
        suggestions: String(report?.suggestions ?? ""),
        contentJson: report?.contentJson,
        degraded: report?.degraded,
        aiAnalysisRecordId: report?.aiAnalysisRecordId,
      };
    };

    const startGenerate = async (): Promise<void> => {
      if (!validateParams()) return;
      step.value = "generating";
      generating.value = true;
      try {
        const report = await useAuthRequest(() => generateReviewReport(buildParam()));
        activeReport.value = report;
        step.value = report.degraded ? "degraded" : "review";
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e ?? "");
        if (msg.includes("暂无") || msg.includes("无评审") || msg.includes("无数据")) {
          step.value = "empty";
        } else {
          showApiError(e);
          step.value = "params";
        }
      } finally {
        generating.value = false;
      }
    };

    const openReport = async (record: RiskReviewReportVO): Promise<void> => {
      const id = record.id;
      if (!id) return;
      openingReport.value = true;
      try {
        const detail = await useAuthRequest(() => getReviewReport(id));
        activeReport.value = detail;
        syncFormFromReport(detail);
        mode.value = "wizard";
        step.value = detail.degraded ? "degraded" : "review";
      } catch (e) {
        showApiError(e);
      } finally {
        openingReport.value = false;
      }
    };

    const updateComplianceConclusion = (itemIndex: number, item: RiskReviewReportComplianceItemVO, conclusion: string): void => {
      if (!activeReport.value) return;
      const reviewComment = item.reviewComment || `人工复核调整为${CONCLUSION_LABEL[conclusion] ?? conclusion}`;
      activeReport.value = {
        ...activeReport.value,
        complianceItems: (activeReport.value.complianceItems ?? []).map((row, rowIndex) =>
          rowIndex === itemIndex ? { ...row, conclusion, aiGenerated: false, manualRequired: false, reviewComment } : row,
        ),
      };
    };

    const updateComplianceReviewComment = (itemIndex: number, reviewComment: string): void => {
      if (!activeReport.value) return;
      activeReport.value = {
        ...activeReport.value,
        complianceItems: (activeReport.value.complianceItems ?? []).map((row, rowIndex) =>
          rowIndex === itemIndex ? { ...row, reviewComment, aiGenerated: false, manualRequired: false } : row,
        ),
      };
    };

    const resolveRiskObjectNames = async (ids: string[]): Promise<Map<string, string>> => {
      const result = new Map<string, string>();
      const normalizedIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
      if (!normalizedIds.length) return result;
      await Promise.all(
        normalizedIds.map(async (id) => {
          try {
            const object = await useAuthRequest(() => getRiskObject(id));
            const source = object as Record<string, unknown>;
            const name = valueText(source.objectName ?? source.name);
            if (name) result.set(id, name);
          } catch {
            // 旧报告证据仍可展示其它字段，风险对象名称解析失败时不阻断弹窗。
          }
        }),
      );
      return result;
    };

    const resolveUserNames = async (ids: string[]): Promise<Map<string, string>> => {
      const result = new Map<string, string>();
      const normalizedIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
      if (!normalizedIds.length) return result;
      try {
        const users = await useAuthRequest(() => getUsersByIds(normalizedIds.join(",")));
        (users ?? []).forEach((user) => {
          const id = idText(user.id);
          const name = valueText(user.name ?? user.username);
          if (id && name) result.set(id, name);
        });
      } catch {
        // 人员名称解析失败时保留原始证据展示，避免弹窗打不开。
      }
      return result;
    };

    const showEvidenceModal = async (item: RiskReviewReportComplianceItemVO): Promise<void> => {
      const evidences = complianceEvidences(item);
      const [riskObjectNameMap, userNameMap] = await Promise.all([
        resolveRiskObjectNames(
          collectEvidenceDetailIds(evidences, (label) => label === "关联风险对象" || label === "riskObjectId" || label === "objectId"),
        ),
        resolveUserNames(
          collectEvidenceDetailIds(evidences, (label) => label === "执行人" || label === "executorUserId" || label === "executor"),
        ),
      ]);
      AntModal.info({
        title: "证据来源",
        width: 760,
        content: evidences.length ? (
          <div class={styles.evidenceList}>
            {evidences.map((evidence, index) => {
              const details = evidenceDetails(evidence);
              return (
                <details
                  key={`${evidence.evidenceId ?? evidence.id ?? index}`}
                  class={styles.evidenceItem}
                  open={evidences.length === 1 || index === 0}
                >
                  <summary class={styles.evidenceSummary}>
                    <span class={styles.evidenceTitle}>{evidenceName(evidence)}</span>
                    <span class={styles.evidenceMeta}>
                      {evidenceSource(evidence)}
                      {details.length ? ` · ${details.length} 条明细` : ""}
                    </span>
                  </summary>
                  {details.length ? (
                    <div class={styles.evidenceDetailList}>
                      {details.map((detail, detailIndex) => {
                        const entries = normalizedEvidenceDetailEntries(detail, { riskObjectNameMap, userNameMap });
                        return (
                          <div key={detailIndex} class={styles.evidenceDetailItem}>
                            {entries.length ? (
                              entries.map(([label, value]) => (
                                <div key={label} class={styles.evidenceDetailField}>
                                  <span>{label}</span>
                                  <strong>{value}</strong>
                                </div>
                              ))
                            ) : (
                              <div class={styles.evidenceEmpty}>暂无可展示的业务明细</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div class={styles.evidenceEmpty}>暂无可展开的业务明细</div>
                  )}
                </details>
              );
            })}
          </div>
        ) : (
          <Empty description="暂无证据来源" />
        ),
      });
    };

    const updateSuggestions = (value: string): void => {
      if (!activeReport.value) return;
      activeReport.value = { ...activeReport.value, suggestions: value };
    };

    const saveDraft = async (): Promise<void> => {
      const report = activeReport.value;
      if (!report) {
        message.warning("报告尚未生成");
        return;
      }
      saving.value = true;
      try {
        const payload = buildParam(report);
        activeReport.value = report.id
          ? await useAuthRequest(() => saveReviewReportDraft(report.id!, payload))
          : await useAuthRequest(() => createReviewReportDraft(payload));
        message.success("已保存草稿");
      } catch (e) {
        showApiError(e);
      } finally {
        saving.value = false;
      }
    };

    const submitReport = async (): Promise<void> => {
      const report = activeReport.value;
      if (!report) {
        message.warning("报告尚未生成");
        return;
      }
      const pending = (report.complianceItems ?? []).some((item) => {
        const conclusion = String(item.conclusion ?? "").toUpperCase();
        return !conclusion || conclusion === "PENDING_MANUAL" || conclusion === "MANUAL_REQUIRED" || conclusion.includes("待");
      });
      if (pending) {
        message.error("请完成待人工核验项后再提交");
        return;
      }
      saving.value = true;
      try {
        const payload = buildParam(report);
        activeReport.value = report.id
          ? await useAuthRequest(() => submitReviewReport(report.id!, payload))
          : await useAuthRequest(() => submitNewReviewReport(payload));
        message.success("报告已提交并锁定");
      } catch (e) {
        showApiError(e);
      } finally {
        saving.value = false;
      }
    };

    const recheck = (): void => {
      const report = activeReport.value;
      if (!report) {
        message.warning("请先生成报告");
        return;
      }
      AntModal.confirm({
        title: "重新核验",
        content: "将以最新数据重新核验，刷新数据统计与 AI 自动判定，并保留已确认的人工复核项。是否继续？",
        okText: "确认重新核验",
        cancelText: "取消",
        onOk: async () => {
          activeReport.value = report.id
            ? await useAuthRequest(() => recheckReviewReport(report.id!, buildParam(report)))
            : await useAuthRequest(() => generateReviewReport(buildParam(report)));
          message.success("已重新核验");
        },
      });
    };

    const exportPdf = async (record?: RiskReviewReportVO): Promise<void> => {
      const source = record ?? activeReport.value;
      if (!source) {
        message.warning("请先选择报告");
        return;
      }
      pdfLoading.value = true;
      try {
        pdfReport.value = source.id ? await useAuthRequest(() => getReviewReport(source.id!)) : source;
        await nextTick();
        if (!pdfOutputRef.value) {
          message.warning("PDF内容未准备完成");
          return;
        }
        await downloadPDF(pdfOutputRef.value, reportName(pdfReport.value));
      } catch (e) {
        showApiError(e);
      } finally {
        pdfLoading.value = false;
      }
    };

    const conclusionTag = (conclusion?: string): JSX.Element => {
      const value = String(conclusion ?? "PENDING_MANUAL");
      return <Tag color={CONCLUSION_COLOR[value] ?? "default"}>{CONCLUSION_LABEL[value] ?? value}</Tag>;
    };

    const renderList = (): JSX.Element => (
      <div class={["risk-stack", "risk-table-page", styles.reportPage].join(" ")}>
        <div class={styles.heroCard}>
          <div>
            <h1 class={styles.heroTitle}>报告生成</h1>
            <p class={styles.heroDesc}>AI 一键生成合规评审报告，结合法规条款核验，每项结论标注可追溯证据来源</p>
          </div>
          <Button type="primary" onClick={openCreate}>
            新建报告
          </Button>
        </div>
        <PcForm />
        <PcTable />
      </div>
    );

    const renderPeriodPicker = (): JSX.Element => {
      if (form.periodType === "CUSTOM") {
        return (
          <RangePicker
            value={form.range.length === 2 ? ([form.range[0], form.range[1]] as [string, string]) : undefined}
            valueFormat={DATE_FORMAT}
            placeholder={["开始日期", "结束日期"]}
            style={{ width: "100%" }}
            onUpdate:value={onCustomRangeChange}
          />
        );
      }
      if (form.periodType === "QUARTER") {
        const quarterParts = parseQuarterValue(form.periodValue);
        return (
          <div class={styles.periodPickerWrap}>
            <Space size={8}>
              <DatePicker
                key="review-period-quarter-year"
                value={quarterParts.year}
                picker="year"
                valueFormat="YYYY"
                format="YYYY"
                placeholder="请选择年份"
                allowClear={false}
                style={{ width: "120px" }}
                onUpdate:value={(value: string | Dayjs) =>
                  onQuarterPartChange({ year: typeof value === "string" ? value : value.format("YYYY") })
                }
              />
              <Select
                value={quarterParts.quarter}
                style={{ width: "90px" }}
                onUpdate:value={(value: unknown) => onQuarterPartChange({ quarter: String(value ?? "") })}
              >
                {QUARTER_OPTIONS.map((item) => (
                  <SelectOption key={item.value} value={item.value}>
                    {item.label}
                  </SelectOption>
                ))}
              </Select>
            </Space>
            <span class={styles.periodRangeHint}>{periodRangeHint()}</span>
          </div>
        );
      }
      const isYear = form.periodType === "YEAR";
      return (
        <div class={styles.periodPickerWrap}>
          <DatePicker
            key={`review-period-${form.periodType}`}
            value={form.periodValue}
            picker={isYear ? "year" : "month"}
            valueFormat={isYear ? "YYYY" : "YYYY-MM"}
            format={isYear ? "YYYY" : "YYYY-MM"}
            placeholder={isYear ? "请选择年度" : "请选择月份"}
            allowClear={false}
            style={{ width: isYear ? "120px" : "150px" }}
            onUpdate:value={onPeriodValueChange}
          />
          <span class={styles.periodRangeHint}>{periodRangeHint()}</span>
        </div>
      );
    };

    const renderParamStep = (): JSX.Element => (
      <div class={styles.stepCard}>
        <h3 class={styles.stepTitle}>报告参数配置</h3>
        <Row gutter={[16, 12]}>
          <Col span={12}>
            <FormItem label="报告名称" required>
              <Input {...FORM_INPUT_PROPS} v-model:value={form.reportName} maxlength={50} placeholder="请输入报告名称" />
            </FormItem>
          </Col>
          <Col span={12}>
            <FormItem label="统计范围" required>
              <Select v-model:value={form.scopeType} style={{ width: "100%" }}>
                <SelectOption value="ALL">全园区</SelectOption>
                <SelectOption value="AREA">指定风险区域</SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col span={12}>
            <FormItem label="周期类型" required>
              <Select
                value={form.periodType}
                style={{ width: "100%" }}
                onChange={(value: unknown) => onPeriodTypeChange(String(value ?? "QUARTER") as PeriodType)}
              >
                {PERIOD_OPTIONS.map((item) => (
                  <SelectOption key={item.value} value={item.value}>
                    {item.label}
                  </SelectOption>
                ))}
              </Select>
            </FormItem>
          </Col>
          <Col span={12}>
            <FormItem label={form.periodType === "CUSTOM" ? "评审起止" : "周期时间"} required>
              {renderPeriodPicker()}
            </FormItem>
          </Col>
          {form.scopeType === "AREA" && (
            <Col span={12}>
              <FormItem label="风险区域" required>
                <Select v-model:value={form.areaId} allowClear placeholder="请选择风险区域" style={{ width: "100%" }}>
                  {zones.value.map((zone) => (
                    <SelectOption key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectOption>
                  ))}
                </Select>
              </FormItem>
            </Col>
          )}
        </Row>
      </div>
    );

    const renderGenerating = (): JSX.Element => (
      <div class={[styles.stepCard, styles.generatePanel].join(" ")}>
        <div class={styles.generateIcon}>AI</div>
        <p class={styles.generateText}>AI 正在生成评审报告…</p>
        <p class={styles.generateHint}>汇总风险清单、结合法规条款、标注证据来源，完成后进入证据复核。</p>
        <Progress percent={70} status="active" style={{ maxWidth: "320px", margin: "0 auto" }} />
      </div>
    );

    const renderSummary = (summary?: RiskReviewReportSummaryVO): JSX.Element => {
      const normalized = normalizeSummary(summary);
      return (
        <Card class={styles.sectionCard}>
          <div class={styles.sectionHeader}>一、风险管控总体情况</div>
          <div class={styles.summaryGrid}>
            {[
              ["风险单元总数", numericText(normalized.unitTotal)],
              ["风险对象总数", numericText(normalized.objectTotal)],
              ["重大风险单元", numericText(normalized.majorRiskUnitCount)],
              ["较大风险单元", numericText(normalized.largeRiskUnitCount)],
              ["一般风险单元", numericText(normalized.generalRiskUnitCount)],
              ["低风险单元", numericText(normalized.lowRiskUnitCount)],
              ["措施覆盖对象", numericText(normalized.measureCoveredObjectCount)],
              ["评估完成对象", numericText(normalized.assessmentCompletedObjectCount)],
              ["评估计划执行", numericText(normalized.assessmentPlanExecutionCount)],
            ].map(([label, value]) => (
              <div key={label} class={styles.metricCard}>
                <div class={styles.metricValue}>{value}</div>
                <div class={styles.metricLabel}>{label}</div>
              </div>
            ))}
          </div>
          <p class={styles.hiddenDangerLine}>
            管控措施覆盖率 {rateText(normalized.measureCoverageRate)} · 评估完成率 {rateText(normalized.assessmentCompletionRate)}
          </p>
        </Card>
      );
    };

    const renderCompliance = (report: RiskReviewReportVO, locked: boolean): JSX.Element => {
      const complianceColumns = [
        {
          title: "法规条款",
          dataIndex: "standard",
          width: 220,
          customRender: ({ record }: { record: RiskReviewReportComplianceItemVO }) => complianceStandardText(record),
        },
        { title: "核验要点", dataIndex: "checkpoint", ellipsis: true, customRender: ({ text }: { text?: string }) => text || "--" },
        {
          title: "符合性",
          dataIndex: "conclusion",
          width: 150,
          customRender: ({ record, index }: { record: RiskReviewReportComplianceItemVO; index: number }) =>
            locked ? (
              conclusionTag(record.conclusion)
            ) : (
              <Select
                value={String(record.conclusion ?? "PENDING_MANUAL")}
                style={{ width: "120px" }}
                onChange={(value: unknown) => updateComplianceConclusion(index, record, String(value ?? ""))}
              >
                {CONCLUSION_OPTIONS.map((option) => (
                  <SelectOption key={option.value} value={option.value}>
                    {option.label}
                  </SelectOption>
                ))}
              </Select>
            ),
        },
        {
          title: "证据来源",
          width: 240,
          customRender: ({ record }: { record: RiskReviewReportComplianceItemVO }) => (
            <Button
              {...LIST_ACTION_LINK_PROPS}
              class={styles.evidenceSourceButton}
              onClick={() => {
                void showEvidenceModal(record);
              }}
            >
              {evidenceText(record)}
            </Button>
          ),
        },
        {
          title: "复核说明",
          dataIndex: "reviewComment",
          width: 220,
          customRender: ({ record, index }: { record: RiskReviewReportComplianceItemVO; index: number }) =>
            locked ? (
              <span class={styles.reviewCommentCell}>{record.reviewComment || "--"}</span>
            ) : (
              <Textarea
                value={record.reviewComment ?? ""}
                rows={2}
                maxlength={200}
                placeholder="填写人工复核说明"
                onUpdate:value={(value: string) => updateComplianceReviewComment(index, value)}
              />
            ),
        },
      ];
      return (
        <Card class={styles.sectionCard}>
          <div class={styles.sectionHeader}>
            二、法规符合性核验 <Tag color="blue">AI判定</Tag>
          </div>
          <Table
            columns={complianceColumns}
            dataSource={report.complianceItems ?? []}
            rowKey={(row: RiskReviewReportComplianceItemVO, index?: number) => complianceItemKey(row, index)}
            pagination={false}
          />
        </Card>
      );
    };

    const renderReviewStep = (): JSX.Element => {
      const report = activeReport.value;
      if (!report) {
        return (
          <Card>
            <Empty description="暂无报告草稿" />
          </Card>
        );
      }
      const locked = normalizeStatus(report.status) === "SUBMITTED";
      const hiddenDanger = normalizeHiddenDanger(report);
      return (
        <>
          <div class={styles.reviewNotice}>
            本报告由 AI 生成，法规符合性判定为 AI 推断结果，请人工复核每项证据后提交。每项结论的证据来源可点击追溯原始记录。
          </div>
          {report.degraded && <div class={styles.degradedNotice}>AI 中心服务暂不可用，当前为数据汇总报告，不含智能法规符合性判定。</div>}
          {renderSummary(report.summary)}
          {renderCompliance(report, locked)}
          <Card class={styles.sectionCard}>
            <div class={styles.sectionHeader}>三、隐患整改闭环</div>
            <p class={styles.hiddenDangerLine}>
              隐患总数 {numericText(hiddenDanger.totalCount)} · 待整改 {numericText(hiddenDanger.activeCount)} · 已闭环{" "}
              {numericText(hiddenDanger.closedCount)} · 超期未整改 {numericText(hiddenDanger.overdueCount)} · 闭环率{" "}
              {rateText(hiddenDanger.closureRate)}
            </p>
            {!!hiddenDanger.evidences?.length && (
              <Button
                {...LIST_ACTION_LINK_PROPS}
                onClick={() =>
                  void showEvidenceModal({
                    id: "hidden-danger",
                    standard: "隐患整改闭环",
                    checkpoint: "隐患整改闭环",
                    evidences: hiddenDanger.evidences,
                  })
                }
              >
                查看隐患证据
              </Button>
            )}
          </Card>
          <Card class={styles.sectionCard}>
            <div class={styles.sectionHeader}>
              四、问题与建议 <Tag color="blue">AI生成</Tag>
            </div>
            <Textarea
              {...FORM_INPUT_PROPS}
              value={String(report.suggestions ?? "")}
              disabled={locked}
              rows={5}
              placeholder="暂无问题与建议"
              onUpdate:value={updateSuggestions}
            />
          </Card>
        </>
      );
    };

    const renderEmpty = (): JSX.Element => (
      <Card>
        <Result
          status="info"
          title="当前范围暂无可评审的风险数据"
          subTitle="所选统计范围内尚无已完成评估的风险单元，请先完成风险评估后再生成评审报告"
          extra={
            <Button type="primary" onClick={() => (step.value = "params")}>
              返回重新选择范围
            </Button>
          }
        />
      </Card>
    );

    const renderWizard = (): JSX.Element => (
      <div class={styles.reportPage}>
        <div class={styles.wizardHeader}>
          <span class={styles.wizardTitle}>{activeReport.value ? reportName(activeReport.value) : "新建评审报告"}</span>
          {activeReport.value && statusTag(activeReport.value.status)}
        </div>
        {step.value === "params" && renderParamStep()}
        {step.value === "generating" && renderGenerating()}
        {step.value === "review" && renderReviewStep()}
        {step.value === "degraded" && renderReviewStep()}
        {step.value === "empty" && renderEmpty()}
      </div>
    );

    const renderWizardFooter = (): JSX.Element => {
      const report = activeReport.value;
      const locked = report ? normalizeStatus(report.status) === "SUBMITTED" : false;
      const reviewStep = step.value === "review" || step.value === "degraded";
      return (
        <div class={styles.wizardFooterActions}>
          <Button onClick={() => void backToList()}>返回列表</Button>
          {step.value === "params" && (
            <Button type="primary" loading={generating.value} onClick={() => void startGenerate()}>
              开始AI生成
            </Button>
          )}
          {reviewStep && !locked && (
            <>
              <Button onClick={() => (step.value = "params")}>上一步</Button>
              <Button onClick={recheck}>重新核验</Button>
              <Button loading={saving.value} onClick={() => void saveDraft()}>
                存草稿
              </Button>
              <Button type="primary" loading={saving.value} onClick={() => void submitReport()}>
                提交
              </Button>
            </>
          )}
          {reviewStep && report && locked && (
            <Button loading={pdfLoading.value} onClick={() => void exportPdf(report)}>
              导出
            </Button>
          )}
        </div>
      );
    };

    const renderPdfReport = (report: RiskReviewReportVO): JSX.Element => {
      const summary = normalizeSummary(report.summary);
      const hiddenDanger = normalizeHiddenDanger(report);
      return (
        <div class={styles.pdfOutput} ref={pdfOutputRef}>
          <h1 class={styles.pdfTitle}>{reportName(report)}</h1>
          <div class={styles.pdfMeta}>评审周期：{periodLabel(report)}</div>
          <section class={styles.pdfSection}>
            <div class={styles.pdfSectionTitle}>一、风险管控总体情况</div>
            <table class={styles.pdfTable}>
              <tbody>
                <tr>
                  <th>风险单元总数</th>
                  <td>{numericText(summary.unitTotal)}</td>
                  <th>风险对象总数</th>
                  <td>{numericText(summary.objectTotal)}</td>
                </tr>
                <tr>
                  <th>重大/较大/一般/低风险单元</th>
                  <td>
                    {numericText(summary.majorRiskUnitCount)} / {numericText(summary.largeRiskUnitCount)} /{" "}
                    {numericText(summary.generalRiskUnitCount)} / {numericText(summary.lowRiskUnitCount)}
                  </td>
                  <th>评估计划执行次数</th>
                  <td>{numericText(summary.assessmentPlanExecutionCount)}</td>
                </tr>
                <tr>
                  <th>管控措施覆盖对象/覆盖率</th>
                  <td>
                    {numericText(summary.measureCoveredObjectCount)} / {rateText(summary.measureCoverageRate)}
                  </td>
                  <th>评估完成对象/完成率</th>
                  <td>
                    {numericText(summary.assessmentCompletedObjectCount)} / {rateText(summary.assessmentCompletionRate)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
          <section class={styles.pdfSection}>
            <div class={styles.pdfSectionTitle}>二、法规符合性核验</div>
            <table class={styles.pdfTable}>
              <thead>
                <tr>
                  <th>法规条款</th>
                  <th>核验要点</th>
                  <th>符合性</th>
                  <th>证据来源</th>
                  <th>复核说明</th>
                </tr>
              </thead>
              <tbody>
                {(report.complianceItems ?? []).map((item) => (
                  <tr key={toId(item.id ?? item.standardId)}>
                    <td>{complianceStandardText(item)}</td>
                    <td>{item.checkpoint || "--"}</td>
                    <td>{CONCLUSION_LABEL[String(item.conclusion ?? "")] ?? item.conclusion ?? "--"}</td>
                    <td>{evidenceText(item)}</td>
                    <td>{item.reviewComment || "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section class={styles.pdfSection}>
            <div class={styles.pdfSectionTitle}>三、隐患整改闭环</div>
            <p>
              隐患总数 {numericText(hiddenDanger.totalCount)}，待整改 {numericText(hiddenDanger.activeCount)}，已闭环{" "}
              {numericText(hiddenDanger.closedCount)}，超期未整改 {numericText(hiddenDanger.overdueCount)}，闭环率{" "}
              {rateText(hiddenDanger.closureRate)}。
            </p>
          </section>
          <section class={styles.pdfSection}>
            <div class={styles.pdfSectionTitle}>四、问题与建议</div>
            <p>{String(report.suggestions ?? "--")}</p>
          </section>
        </div>
      );
    };

    return (): JSX.Element => (
      <>
        <PcLayout
          title={layoutTitle}
          v-slots={{
            "layout-content": () => (mode.value === "list" ? renderList() : renderWizard()),
            "footer-page": () =>
              mode.value === "list" ? (
                <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />
              ) : (
                renderWizardFooter()
              ),
          }}
        />
        {pdfReport.value && renderPdfReport(pdfReport.value)}
      </>
    );
  },
});
