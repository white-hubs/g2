export const TABLE_PAGE_SIZE = 10;

/** 信源每次采集条数上限 */
export const SOURCE_MAX_ITEMS = 50;

export const APPLICATION_CODE = "SECURITY_OPINION_MONITORING";

export const COLLECT_FREQUENCY_OPTIONS = [
  { label: "每 5 分钟", value: "5" },
  { label: "每 15 分钟", value: "15" },
  { label: "每 30 分钟", value: "30" },
  { label: "每小时", value: "60" },
  { label: "每 6 小时", value: "360" },
  { label: "每 12 小时", value: "720" },
  { label: "每天", value: "1440" },
] as const;

export const MATCH_STRATEGY_OPTIONS = [
  { label: "任意包含词匹配", value: "any" },
  { label: "全部包含词匹配", value: "all" },
  { label: "至少N个包含词匹配", value: "atLeastN" },
] as const;

export const DEDUP_STRATEGY_OPTIONS = [
  { label: "标题去重", value: "title" },
  { label: "URL去重", value: "url" },
  { label: "内容去重", value: "content" },
  { label: "不去重", value: "none" },
] as const;

export const COLLECT_TIME_RANGE_OPTIONS = [
  { label: "最近1小时", value: "1h" },
  { label: "最近6小时", value: "6h" },
  { label: "最近12小时", value: "12h" },
  { label: "最近24小时", value: "24h" },
  { label: "最近3天", value: "3d" },
  { label: "最近7天", value: "7d" },
] as const;

export const SENTIMENT_OPTIONS = [
  { label: "全部", value: "" },
  { label: "正面", value: "positive" },
  { label: "中性", value: "neutral" },
  { label: "负面", value: "negative" },
  { label: "未知", value: "unknown" },
] as const;

export const SENTIMENT_LABEL: Record<string, string> = {
  positive: "正面",
  neutral: "中性",
  negative: "负面",
  unknown: "未知",
};

export const WARNING_LEVEL_OPTIONS = [
  { label: "全部", value: "" },
  { label: "蓝色", value: "BLUE" },
  { label: "黄色", value: "YELLOW" },
  { label: "红色", value: "RED" },
] as const;

export const WARNING_LEVEL_LABEL: Record<string, string> = {
  BLUE: "蓝色",
  YELLOW: "黄色",
  RED: "红色",
  blue: "蓝色",
  yellow: "黄色",
  red: "红色",
};

export const WARNING_LEVEL_COLOR: Record<string, string> = {
  BLUE: "blue",
  YELLOW: "gold",
  RED: "red",
  blue: "blue",
  yellow: "gold",
  red: "red",
};

export const PUSH_STATUS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "无需推送", value: "NOT_REQUIRED" },
  { label: "未配置", value: "UNCONFIGURED" },
  { label: "待推送", value: "PENDING" },
  { label: "已推送", value: "SENT" },
  { label: "推送失败", value: "FAILED" },
] as const;

export const PUSH_STATUS_LABEL: Record<string, string> = {
  NOT_REQUIRED: "无需推送",
  UNCONFIGURED: "未配置",
  PENDING: "待推送",
  SENT: "已推送",
  NOT_PUSHED: "未推送",
  PUSHED: "已推送",
  PUSHING: "推送中",
  FAILED: "推送失败",
  PARTIAL: "部分成功",
  SUCCESS: "已推送",
};

export const PUSH_STATUS_COLOR: Record<string, string> = {
  NOT_REQUIRED: "default",
  UNCONFIGURED: "orange",
  PENDING: "blue",
  SENT: "green",
  NOT_PUSHED: "orange",
  PUSHED: "green",
  PUSHING: "blue",
  FAILED: "red",
  PARTIAL: "gold",
  SUCCESS: "green",
};

export const SOURCE_STATUS_LABEL: Record<string, string> = {
  running: "运行中",
  paused: "已暂停",
  abnormal: "异常",
};
