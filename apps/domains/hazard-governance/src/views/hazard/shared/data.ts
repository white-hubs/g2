import {
  HazardActionCode,
  HazardAcceptanceRootCauseCode,
  HazardGovernanceStatus,
  HazardLevel as HazardLevelEnum,
  HazardSourceType as HazardSourceTypeEnum,
} from "@g2-contract/hazard-governance";

export type HazardLevel = HazardLevelEnum;
export type HazardStatus = HazardGovernanceStatus;
export type HazardSourceType = HazardSourceTypeEnum;
export type HazardChannel = "all" | "ai" | "manual";

export interface HazardRecord {
  id: string;
  title: string;
  location: string;
  level: HazardLevel;
  status: HazardStatus;
  channel: Exclude<HazardChannel, "all">;
  source: string;
  foundBy: string;
  foundAt: string;
  owner: string;
  deadline: string;
  type: string;
  riskPoint: string;
  aiAdvice: string;
  progress: number;
  overdueDays: number;
  recurrenceCount: number;
  actions?: HazardActionCode[];
}

export interface ApprovalRecord {
  id: string;
  hazardId: string;
  title: string;
  level: HazardLevel;
  applicant: string;
  currentNode: string;
  submittedAt: string;
  deadline: string;
  routeReason: string;
}

export interface RuleRecord {
  id: string;
  parentId?: string;
  name: string;
  level: HazardLevel;
  approvalTemplate: string;
  limitHours: number;
  returnThreshold: number;
  aiScenes: string[];
}

export interface RootCauseRecord {
  id: string;
  location: string;
  type: string;
  count: number;
  avgDays: number;
  riskPoint: string;
  status: string;
  advice: string;
}

export const hazardLevelConfigs: Array<{
  value: HazardLevel;
  label: string;
  color: string;
}> = [
  { value: HazardLevelEnum.CRITICAL, label: "特重大", color: "red" },
  { value: HazardLevelEnum.MAJOR, label: "重大", color: "orange" },
  { value: HazardLevelEnum.GENERAL, label: "一般", color: "blue" },
];

export const levelText = hazardLevelConfigs.reduce(
  (record, item) => ({ ...record, [item.value]: item.label }),
  {} as Record<HazardLevel, string>,
);

export const levelColor = hazardLevelConfigs.reduce(
  (record, item) => ({ ...record, [item.value]: item.color }),
  {} as Record<HazardLevel, string>,
);

export const hazardLevelOptions = hazardLevelConfigs.map((item) => ({ label: item.label, value: item.value }));

export const normalizeHazardLevel = (value: string | undefined): HazardLevel =>
  hazardLevelConfigs.find((item) => item.value === value)?.value ?? HazardLevelEnum.GENERAL;

export const statusText: Record<HazardStatus, string> = {
  [HazardGovernanceStatus.PENDING_CONFIRM]: "待确认",
  [HazardGovernanceStatus.PENDING_PLAN]: "待填写",
  [HazardGovernanceStatus.PENDING_APPROVAL]: "待审批",
  [HazardGovernanceStatus.PLAN_REJECTED]: "方案被退回",
  [HazardGovernanceStatus.RECTIFYING]: "整改中",
  [HazardGovernanceStatus.PENDING_ACCEPTANCE]: "待验收",
  [HazardGovernanceStatus.ACCEPTANCE_REJECTED]: "验收不通过",
  [HazardGovernanceStatus.MISREPORTED]: "误报",
  [HazardGovernanceStatus.ACCEPTANCE_COMPLETED]: "验收完成",
};

export const statusColor: Record<HazardStatus, string> = {
  [HazardGovernanceStatus.PENDING_CONFIRM]: "orange",
  [HazardGovernanceStatus.PENDING_PLAN]: "warning",
  [HazardGovernanceStatus.PENDING_APPROVAL]: "processing",
  [HazardGovernanceStatus.PLAN_REJECTED]: "red",
  [HazardGovernanceStatus.RECTIFYING]: "blue",
  [HazardGovernanceStatus.PENDING_ACCEPTANCE]: "purple",
  [HazardGovernanceStatus.ACCEPTANCE_REJECTED]: "red",
  [HazardGovernanceStatus.MISREPORTED]: "default",
  [HazardGovernanceStatus.ACCEPTANCE_COMPLETED]: "green",
};

