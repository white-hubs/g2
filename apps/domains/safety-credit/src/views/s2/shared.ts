import type {
  BehaviorAuditStatus,
  BehaviorInputType,
  BehaviorType,
  BenefitRecordStatus,
  CheckExecutionStatus,
  ChecklistStatus,
  CreditGrade,
  CreditStatus,
  QualityReviewResult,
  QualityStatus,
  SafetyCreditBenefitType,
  SafetyCreditGradeThreshold,
  SafetyCreditIndustryType,
  ScoreModelStatus,
} from "@g2-contract/safety-credit";
import dayjs, { type Dayjs } from "dayjs";

export interface Option<T extends string> {
  label: string;
  value: T;
}

export const industryTypeOptions: Option<SafetyCreditIndustryType>[] = [
  { label: "农批", value: "AGRICULTURAL_WHOLESALE" },
  { label: "餐饮", value: "CATERING" },
  { label: "仓储", value: "WAREHOUSING" },
  { label: "零售", value: "RETAIL" },
  { label: "冷链", value: "COLD_CHAIN" },
  { label: "物流", value: "LOGISTICS" },
  { label: "其他", value: "OTHER" },
];

export const behaviorTypeOptions: Option<BehaviorType>[] = [
  { label: "违规扣分", value: "PENALTY" },
  { label: "加分", value: "BONUS" },
  { label: "自查超期", value: "CHECK_OVERDUE" },
  { label: "自查虚假", value: "CHECK_FAKE" },
  { label: "月度达标", value: "CHECK_MONTHLY_QUALIFIED" },
];

export const inputTypeOptions: Option<BehaviorInputType>[] = [
  { label: "外部推送", value: "EXTERNAL_PUSH" },
  { label: "系统生成", value: "SYSTEM_GENERATED" },
  { label: "人工录入", value: "MANUAL" },
];

export const auditStatusOptions: Option<BehaviorAuditStatus>[] = [
  { label: "自动通过", value: "AUTO_ACCEPTED" },
  { label: "待审核", value: "PENDING" },
  { label: "已通过", value: "APPROVED" },
  { label: "已驳回", value: "REJECTED" },
];

export const scoreModelStatusOptions: Option<ScoreModelStatus>[] = [
  { label: "草稿", value: "DRAFT" },
  { label: "已发布", value: "PUBLISHED" },
  { label: "已归档", value: "ARCHIVED" },
  { label: "已停用", value: "DISABLED" },
];

export const gradeOptions: Option<CreditGrade>[] = [
  { label: "A级", value: "A" },
  { label: "B级", value: "B" },
  { label: "C级", value: "C" },
  { label: "D级", value: "D" },
];

export const checkCategoryOptions: Option<string>[] = [
  { label: "消防", value: "消防" },
  { label: "电气", value: "电气" },
  { label: "燃气", value: "燃气" },
  { label: "电动车", value: "电动车" },
  { label: "仓储", value: "仓储" },
  { label: "其他", value: "其他" },
];

export const creditStatusOptions: Option<CreditStatus>[] = [
  { label: "正常", value: "NORMAL" },
  { label: "停用", value: "SUSPENDED" },
];

export const checklistStatusOptions: Option<ChecklistStatus>[] = [
  { label: "草稿", value: "DRAFT" },
  { label: "发布", value: "PUBLISHED" },
  { label: "历史", value: "HISTORY" },
];

export const checkExecutionStatusOptions: Option<CheckExecutionStatus>[] = [
  { label: "待处理", value: "PENDING" },
  { label: "部分完成", value: "PARTIAL_COMPLETED" },
  { label: "已完成", value: "COMPLETED" },
  { label: "逾期", value: "OVERDUE" },
];

export const qualityStatusOptions: Option<QualityStatus>[] = [
  { label: "待识别", value: "PENDING_AI" },
  { label: "合格", value: "QUALIFIED" },
  { label: "疑似虚假", value: "SUSPECTED_FAKE" },
  { label: "确认虚假", value: "CONFIRMED_FAKE" },
];

