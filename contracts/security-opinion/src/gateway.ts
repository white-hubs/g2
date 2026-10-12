import type { Pagination } from "@g2-contract/base";

import type {
  BatchDeleteOpinionsParams,
  ChartItemVO,
  ExportOpinionsParams,
  HotEventVO,
  KeywordItemVO,
  KeywordRuleVO,
  KeywordType,
  OpinionVO,
  ArchivePublicOpinionEventParam,
  PageAlertReceiversParams,
  PageAlertsParams,
  PageOpinionsParams,
  PageReviewReportsParams,
  PageTrashParams,
  PublicOpinionAlertChannelVO,
  PublicOpinionAlertEventVO,
  PublicOpinionAlertNotificationConfigVO,
  PublicOpinionAlertPushRecordVO,
  PublicOpinionAlertReceiverVO,
  PublicOpinionAlertVO,
  PublicOpinionReviewReportVO,
  PushAlertParam,
  SavePublicOpinionAlertNotificationConfigParam,
  SavePublicOpinionReviewReportDraftParam,
  SourceModifyParam,
  SourceVO,
  StatisticsOverviewVO,
  TrashItemVO,
} from "./types";

/** 安全舆情监测 BFF 契约 */
export interface SecurityOpinionGateway {
  pageOpinions: (params: PageOpinionsParams) => Promise<Pagination<OpinionVO>>;
  getOpinion: (id: string) => Promise<OpinionVO>;
  exportOpinions: (params: ExportOpinionsParams) => Promise<Blob>;
  batchDeleteOpinions: (params: BatchDeleteOpinionsParams) => Promise<void>;

  listSources: () => Promise<SourceVO[]>;
  createSource: (payload: SourceModifyParam) => Promise<SourceVO>;
  updateSource: (id: string, payload: SourceModifyParam) => Promise<SourceVO>;
  deleteSource: (id: string) => Promise<void>;
  pauseSource: (id: string) => Promise<void>;
  resumeSource: (id: string) => Promise<void>;

  getKeywordRule: () => Promise<KeywordRuleVO>;
  updateKeywordRule: (payload: KeywordRuleVO) => Promise<void>;
  listKeywords: (type: KeywordType) => Promise<KeywordItemVO[]>;
  addKeyword: (type: KeywordType, keywordText: string) => Promise<KeywordItemVO>;
  deleteKeyword: (id: string) => Promise<void>;
  listKeywordPresets: (type: KeywordType) => Promise<string[]>;
  addKeywordFromPreset: (type: KeywordType, keywordText: string) => Promise<KeywordItemVO>;
  batchAddKeywordPresets: (type: KeywordType) => Promise<KeywordItemVO[]>;

  getStatisticsOverview: () => Promise<StatisticsOverviewVO>;
  getSentimentDistribution: () => Promise<ChartItemVO[]>;
  getSourceDistribution: () => Promise<ChartItemVO[]>;
  getCollectionTrend: () => Promise<ChartItemVO[]>;
  getKeywordRanking: () => Promise<ChartItemVO[]>;
  getHotEvents: (limit?: number) => Promise<HotEventVO[]>;

  pageTrash: (params: PageTrashParams) => Promise<Pagination<TrashItemVO>>;
  getTrashItem: (id: string) => Promise<TrashItemVO>;
  restoreTrashItem: (id: string) => Promise<void>;
  deleteTrashItem: (id: string) => Promise<void>;
  clearTrash: () => Promise<void>;

  pageAlerts: (params: PageAlertsParams) => Promise<Pagination<PublicOpinionAlertVO>>;
  getAlert: (opinionId: string) => Promise<PublicOpinionAlertVO>;
  listAlertChannels: (sceneCode: string) => Promise<PublicOpinionAlertChannelVO[]>;
  pageAlertReceivers: (params: PageAlertReceiversParams) => Promise<Pagination<PublicOpinionAlertReceiverVO>>;
  pushAlert: (opinionId: string, payload?: PushAlertParam) => Promise<void>;
  listAlertPushRecords: (opinionId: string) => Promise<PublicOpinionAlertPushRecordVO[]>;
  getAlertEvent: (eventId: string) => Promise<PublicOpinionAlertEventVO>;
  archiveAlertEvent: (eventId: string, payload: ArchivePublicOpinionEventParam) => Promise<void>;
  getAlertNotificationConfig: () => Promise<PublicOpinionAlertNotificationConfigVO>;
  saveAlertNotificationConfig: (payload: SavePublicOpinionAlertNotificationConfigParam) => Promise<void>;

  pageReviewReports: (params: PageReviewReportsParams) => Promise<Pagination<PublicOpinionReviewReportVO>>;
  getReviewReportEvent: (eventId: string) => Promise<PublicOpinionReviewReportVO>;
  generateReviewReport: (eventId: string) => Promise<PublicOpinionReviewReportVO>;
  saveReviewReportDraft: (reportId: string, payload: SavePublicOpinionReviewReportDraftParam) => Promise<void>;
  finalizeReviewReport: (reportId: string) => Promise<void>;
}
