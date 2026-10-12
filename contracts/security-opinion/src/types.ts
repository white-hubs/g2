/** 情感倾向（前端，对应后端 POSITIVE / NEUTRAL / NEGATIVE / UNKNOWN） */
export type Sentiment = "positive" | "neutral" | "negative" | "unknown";

/** 信源状态（前端，对应后端 RUNNING / PAUSED / ABNORMAL） */
export type SourceStatus = "running" | "paused" | "abnormal";

/** 采集频率（分钟，前端 Select value） */
export type CollectFrequency = "5" | "15" | "30" | "60" | "360" | "720" | "1440";

/** 匹配策略（前端） */
export type MatchStrategy = "any" | "all" | "atLeastN";

/** 去重策略（前端） */
export type DedupStrategy = "title" | "url" | "content" | "none";

/** 采集时间范围（前端） */
export type CollectTimeRange = "1h" | "6h" | "12h" | "24h" | "3d" | "7d";

export type KeywordType = "include" | "exclude";

export type WarningLevel = "BLUE" | "YELLOW" | "RED";

export type PushStatus = "NOT_REQUIRED" | "UNCONFIGURED" | "PENDING" | "SENT" | "FAILED";

export type ReviewReportStatus = "NOT_GENERATED" | "DRAFT" | "FINALIZED";

export type OpinionMessageChannel = "CHANNEL_SITE" | "CHANNEL_APP" | "CHANNEL_SMS" | string;

export interface KeywordItemVO {
  id: string;
  keywordText: string;
  preset: boolean;
}

export interface OpinionVO {
  id: string;
  title: string;
  summary: string;
  source: string;
  sentiment: Sentiment;
  collectedAt: string;
  url: string;
  author: string;
  keywords: string[];
  content: string;
  heatIndex?: number;
  heatSource?: string;
  warningLevel?: WarningLevel | string;
  warningLevelText?: string;
  alertTime?: string;
  pushStatus?: PushStatus | string;
  pushStatusText?: string;
  lastPushTime?: string;
  pushCount?: number;
  lastPushFailureReason?: string;
  relatedEventId?: string;
  relatedEventName?: string;
}

export interface PageOpinionsParams {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  source?: string;
  sentiment?: Sentiment | "";
  timeStart?: string;
  timeEnd?: string;
  warningLevel?: WarningLevel | "";
  pushStatus?: PushStatus | "";
  minHeatIndex?: number;
  maxHeatIndex?: number;
}

export interface ExportOpinionsParams {
  keyword?: string;
  source?: string;
  sentiment?: Sentiment | "";
  timeStart?: string;
  timeEnd?: string;
  warningLevel?: WarningLevel | "";
  pushStatus?: PushStatus | "";
  minHeatIndex?: number;
  maxHeatIndex?: number;
}

export type BatchDeleteOpinionsParams = string[];

export interface SourceVO {
  id: string;
  name: string;
  url: string;
  frequency: CollectFrequency;
  maxItems: number;
  status: SourceStatus;
}

export interface SourceModifyParam {
  name: string;
  url: string;
  frequency: CollectFrequency;
  maxItems: number;
}

export interface KeywordRuleVO {
  matchStrategy: MatchStrategy;
  minMatchCount: number;
  dedupStrategy: DedupStrategy;
  collectTimeRange: CollectTimeRange;
}

export interface StatisticsOverviewVO {
  total: number;
  negativeCount: number;
  sourceCount: number;
  negativeRate: number;
}

export interface ChartItemVO {
  name: string;
  value: number;
}

export interface HotEventVO {
  rank: number;
  title: string;
  channelText: string;
  score: number;
}

export interface TrashItemVO {
  id: string;
  title: string;
  source: string;
  author?: string;
  url?: string;
  summary?: string;
  content?: string;
  publishTime?: string;
  filterReason: string;
  keywords?: string[];
  excludedKeywords?: string[];
  primaryKeyword?: string;
  collectedAt: string;
}

export interface PageTrashParams {
  pageNumber: number;
  pageSize: number;
}

export interface PageAlertsParams {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  warningLevel?: WarningLevel | "";
  pushStatus?: PushStatus | "";
  startTime?: string;
  endTime?: string;
}