export const qualityReviewResultOptions: Option<QualityReviewResult>[] = [
  { label: "待复核", value: "PENDING_REVIEW" },
  { label: "确认合格", value: "CONFIRMED_QUALIFIED" },
  { label: "确认虚假", value: "CONFIRMED_FAKE" },
];

export const benefitRecordStatusOptions: Option<BenefitRecordStatus>[] = [
  { label: "待确认", value: "WAIT_CONFIRM" },
  { label: "已生效", value: "EFFECTIVE" },
  { label: "已取消", value: "CANCELLED" },
];

export const benefitTypeOptions: Option<SafetyCreditBenefitType>[] = [
  { label: "停车费减免", value: "PARKING_FEE_REDUCTION" },
  { label: "保险优惠", value: "INSURANCE_DISCOUNT" },
  { label: "检查频次减免", value: "CHECK_FREQUENCY_REDUCTION" },
  { label: "优先服务", value: "PRIORITY_SERVICE" },
  { label: "宣传推荐", value: "PUBLICITY_RECOMMENDATION" },
];

export const defaultAiSuggestionSummary = "点击按钮获取AI建议";

export function displayText(value?: boolean | number | string | null): string {
  if (value === true) {
    return "是";
  }
  if (value === false) {
    return "否";
  }
  if (value === 0) {
    return "0";
  }
  return String(value ?? "").trim() || "--";
}

function toDayjs(value: unknown): Dayjs | undefined {
  if (value == null) {
    return undefined;
  }
  if (value instanceof Date) {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : undefined;
  }
  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] = value.map((item) => Number(item));
    if ([year, month, day, hour, minute, second, nano].some((item) => Number.isNaN(item))) {
      return undefined;
    }
    const parsed = dayjs(new Date(year, month - 1, day, hour, minute, second, Math.floor(nano / 1_000_000)));
    return parsed.isValid() ? parsed : undefined;
  }
  if (typeof value === "number") {
    const milliseconds = value < 10_000_000_000 ? value * 1000 : value;
    const parsed = dayjs(milliseconds);
    return parsed.isValid() ? parsed : undefined;
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (text === "") {
      return undefined;
    }
    if (/^\d+$/.test(text)) {
      const timestamp = Number(text);
      const milliseconds = text.length <= 10 ? timestamp * 1000 : timestamp;
      const parsed = dayjs(milliseconds);
      return parsed.isValid() ? parsed : undefined;
    }
    const matched = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (matched != null) {
      const [, year, month, day, hour = "0", minute = "0", second = "0"] = matched;
      const parsed = dayjs(new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
      return parsed.isValid() ? parsed : undefined;
    }
    const parsed = dayjs(text);
    return parsed.isValid() ? parsed : undefined;
  }
  return undefined;
}

export function formatDateTime(value?: unknown): string {
  const parsed = toDayjs(value);
  return parsed === undefined ? displayText(value as string | number | boolean | null | undefined) : parsed.format("YYYY-MM-DD HH:mm:ss");
}

export function industryTypeLabel(value?: string | null): string {
  const option = industryTypeOptions.find((item) => item.value === value);
  return option?.label ?? displayText(value);
}

export function cleanText(value?: string | number | null): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const trimmed = String(value).trim();
  return trimmed === "" ? undefined : trimmed;
}

export function toQueryPeriod(value: [string, string]): string | undefined {
  const begin = cleanText(value[0]);
  const end = cleanText(value[1]);
  if (begin === undefined && end === undefined) {
    return undefined;
  }
  return `${begin ?? ""},${end ?? ""}`;
}

