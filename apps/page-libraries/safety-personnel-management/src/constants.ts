import type { KeyPersonRiskLevel } from "@g2-contract/safety-personnel";

import { GLOBAL_SCENE_CODE } from "./api/file-service";

export const APPLICATION_CODE = "SAFETY_PERSONNEL";

/** 重点人员统计分析看板使用的告警应用编码（原 key-personnel-management） */
export const KEY_PERSON_APPLICATION_CODE = "KEY_PERSONNEL";

export const TABLE_PAGE_SIZE = 10;

export const PERSON_CATEGORY_TABS = [
  { key: "all", label: "全部人员" },
  { key: "safety", label: "安全管理人员" },
  { key: "special", label: "特种作业人员" },
  { key: "emergency", label: "应急救援" },
] as const;

export type PersonCategoryTab = (typeof PERSON_CATEGORY_TABS)[number]["key"];

/** 人员 Tab → 后端 typeCode（ALL 表示全部） */
export const PERSON_CATEGORY_TYPE_CODE: Record<PersonCategoryTab, string | undefined> = {
  all: "ALL",
  safety: "SAFETY",
  special: "SPECIAL",
  emergency: "EMERGENCY",
};

/** 后端 typeCodes 展示文案 */
export const PERSON_TYPE_CODE_LABEL: Record<string, string> = {
  ALL: "全部",
  SAFETY: "安全管理人员",
  SPECIAL: "特种作业人员",
  EMERGENCY: "应急救援",
};

export const RESUME_TABS = [
  { key: "timeline", label: "履职时间线" },
  { key: "patrol", label: "巡查巡更任务" },
  { key: "alarm", label: "告警任务" },
  { key: "approval", label: "审批任务" },
  { key: "meeting", label: "会议" },
  { key: "other", label: "其他" },
] as const;

export type ResumeTabKey = (typeof RESUME_TABS)[number]["key"];

export const EXPIRE_STATUS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "正常", value: "normal" },
  { label: "临期", value: "expiring" },
  { label: "过期", value: "expired" },
] as const;

export const REVIEW_STATUS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "待复审", value: "待复审" },
  { label: "已复审", value: "已复审" },
  { label: "复审逾期", value: "复审逾期" },
  { label: "无需复审", value: "无需复审" },
] as const;

/**
 * file-service 场景码（与后端 FILE_SCENE_CODE 一致）
 * - 上传后存 `file_id`，业务表存 fileId / attachmentFileId
 * - 图片展示用相对 path（如 /minio/...），见 utils/file-url.ts toImageSrc
 */
export const FILE_SCENE_CODE = {
  COMMITTEE_ATTACHMENT: "SAFETY_PERSONNEL::COMMITTEE_ATTACHMENT",
  CERT_ATTACHMENT: "SAFETY_PERSONNEL::CERT_ATTACHMENT",
} as const;

/** file-service variable（bucket），命名勿使用下划线 */
export const FILE_BUCKET = "safety-personnel";

/** 静态资源（由 Portal/网关 /resource 提供，勿 import 进 bundle） */
export const RESOURCE_V1_BASE = "/resource/v1/safety-personnel";
export const ORG_CANVAS_HEADER_ICON = `${RESOURCE_V1_BASE}/org.png`;

/** @deprecated 使用 FILE_SCENE_CODE */
export const SCENE = FILE_SCENE_CODE;

/** 安委会变更记录 changeType 枚举展示 */
export const COMMITTEE_CHANGE_TYPE_LABEL: Record<string, string> = {
  CREATE: "创建",
  UPDATE: "编辑",
  DELETE: "删除",
};

export const COMMITTEE_ATTACHMENT_TYPES = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".jpg",
  ".png",
  ".PDF",
  ".DOC",
  ".DOCX",
  ".XLS",
  ".XLSX",
  ".JPG",
  ".PNG",
];

/** 重点人员（原 key-personnel-management） */

export const KEY_PERSON_DEFAULT_PAGE_SIZE = 10;
export const KEY_PERSON_REPORT_PAGE_SIZE = 10;
export const KEY_PERSON_TRACK_PAGE_SIZE = 5;

export const KEY_PERSON_SCENE = {
  PHOTO: GLOBAL_SCENE_CODE.securityKeyPersonPhoto,
  ATTACHMENT: GLOBAL_SCENE_CODE.securityKeyPersonAttachment,
  REPORT: GLOBAL_SCENE_CODE.securityKeyPersonReportAttachment,
} as const;

export const KEY_PERSON_ATTACHMENT_TYPE_LIST = [
  ".png",
  ".jpg",
  ".jpeg",
  ".PNG",
  ".JPG",
  ".JPEG",
  ".mp4",
  ".avi",
  ".mkv",
  ".MP4",
  ".AVI",
  ".MKV",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".pdf",
  ".DOC",
  ".DOCX",
  ".XLS",
  ".XLSX",
  ".PPT",
  ".PPTX",
  ".PDF",
];

export const KEY_PERSON_RISK_LEVEL_OPTIONS: { label: string; value: KeyPersonRiskLevel | "" }[] = [
  { label: "全部风险", value: "" },
  { label: "高风险", value: "HIGH" },
  { label: "中风险", value: "MEDIUM" },
  { label: "低风险", value: "LOW" },
];

export const KEY_PERSON_RISK_LEVEL_LABEL: Record<KeyPersonRiskLevel, string> = {
  HIGH: "高风险",
  MEDIUM: "中风险",
  LOW: "低风险",
};