export const hazardStatusValues = Object.keys(statusText) as HazardStatus[];

export const normalizeHazardStatus = (value: string | undefined): HazardStatus | undefined => {
  if (!value) return undefined;
  const upperValue = value.toUpperCase();
  return hazardStatusValues.find((status) => status === upperValue);
};

export const channelText: Record<Exclude<HazardChannel, "all">, string> = {
  ai: "AI自动转入",
  manual: "人工排查转入",
};

export const hazardSourceTypeConfigs: Array<{
  value: HazardSourceType;
  label: string;
  color: string;
}> = [
  { value: HazardSourceTypeEnum.AI_WARNING, label: "AI视频巡检", color: "blue" },
  { value: HazardSourceTypeEnum.IOT_ALARM, label: "IOT告警", color: "orange" },
  { value: HazardSourceTypeEnum.INSPECTION, label: "巡检", color: "purple" },
  { value: HazardSourceTypeEnum.AI_IMAGE_RECOGNITION, label: "AI图片识别", color: "cyan" },
  { value: HazardSourceTypeEnum.MANUAL, label: "人员录入", color: "green" },
];

export const sourceTypeText = hazardSourceTypeConfigs.reduce(
  (record, item) => ({ ...record, [item.value]: item.label }),
  {} as Record<HazardSourceType, string>,
);

export const sourceTypeColor = hazardSourceTypeConfigs.reduce(
  (record, item) => ({ ...record, [item.value]: item.color }),
  {} as Record<HazardSourceType, string>,
);

export const hazardSourceTypeValues = hazardSourceTypeConfigs.map((item) => item.value);

export const normalizeHazardSourceType = (value: string | undefined): HazardSourceType | undefined => {
  if (!value) return undefined;
  const upperValue = value.toUpperCase();
  if (upperValue === "AI") return HazardSourceTypeEnum.AI_IMAGE_RECOGNITION;
  if (upperValue === "MANUAL") return HazardSourceTypeEnum.MANUAL;
  return hazardSourceTypeValues.find((sourceType) => sourceType === upperValue);
};

export const sourceTypeOptions = [
  { label: "全部来源", value: "" },
  ...hazardSourceTypeConfigs.map((item) => ({ label: item.label, value: item.value })),
];

export const requiredSourceTypeOptions = hazardSourceTypeConfigs.map((item) => ({ label: item.label, value: item.value }));

export const channelOptions = [
  { label: "全部来源", value: "" },
  { label: channelText.ai, value: "ai" },
  { label: channelText.manual, value: "manual" },
];

export const levelOptions = [{ label: "全部等级", value: "" }, ...hazardLevelOptions];

export const statusOptions = [
  { label: "全部状态", value: "" },
  ...hazardStatusValues.map((status) => ({ label: statusText[status], value: status })),
];

export const approvalTemplateOptions = ["T1", "T2", "T3", "自定义"].map((item) => ({ label: item, value: item }));

export const rootCauseTagOptions = [
  { label: "管理缺陷", value: HazardAcceptanceRootCauseCode.MANAGEMENT_DEFECT },
  { label: "制度缺失", value: HazardAcceptanceRootCauseCode.SYSTEM_DEFICIENCY },
  { label: "设备老化", value: HazardAcceptanceRootCauseCode.EQUIPMENT_AGING },
  { label: "培训不足", value: HazardAcceptanceRootCauseCode.TRAINING_INSUFFICIENT },
  { label: "设计缺陷", value: HazardAcceptanceRootCauseCode.DESIGN_DEFECT },
  { label: "不可抗力", value: HazardAcceptanceRootCauseCode.FORCE_MAJEURE },
  { label: "人为违规", value: HazardAcceptanceRootCauseCode.HUMAN_VIOLATION },
];

export const rectificationDeadlineHours = [24, 72, 120, 168, 240, 360] as const;

export type RectificationDeadlineHours = (typeof rectificationDeadlineHours)[number];

export const formatRectificationDeadlineHours = (hours: number): string => `${hours}h（${Math.max(1, Math.floor(hours / 24))}天）`;