export function toNumber(value: number | string, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function behaviorTypeLabel(value?: BehaviorType): string {
  return behaviorTypeOptions.find((item) => item.value === value)?.label ?? displayText(value);
}

export function inputTypeLabel(value?: BehaviorInputType): string {
  if (value === "EXTERNAL_PUSH" || value === "SYSTEM_GENERATED") {
    return "自动推送";
  }
  return inputTypeOptions.find((item) => item.value === value)?.label ?? displayText(value);
}

export function auditStatusLabel(value?: BehaviorAuditStatus): string {
  if (value === "AUTO_ACCEPTED") {
    return "已通过";
  }
  return auditStatusOptions.find((item) => item.value === value)?.label ?? displayText(value);
}

export function auditStatusColor(value?: BehaviorAuditStatus): string {
  if (value === "APPROVED" || value === "AUTO_ACCEPTED") {
    return "green";
  }
  if (value === "REJECTED") {
    return "red";
  }
  return "orange";
}

export function scoreModelStatusLabel(value?: ScoreModelStatus): string {
  return scoreModelStatusOptions.find((item) => item.value === value)?.label ?? displayText(value);
}

export function scoreModelStatusColor(value?: ScoreModelStatus): string {
  if (value === "PUBLISHED") {
    return "green";
  }
  if (value === "ARCHIVED") {
    return "blue";
  }
  if (value === "DISABLED") {
    return "red";
  }
  return "orange";
}

export function creditGradeLabel(value?: CreditGrade): string {
  return gradeOptions.find((item) => item.value === value)?.label ?? displayText(value);
}

export function creditGradeColor(value?: CreditGrade): string {
  if (value === "A") {
    return "green";
  }
  if (value === "B") {
    return "blue";
  }
  if (value === "C") {
    return "orange";
  }
  if (value === "D") {
    return "red";
  }
  return "default";
}

export function creditStatusLabel(value?: CreditStatus): string {
  return creditStatusOptions.find((item) => item.value === value)?.label ?? displayText(value);
}

export function creditStatusColor(value?: CreditStatus): string {
  if (value === "SUSPENDED") {
    return "red";
  }
  if (value === "NORMAL") {
    return "green";
  }
  return "default";
}

export function checklistStatusLabel(value?: ChecklistStatus): string {
  return checklistStatusOptions.find((item) => item.value === value)?.label ?? displayText(value);
}

export function checklistStatusColor(value?: ChecklistStatus): string {
  if (value === "PUBLISHED") {
    return "green";
  }
  if (value === "HISTORY") {
    return "blue";
  }
  return "orange";
}

export function checkExecutionStatusLabel(value?: CheckExecutionStatus): string {
  return checkExecutionStatusOptions.find((item) => item.value === value)?.label ?? displayText(value);
}

export function checkExecutionStatusColor(value?: CheckExecutionStatus): string {
  if (value === "COMPLETED") {
    return "green";
  }
  if (value === "OVERDUE") {
    return "red";
  }
  if (value === "PARTIAL_COMPLETED") {
    return "blue";
  }
  return "orange";
}

export function qualityStatusLabel(value?: QualityStatus): string {
  return qualityStatusOptions.find((item) => item.value === value)?.label ?? displayText(value);
}

export function qualityStatusColor(value?: QualityStatus): string {
  if (value === "QUALIFIED") {
    return "green";
  }
  if (value === "CONFIRMED_FAKE") {
    return "red";
  }
  if (value === "SUSPECTED_FAKE") {
    return "orange";
  }
  return "blue";
}

export function qualityReviewResultLabel(value?: QualityReviewResult): string {
  return qualityReviewResultOptions.find((item) => item.value === value)?.label ?? displayText(value);
}

export function benefitRecordStatusLabel(value?: BenefitRecordStatus): string {
  return benefitRecordStatusOptions.find((item) => item.value === value)?.label ?? displayText(value);
}

export function benefitTypeLabel(value?: SafetyCreditBenefitType | string): string {
  return benefitTypeOptions.find((item) => item.value === value)?.label ?? displayText(value);
}

export function benefitRecordStatusColor(value?: BenefitRecordStatus): string {
  if (value === "EFFECTIVE") {
    return "green";
  }
  if (value === "CANCELLED") {
    return "red";
  }
  return "orange";
}

export function parseJsonArray<T>(value?: string): T[] {
  if (value === undefined || value.trim() === "") {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function createDefaultGradeThresholds(): SafetyCreditGradeThreshold[] {
  return [
    { grade: "A", minScore: 90, maxScore: 100 },
    { grade: "B", minScore: 80, maxScore: 89 },
    { grade: "C", minScore: 60, maxScore: 79 },
    { grade: "D", minScore: 0, maxScore: 59 },
  ];
}
