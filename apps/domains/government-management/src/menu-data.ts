export const BASE = "/d/government-management";

export interface ApprovalPageConfig {
  slug: string;
  title: string;
  businessType: string;
  tableCode: string;
  entry: string;
  applicantFilters?: boolean;
}

export const APPROVAL_PAGES: ApprovalPageConfig[] = [
  {
    slug: "systemSolicitatioList",
    title: "制度征求",
    businessType: "OFFICIAL_REGULATION",
    tableCode: "OFFICIAL_REGULATION",
    entry: "zdzq",
  },
  {
    slug: "tender-review",
    title: "招标审议",
    businessType: "TENDER_REVIEW",
    tableCode: "TENDER_REVIEW",
    entry: "TENDER_REVIEW",
    applicantFilters: true,
  },
  {
    slug: "tender-approval",
    title: "招标审批",
    businessType: "TENDER_APPROVAL",
    tableCode: "TENDER_APPROVAL",
    entry: "TENDER_APPROVAL",
    applicantFilters: true,
  },
  {
    slug: "tender-confirmation",
    title: "招标确认",
    businessType: "TENDER_CONFIRMATION",
    tableCode: "TENDER_CONFIRMATION",
    entry: "TENDER_CONFIRMATION",
    applicantFilters: true,
  },
  { slug: "useSealApprovalList", title: "用印申请", businessType: "OFFICIAL_SEAL", tableCode: "OFFICIAL_SEAL", entry: "yysq" },
  {
    slug: "seal-borrowing",
    title: "借章申请",
    businessType: "SEAL_BORROWING",
    tableCode: "SEAL_BORROWING",
    entry: "SEAL_BORROWING",
    applicantFilters: true,
  },
  { slug: "issueApprovalList", title: "议题申请", businessType: "OFFICIAL_TOPIC", tableCode: "OFFICIAL_TOPIC", entry: "ytsq" },
  {
    slug: "documentApprovalList",
    title: "传阅申请",
    businessType: "OFFICIAL_DOCUMENT_CIRCULATION",
    tableCode: "OFFICIAL_DOCUMENT_CIRCULATION",
    entry: "cysq",
  },
  {
    slug: "documentReceivedList",
    title: "来文申请",
    businessType: "OFFICIAL_DOCUMENT_RECEIVED",
    tableCode: "OFFICIAL_DOCUMENT_RECEIVED",
    entry: "lwsq",
  },
  { slug: "departmentWorkList", title: "测试审批", businessType: "OFFICIAL_KEY_WORK", tableCode: "OFFICIAL_KEY_WORK", entry: "bmgzzd" },
  {
    slug: "matterUrgeApprovalList",
    title: "催办申请",
    businessType: "OFFICIAL_URGENT_WORK",
    tableCode: "OFFICIAL_URGENT_WORK",
    entry: "cbsq",
  },
];

export interface StatisticPageConfig {
  slug: string;
  title: string;
  kind: "system" | "seal" | "issue" | "documentReceived" | "keywork" | "focusWork" | "focusWorkChange";
  tableCode: string;
  entry: string;
  columns: { title: string; dataIndex: string }[];
  detailKey?: string;
}

export const STATISTIC_PAGES: StatisticPageConfig[] = [
  {
    slug: "systemStatistics",
    title: "制度统计",
    kind: "system",
    tableCode: "SYS_STATICS",
    entry: "zdtj",
    detailKey: "deptId",
    columns: [
      { title: "所在部门", dataIndex: "deptName" },
      { title: "制度征求次数", dataIndex: "applyNum" },
    ],
  },
  {
    slug: "useSealStatistics",
    title: "申请统计",
    kind: "seal",
    tableCode: "USE_SEAL",
    entry: "sqtj",
    detailKey: "sealId",
    columns: [
      { title: "申请印章", dataIndex: "sealName" },
      { title: "申请人数", dataIndex: "applicantNum" },
      { title: "申请次数", dataIndex: "applyNum" },
    ],
  },
  {
    slug: "issueStatistics",
    title: "议题预报统计",
    kind: "issue",
    tableCode: "ISSUE_STATISTICS",
    entry: "yyybtj",
    detailKey: "deptId",
    columns: [
      { title: "所在部门", dataIndex: "deptName" },
      { title: "议题预报次数", dataIndex: "applyNum" },
    ],
  },
  {
    slug: "documentReceivedStatistics",
    title: "来文统计",
    kind: "documentReceived",
    tableCode: "DOCUMENT_RECEIVED",
    entry: "lwtj",
    columns: [
      { title: "来文单位", dataIndex: "fromUnit" },
      { title: "来文编号", dataIndex: "fileCode" },
      { title: "发起人", dataIndex: "applicantName" },
      { title: "发起时间", dataIndex: "applyTime" },
      { title: "处理时间", dataIndex: "applyDoneTime" },
      { title: "完成时限", dataIndex: "timeLimit" },
      { title: "是否超时", dataIndex: "timeout" },
      { title: "超时时长", dataIndex: "timeoutDesc" },
    ],
  },
  {
    slug: "departmentWorkStatistics",
    title: "部门统计",
    kind: "keywork",
    tableCode: "DEPART_WORK_STATISTICS",
    entry: "bmtj",
    columns: [
      { title: "部门", dataIndex: "deptName" },
      { title: "发起次数", dataIndex: "applyNum" },
      { title: "审批通过次数", dataIndex: "passNum" },
    ],
  },
  {
    slug: "approvalStatistics",
    title: "审批统计",
    kind: "focusWork",
    tableCode: "APPROVAL_STATISTICS",
    entry: "sxtj",
    columns: [
      { title: "姓名", dataIndex: "applicantName" },
      { title: "部门", dataIndex: "deptName" },
      { title: "发起次数", dataIndex: "applyNum" },
      { title: "审批通过次数", dataIndex: "passNum" },
    ],
  },
  {
    slug: "exchangeStatistics",
    title: "变更统计",
    kind: "focusWorkChange",
    tableCode: "EXCHANGE_STATISTICS",
    entry: "bgtj",
    columns: [
      { title: "部门", dataIndex: "deptName" },
      { title: "督办事项", dataIndex: "focusWorkName" },
      { title: "变更次数", dataIndex: "applyNum" },
      { title: "中止次数", dataIndex: "stopNum" },
      { title: "延期次数", dataIndex: "delayNum" },
    ],
  },
];

export function menuPath(slug: string): string {
  return `${BASE}/${slug}`;
}