export const rectificationDeadlineHourOptions = rectificationDeadlineHours.map((hours) => ({
  label: formatRectificationDeadlineHours(hours),
  value: hours,
}));

export const hazards: HazardRecord[] = [
  {
    id: "HZ-20260612-001",
    title: "B区2F东侧消防通道堆积杂物，通行宽度不足1.2m",
    location: "B区2F东侧走廊",
    level: HazardLevelEnum.GENERAL,
    status: HazardGovernanceStatus.PENDING_CONFIRM,
    channel: "manual",
    source: "巡检应用",
    foundBy: "张三",
    foundAt: "2026-06-12 09:00",
    owner: "李四",
    deadline: "2026-06-19 18:00",
    type: "消防通道占用",
    riskPoint: "R001 消防通道堵塞",
    aiAdvice: "清理通道杂物，设置禁占标识，并纳入每日巡检点位。",
    progress: 0,
    overdueDays: 0,
    recurrenceCount: 1,
    actions: [HazardActionCode.CONFIRM, HazardActionCode.FALSE_REPORT, HazardActionCode.VIEW],
  },
  {
    id: "HZ-20260612-002",
    title: "冷库A氨气探测器连续报警，疑似阀组密封异常",
    location: "冷库A机房",
    level: HazardLevelEnum.CRITICAL,
    status: HazardGovernanceStatus.PENDING_APPROVAL,
    channel: "ai",
    source: "视频安全",
    foundBy: "AI视频巡检",
    foundAt: "2026-06-12 08:30",
    owner: "王五",
    deadline: "2026-06-14 18:00",
    type: "危化介质泄漏",
    riskPoint: "R018 氨制冷系统泄漏",
    aiAdvice: "立即隔离现场，复核阀组密封并提交专项处置方案。",
    progress: 20,
    overdueDays: 0,
    recurrenceCount: 2,
    actions: [HazardActionCode.APPROVAL, HazardActionCode.VIEW],
  },
  {
    id: "HZ-20260612-006",
    title: "冷库B安全阀检验标识到期，需补充专项整改措施",
    location: "冷库B机房",
    level: HazardLevelEnum.MAJOR,
    status: HazardGovernanceStatus.PENDING_PLAN,
    channel: "manual",
    source: "专项排查",
    foundBy: "刘工",
    foundAt: "2026-06-12 11:20",
    owner: "郑安全",
    deadline: "2026-06-17 18:00",
    type: "设备检验超期",
    riskPoint: "R026 特种设备安全附件",
    aiAdvice: "补充整改方案、临时管控措施和复检计划后提交审批。",
    progress: 28,
    overdueDays: 0,
    recurrenceCount: 1,
    actions: [HazardActionCode.FILL_PLAN, HazardActionCode.VIEW],
  },
  {
    id: "HZ-20260611-017",
    title: "3号仓库叉车充电区电缆外皮破损",
    location: "3号仓库西侧",
    level: HazardLevelEnum.MAJOR,
    status: HazardGovernanceStatus.RECTIFYING,
    channel: "manual",
    source: "随手拍",
    foundBy: "赵敏",
    foundAt: "2026-06-11 16:20",
    owner: "钱七",
    deadline: "2026-06-15 18:00",
    type: "用电安全",
    riskPoint: "R009 临时用电",
    aiAdvice: "更换电缆、补装防护套管，整改期间停止该充电位使用。",
    progress: 65,
    overdueDays: 1,
    recurrenceCount: 3,
    actions: [HazardActionCode.UPDATE_PROGRESS, HazardActionCode.URGE, HazardActionCode.VIEW],
  },
  {
    id: "HZ-20260610-009",
    title: "粮仓温湿度异常点位复测仍高于阈值",
    location: "2号粮仓北侧",
    level: HazardLevelEnum.MAJOR,
    status: HazardGovernanceStatus.PENDING_ACCEPTANCE,
    channel: "ai",
    source: "智能粮情",
    foundBy: "系统自动",
    foundAt: "2026-06-10 10:45",
    owner: "孙八",
    deadline: "2026-06-16 12:00",
    type: "仓储环境异常",
    riskPoint: "R021 粮情发热",
    aiAdvice: "复核通风设备运行，完成翻仓降温并提交前后温湿度记录。",
    progress: 100,
    overdueDays: 0,
    recurrenceCount: 4,
    actions: [HazardActionCode.ACCEPTANCE, HazardActionCode.VIEW],
  },
  {
    id: "HZ-20260608-004",
    title: "承包商动火作业围挡缺失",
    location: "维修车间南门",
    level: HazardLevelEnum.GENERAL,
    status: HazardGovernanceStatus.ACCEPTANCE_COMPLETED,
    channel: "manual",
    source: "政府检查录入",
    foundBy: "陈安",
    foundAt: "2026-06-08 14:10",
    owner: "周九",
    deadline: "2026-06-10 18:00",
    type: "危险作业管理",
    riskPoint: "R013 动火作业",
    aiAdvice: "补齐围挡、灭火器和监护记录，复训承包商作业规范。",
    progress: 100,
    overdueDays: 0,
    recurrenceCount: 1,
    actions: [HazardActionCode.VIEW],
  },
];