export interface PublicOpinionAlertVO extends OpinionVO {
  opinionId: string;
  sceneCode?: string;
}

export interface PushAlertParam {
  channels?: OpinionMessageChannel[];
  receiverUserIds?: string[];
}

export interface PublicOpinionAlertChannelVO {
  channelCode: OpinionMessageChannel;
  channelName: string;
}

export interface PublicOpinionAlertReceiverVO {
  id: string;
  userId: string;
  name?: string;
  userName?: string;
  mobile?: string;
  organizationName?: string;
}

export interface PageAlertReceiversParams {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
}

export interface PublicOpinionAlertPushRecordVO {
  id: string;
  opinionId?: string;
  warningLevel?: WarningLevel | string;
  warningLevelText?: string;
  pushType?: string;
  pushTypeText?: string;
  sceneCode?: string;
  notifyId?: string;
  channelsJson?: string;
  receiverUserIdsJson?: string;
  success?: boolean;
  responseCode?: string;
  responseMessage?: string;
  channel?: OpinionMessageChannel;
  channelText?: string;
  receiverUserId?: string;
  receiverName?: string;
  pushStatus?: PushStatus | string;
  pushStatusText?: string;
  pushTime?: string;
  failureReason?: string;
}

export interface PublicOpinionTimelineNodeVO {
  id?: string;
  time?: string;
  actionTime?: string;
  type?: string;
  node?: string;
  content?: string;
  description?: string;
}

export interface PublicOpinionResponseActionVO {
  actionTime?: string;
  actionType?: string;
  actionContent?: string;
  operatorUserId?: string;
  operatorName?: string;
}

export interface ArchivePublicOpinionResponseActionParam {
  actionTime: string;
  actionType: string;
  actionContent: string;
  operatorUserId: string;
  operatorName?: string;
}

export interface ArchivePublicOpinionEventParam {
  archiveRemark: string;
  responseActions: ArchivePublicOpinionResponseActionParam[];
}

export interface PublicOpinionAlertEventVO {
  eventId: string;
  eventCode?: string;
  eventName?: string;
  title?: string;
  warningLevel?: WarningLevel | string;
  warningLevelText?: string;
  heatIndex?: number;
  source?: string;
  sentiment?: Sentiment | string;
  alertTime?: string;
  status?: string;
  statusText?: string;
  eventStatus?: string;
  eventStatusText?: string;
  archiveStatus?: string;
  archiveTime?: string;
  archiveRemark?: string;
  summary?: string;
  keywords?: string[];
  timeline?: PublicOpinionTimelineNodeVO[];
  responseActions?: PublicOpinionResponseActionVO[];
  opinion?: OpinionVO;
}

export interface PublicOpinionAlertNotificationConfigItemVO {
  warningLevel: WarningLevel | string;
  sceneCode?: string;
  defaultChannels?: OpinionMessageChannel[];
  channels: OpinionMessageChannel[];
  receiverUserIds: string[];
  receivers?: PublicOpinionAlertReceiverVO[];
}

export interface PublicOpinionAlertNotificationConfigVO {
  configs: PublicOpinionAlertNotificationConfigItemVO[];
}

export interface SavePublicOpinionAlertNotificationConfigParam {
  configs: Array<{
    warningLevel: WarningLevel | string;
    channels: OpinionMessageChannel[];
    receiverUserIds: string[];
  }>;
}

export interface PageReviewReportsParams {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  reportStatus?: ReviewReportStatus | "";
  startTime?: string;
  endTime?: string;
}

export interface PublicOpinionReviewReportVO extends PublicOpinionAlertEventVO {
  reportId?: string;
  reportName?: string;
  reportStatus?: ReviewReportStatus | string;
  reportStatusText?: string;
  degraded?: boolean;
  overview?: string;
  spreadPath?: string;
  responseProcess?: string;
  improvementSuggestions?: string;
  contentJson?: unknown;
}

export interface SavePublicOpinionReviewReportDraftParam {
  reportName?: string;
  overview?: string;
  spreadPath?: string;
  responseProcess?: string;
  improvementSuggestions?: string;
}
