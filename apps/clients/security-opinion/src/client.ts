import type { PlatformContext } from "@g2-composition/contract";
import type { KeywordType, SecurityOpinionGateway } from "@g2-contract/security-opinion";

function withQuery(url: string, payload?: Record<string, unknown>): string {
  const entries = Object.entries(payload ?? {}).filter(([, value]) => value !== undefined && value !== "");
  if (entries.length === 0) return url;
  return `${url}?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&")}`;
}

const keywordType = (type: KeywordType): string => (type === "include" ? "INCLUDE" : "EXCLUDE");

export interface HttpClient {
  get: <T>(url: string) => Promise<T>;
  post: <T>(url: string, body?: unknown) => Promise<T>;
  put: <T>(url: string, body?: unknown) => Promise<T>;
  delete: <T>(url: string) => Promise<T>;
}
interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}
export type SecurityOpinionClient = SecurityOpinionGateway;

export function createSecurityOpinionClient(http: HttpClient): SecurityOpinionClient {
  return {
    pageOpinions: (params) => http.get(withQuery("/gw-bff/security-opinion/opinions", { ...params })),
    getOpinion: (id) => http.get(`/gw-bff/security-opinion/opinions/${id}`),
    exportOpinions: (params) => http.post("/gw-bff/security-opinion/opinions/export", params),
    batchDeleteOpinions: (ids) => http.post("/gw-bff/security-opinion/opinions/batch-delete", ids),
    listSources: () => http.get("/gw-bff/security-opinion/sources"),
    createSource: (payload) => http.post("/gw-bff/security-opinion/sources", payload),
    updateSource: (id, payload) => http.put(`/gw-bff/security-opinion/sources/${id}`, payload),
    deleteSource: (id) => http.delete(`/gw-bff/security-opinion/sources/${id}`),
    pauseSource: (id) => http.post(`/gw-bff/security-opinion/sources/${id}/pause`),
    resumeSource: (id) => http.post(`/gw-bff/security-opinion/sources/${id}/resume`),
    getKeywordRule: () => http.get("/gw-bff/security-opinion/keyword-rule"),
    updateKeywordRule: (payload) => http.put("/gw-bff/security-opinion/keyword-rule", payload),
    listKeywords: (type) => http.get(withQuery("/gw-bff/security-opinion/keywords", { type: keywordType(type) })),
    addKeyword: (type, keywordText) => http.post("/gw-bff/security-opinion/keywords", { type: keywordType(type), keywordText }),
    deleteKeyword: (id) => http.delete(`/gw-bff/security-opinion/keywords/${id}`),
    listKeywordPresets: (type) => http.get(withQuery("/gw-bff/security-opinion/keyword-presets", { type: keywordType(type) })),
    addKeywordFromPreset: (type, keywordText) =>
      http.post("/gw-bff/security-opinion/keywords/presets", { type: keywordType(type), keywordText }),
    batchAddKeywordPresets: (type) => http.post(withQuery("/gw-bff/security-opinion/keywords/presets/batch", { type: keywordType(type) })),
    getStatisticsOverview: () => http.get("/gw-bff/security-opinion/statistics/overview"),
    getSentimentDistribution: () => http.get("/gw-bff/security-opinion/statistics/sentiment-distribution"),
    getSourceDistribution: () => http.get("/gw-bff/security-opinion/statistics/source-distribution"),
    getCollectionTrend: () => http.get("/gw-bff/security-opinion/statistics/collect-trend"),
    getKeywordRanking: () => http.get("/gw-bff/security-opinion/statistics/keyword-rank"),
    getHotEvents: (limit) => http.get(withQuery("/gw-bff/security-opinion/statistics/hot-events", { limit })),
    pageTrash: (params) => http.get(withQuery("/gw-bff/security-opinion/recycle-bin", { ...params })),
    getTrashItem: (id) => http.get(`/gw-bff/security-opinion/recycle-bin/${id}`),
    restoreTrashItem: (id) => http.post(`/gw-bff/security-opinion/recycle-bin/${id}/restore`),
    deleteTrashItem: (id) => http.delete(`/gw-bff/security-opinion/recycle-bin/${id}`),
    clearTrash: () => http.delete("/gw-bff/security-opinion/recycle-bin"),
    pageAlerts: (params) => http.get(withQuery("/gw-bff/security-opinion/alerts", { ...params })),
    getAlert: (opinionId) => http.get(`/gw-bff/security-opinion/alerts/${opinionId}`),
    listAlertChannels: (sceneCode) => http.get(withQuery("/gw-bff/security-opinion/alerts/channels", { sceneCode })),
    pageAlertReceivers: (params) => http.get(withQuery("/gw-bff/security-opinion/alerts/receivers", { ...params })),
    pushAlert: (opinionId, payload) => http.post(`/gw-bff/security-opinion/alerts/${opinionId}/push`, payload),
    listAlertPushRecords: (opinionId) => http.get(`/gw-bff/security-opinion/alerts/${opinionId}/push-records`),
    getAlertEvent: (eventId) => http.get(`/gw-bff/security-opinion/alerts/events/${eventId}`),
    archiveAlertEvent: (eventId, payload) => http.post(`/gw-bff/security-opinion/alerts/events/${eventId}/archive`, payload),
    getAlertNotificationConfig: () => http.get("/gw-bff/security-opinion/alerts/notification-config"),
    saveAlertNotificationConfig: (payload) => http.post("/gw-bff/security-opinion/alerts/notification-config", payload),
    pageReviewReports: (params) => http.get(withQuery("/gw-bff/security-opinion/review-reports", { ...params })),
    getReviewReportEvent: (eventId) => http.get(`/gw-bff/security-opinion/review-reports/events/${eventId}`),
    generateReviewReport: (eventId) => http.post(`/gw-bff/security-opinion/review-reports/events/${eventId}/generate`),
    saveReviewReportDraft: (reportId, payload) => http.post(`/gw-bff/security-opinion/review-reports/${reportId}/draft`, payload),
    finalizeReviewReport: (reportId) => http.post(`/gw-bff/security-opinion/review-reports/${reportId}/finalize`),
  };
}

export async function create(ctx: PlatformContext): Promise<SecurityOpinionClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createSecurityOpinionClient(httpModule.createHttpClientForPlatform(ctx));
}