export const approvals: ApprovalRecord[] = [
  {
    id: "AP-20260612-002",
    hazardId: "HZ-20260612-002",
    title: "冷库A氨气探测器连续报警专项处置方案",
    level: HazardLevelEnum.CRITICAL,
    applicant: "王五",
    currentNode: "安全总监",
    submittedAt: "2026-06-12 10:10",
    deadline: "2026-06-13 10:10",
    routeReason: "特重大隐患触发 T3 审批链",
  },
  {
    id: "AP-20260611-017",
    hazardId: "HZ-20260611-017",
    title: "叉车充电区电缆更换与临时隔离方案",
    level: HazardLevelEnum.MAJOR,
    applicant: "钱七",
    currentNode: "安全部门负责人",
    submittedAt: "2026-06-11 17:00",
    deadline: "2026-06-12 17:00",
    routeReason: "重大隐患触发 T2 审批链",
  },
];

export const rules: RuleRecord[] = [
  {
    id: "fire",
    name: "消防安全",
    level: HazardLevelEnum.MAJOR,
    approvalTemplate: "T2",
    limitHours: 72,
    returnThreshold: 3,
    aiScenes: ["通道占用", "烟火识别"],
  },
  {
    id: "fire-channel",
    parentId: "fire",
    name: "消防通道占用",
    level: HazardLevelEnum.MAJOR,
    approvalTemplate: "T2",
    limitHours: 168,
    returnThreshold: 3,
    aiScenes: ["通道占用"],
  },
  {
    id: "hazmat",
    name: "危化安全",
    level: HazardLevelEnum.CRITICAL,
    approvalTemplate: "T3",
    limitHours: 48,
    returnThreshold: 2,
    aiScenes: ["气体报警", "视频烟雾"],
  },
  {
    id: "electric",
    name: "用电安全",
    level: HazardLevelEnum.MAJOR,
    approvalTemplate: "T2",
    limitHours: 96,
    returnThreshold: 3,
    aiScenes: ["电缆破损", "温升异常"],
  },
  {
    id: "storage",
    name: "仓储安全",
    level: HazardLevelEnum.GENERAL,
    approvalTemplate: "T1",
    limitHours: 168,
    returnThreshold: 4,
    aiScenes: ["粮情异常", "堆垛违规"],
  },
];

export const rootCauses: RootCauseRecord[] = [
  {
    id: "RC-001",
    location: "2号粮仓北侧",
    type: "仓储环境异常",
    count: 4,
    avgDays: 6,
    riskPoint: "R021",
    status: "重点关注",
    advice: "通风策略与设备巡检频次不足，建议触发风险再评估。",
  },
  {
    id: "RC-002",
    location: "3号仓库西侧",
    type: "用电安全",
    count: 3,
    avgDays: 9,
    riskPoint: "R009",
    status: "持续跟踪",
    advice: "充电区临时用电管理薄弱，建议固化责任点检表。",
  },
  {
    id: "RC-003",
    location: "B区2F东侧走廊",
    type: "消防通道占用",
    count: 3,
    avgDays: 11,
    riskPoint: "R001",
    status: "重点关注",
    advice: "商户卸货动线与消防通道冲突，建议调整堆放边界。",
  },
];

export const workflowNodes = ["接收", "确认", "分级", "整改", "审批", "验收", "闭环"];
