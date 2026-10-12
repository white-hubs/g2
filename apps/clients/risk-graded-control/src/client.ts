import type { PlatformContext } from "@g2-composition/contract";
import type { RiskGradedControlGateway, RiskPageQuery } from "@g2-contract/risk-graded-control";

interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  patch(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext, baseUrl?: string): HttpClient;
}

export interface RiskGradedControlClient extends RiskGradedControlGateway {
  getDispatchMapConfig(): Promise<unknown>;
  /** 第三方地图服务字典：TD_MAP / gdMap（与旧仓 CubeMapCore 一致）。 */
  getMapServiceConfig(code: "TD_MAP" | "gdMap"): Promise<unknown>;
  getPropertyDetailedPage(params?: Record<string, unknown>): Promise<unknown>;
  getPropertyDetail(id: string | number): Promise<unknown>;
  getMessageConfig(params?: Record<string, unknown>): Promise<unknown>;
  addMessageConfig(payload: Record<string, unknown>): Promise<void>;
  sceneNotificationMethod(sceneCode: string): Promise<Array<{ label: string; value: string }>>;
  exportMeasureExecutions(params?: RiskPageQuery): Promise<Blob>;
  exportControlMeasures(params?: RiskPageQuery): Promise<Blob>;
  exportWarningRecords(params?: RiskPageQuery): Promise<Blob>;
  exportUnitInventory(params?: RiskPageQuery): Promise<Blob>;
  exportNoticeCards(params?: RiskPageQuery): Promise<Blob>;
  exportUnits(params?: RiskPageQuery): Promise<Blob>;
}

function withQuery(url: string, payload?: Record<string, unknown>): string {
  const entries = Object.entries(payload ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (entries.length === 0) return url;
  const query = entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&");
  return url.includes("?") ? `${url}&${query}` : `${url}?${query}`;
}

function idSegment(id: string | number): string {
  return encodeURIComponent(String(id));
}

function unwrapLegacyEnvelope<T>(payload: unknown): T {
  if (payload !== null && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export function createRiskGradedControlClient(http: HttpClient): RiskGradedControlClient {
  const base = "/gw-bff/risk-graded-control";
  const request = {
    get: <T>(url: string) => http.get(url) as Promise<T>,
    post: <T>(url: string, body?: unknown) => http.post(url, body) as Promise<T>,
    put: <T>(url: string, body?: unknown) => http.put(url, body) as Promise<T>,
    patch: <T>(url: string, body?: unknown) => http.patch(url, body) as Promise<T>,
    delete: <T>(url: string) => http.delete(url) as Promise<T>,
  };

  return {
    getDispatchMapConfig: () => request.get("/api/dictionary/getDataDictionaryByItem?itemCode=COMMAND_DISPATCH_MAP_CONFIG"),
    getMapServiceConfig: (code) =>
      request.get(`/api/dictionary/getDataDictionaryByItem?itemCode=THIRD_SERVICE&code=${encodeURIComponent(code)}`),
    getPropertyDetailedPage: (params) => request.get(withQuery("/api/property/property/detailed/getPropertyDetailedPage", params)),
    getPropertyDetail: (id) => request.get(`/api/property/property/detailed/${idSegment(id)}`),
    getMessageConfig: async (params) => unwrapLegacyEnvelope(await request.get(withQuery("/api/bracing/message/getConfigInfo", params))),
    addMessageConfig: async (payload) => {
      await request.post("/api/bracing/message/addConfig", payload);
    },
    sceneNotificationMethod: async (sceneCode) => {
      const [channelsResult, selectedResult] = await Promise.all([
        request.get<unknown>("/api/message2/sat-msg-channels"),
        request.get<unknown>(`/api/message2/sat-msg-scene-receive/code/${idSegment(sceneCode)}`),
      ]);
      const channels = unwrapLegacyEnvelope<unknown>(channelsResult);
      const selected = unwrapLegacyEnvelope<unknown>(selectedResult);
      const channelList = Array.isArray(channels) ? channels : [];
      const selectedCodes =
        selected && typeof selected === "object" && Array.isArray((selected as { channelCodes?: unknown }).channelCodes)
          ? (selected as { channelCodes: unknown[] }).channelCodes.map(String)
          : [];
      return channelList
        .filter(
          (item) => item && typeof item === "object" && selectedCodes.includes(String((item as { channelCode?: unknown }).channelCode)),
        )
        .map((item) => ({
          value: String((item as { channelCode?: unknown }).channelCode ?? ""),
          label: String((item as { channelName?: unknown }).channelName ?? ""),
        }));
    },

    pageUnitTypes: (params) => request.get(withQuery(`${base}/unit-types`, params)),
    createUnitType: (payload) => request.post(`${base}/unit-types`, payload),
    getUnitType: (id) => request.get(`${base}/unit-types/${idSegment(id)}`),
    updateUnitType: (id, payload) => request.put(`${base}/unit-types/${idSegment(id)}`, payload),
    deleteUnitType: (id) => request.delete(`${base}/unit-types/${idSegment(id)}`),

    pageWarningSigns: (params) => request.get(withQuery(`${base}/warning-signs`, params)),
    listWarningSignOptions: (params) => request.get(withQuery(`${base}/warning-sign-options`, params)),
    createWarningSign: (payload) => request.post(`${base}/warning-signs`, payload),
    getWarningSign: (id) => request.get(`${base}/warning-signs/${idSegment(id)}`),
    updateWarningSign: (id, payload) => request.put(`${base}/warning-signs/${idSegment(id)}`, payload),
    updateWarningSignEnabled: (id, payload) => request.put(`${base}/warning-signs/${idSegment(id)}/enabled`, payload),
    deleteWarningSign: (id) => request.delete(`${base}/warning-signs/${idSegment(id)}`),

    pageAssessmentMethods: (params) => request.get(withQuery(`${base}/assessment-methods`, params)),
    createAssessmentMethod: (payload) => request.post(`${base}/assessment-methods`, payload),
    getAssessmentMethod: (id) => request.get(`${base}/assessment-methods/${idSegment(id)}`),
    updateAssessmentMethod: (id, payload) => request.put(`${base}/assessment-methods/${idSegment(id)}`, payload),
    patchAssessmentMethod: (id, payload) => request.patch(`${base}/assessment-methods/${idSegment(id)}`, payload),
    deleteAssessmentMethod: (id) => request.delete(`${base}/assessment-methods/${idSegment(id)}`),

    pageRiskObjects: (params) => request.get(withQuery(`${base}/risk-objects`, params)),
    getRiskObject: (objectId) => request.get(`${base}/risk-objects/${idSegment(objectId)}`),
    generateRiskObjectByAiPhoto: (payload) => request.post(`${base}/ai/risk-objects/photo-generate`, payload),
    reviseRiskObjectByAiPhoto: (objectId, payload) => request.post(`${base}/ai/risk-objects/${idSegment(objectId)}/photo-modify`, payload),

    pageAssessmentTasks: (params) => request.get(withQuery(`${base}/assessment-tasks`, params)),
    listObjectAssessments: (objectId, params) => request.get(withQuery(`${base}/risk-objects/${idSegment(objectId)}/assessments`, params)),
    createAssessment: (payload) => request.post(`${base}/assessments`, payload),
    patchAssessment: (id, payload) => request.patch(`${base}/assessments/${idSegment(id)}`, payload),

    pageReviewTasks: (params) => request.get(withQuery(`${base}/review-tasks`, params)),
    getReviewTask: (objectId) => request.get(`${base}/review-tasks/${idSegment(objectId)}`),
    createReviews: (payload) => request.post(`${base}/reviews`, payload),
    submitUnitIdentification: (unitId, payload) => request.post(`${base}/units/${idSegment(unitId)}/identifications`, payload),
    pageIdentificationUnits: (params) => request.get(withQuery(`${base}/identification-units`, params)),
    pageIdentifications: (params) => request.get(withQuery(`${base}/identifications`, params)),
    getIdentification: (id) => request.get(`${base}/identifications/${idSegment(id)}`),

    pageMeasureExecutions: (params) => request.get(withQuery(`${base}/measure-executions`, params)),
    exportMeasureExecutions: (params) => request.get(withQuery(`${base}/measure-executions/export`, params)),
    createMeasureExecutionRecord: (measureId, payload) =>
      request.post(`${base}/control-measures/${idSegment(measureId)}/execution-records`, payload),
    syncMeasureExecutionBatch: (payload) => request.post(`${base}/measure-execution-sync-batches`, payload),

    pageControlMeasures: (params) => request.get(withQuery(`${base}/control-measures`, params)),
    exportControlMeasures: (params) => request.get(withQuery(`${base}/control-measures/export`, params)),
    listObjectControlMeasures: (objectId, params) =>
      request.get(withQuery(`${base}/risk-objects/${idSegment(objectId)}/control-measures`, params)),
    saveObjectControlMeasures: (objectId, payload) => request.put(`${base}/risk-objects/${idSegment(objectId)}/control-measures`, payload),
    getControlMeasure: (measureId) => request.get(`${base}/control-measures/${idSegment(measureId)}`),
    generateControlMeasuresByAi: (objectId, payload) =>
      request.post(`${base}/ai/risk-objects/${idSegment(objectId)}/control-measures/generate`, payload),

    pageReviewReports: (params) =>
      request.get(
        withQuery(`${base}/review-reports`, {
          ...params,
          pageNum: params?.pageNum ?? params?.pageNumber,
        }),
      ),
    getReviewReport: (id) => request.get(`${base}/review-reports/${idSegment(id)}`),
    generateReviewReport: (payload) => request.post(`${base}/review-reports`, payload),
    recheckReviewReport: (id, payload) => request.post(`${base}/review-reports/${idSegment(id)}/regenerate`, payload ?? {}),
    createReviewReportDraft: (payload) => request.post(`${base}/review-reports/draft`, payload),
    saveReviewReportDraft: (id, payload) => request.put(`${base}/review-reports/${idSegment(id)}/draft`, payload),
    submitNewReviewReport: (payload) => request.post(`${base}/review-reports/submit`, payload),
    submitReviewReport: (id, payload) => request.post(`${base}/review-reports/${idSegment(id)}/submit`, payload ?? {}),

    pageAssessmentPlans: (params) => request.get(withQuery(`${base}/assessment-plans`, params)),
    createAssessmentPlan: (payload) => request.post(`${base}/assessment-plans`, payload),
    getAssessmentPlan: (id) => request.get(`${base}/assessment-plans/${idSegment(id)}`),
    updateAssessmentPlan: (id, payload) => request.put(`${base}/assessment-plans/${idSegment(id)}`, payload),
    patchAssessmentPlan: (id, payload) => request.patch(`${base}/assessment-plans/${idSegment(id)}`, payload),
    deleteAssessmentPlan: (id) => request.delete(`${base}/assessment-plans/${idSegment(id)}`),

    pageWarningRules: (params) => request.get(withQuery(`${base}/warning-rules`, params)),
    createWarningRule: (payload) => request.post(`${base}/warning-rules`, payload),
    getWarningRule: (id) => request.get(`${base}/warning-rules/${idSegment(id)}`),
    updateWarningRule: (id, payload) => request.put(`${base}/warning-rules/${idSegment(id)}`, payload),
    patchWarningRule: (id, payload) => request.patch(`${base}/warning-rules/${idSegment(id)}`, payload),
    deleteWarningRule: (id) => request.delete(`${base}/warning-rules/${idSegment(id)}`),

    pageWarningRecords: (params) => request.get(withQuery(`${base}/warning-records`, params)),
    getWarningRecord: (id) => request.get(`${base}/warning-records/${idSegment(id)}`),
    exportWarningRecords: (params) => request.get(withQuery(`${base}/warning-records/export`, params)),
    patchWarningRecord: (id, payload) => request.patch(`${base}/warning-records/${idSegment(id)}`, payload),

    pageUnitInventory: (params) => request.get(withQuery(`${base}/unit-inventory`, params)),
    exportUnitInventory: (params) => request.get(withQuery(`${base}/unit-inventory/export`, params)),
    listUnitInventoryObjects: (unitId, params) =>
      request.get(withQuery(`${base}/unit-inventory/${idSegment(unitId)}/risk-objects`, params)),

    pageNoticeCards: (params) => request.get(withQuery(`${base}/notice-cards`, params)),
    exportNoticeCards: (params) => request.get(withQuery(`${base}/notice-cards/export`, params)),
    getNoticeCard: (unitId) => request.get(`${base}/notice-cards/${idSegment(unitId)}`),

    getFourColorMapStatistics: (params) => request.get(withQuery(`${base}/four-color-map-statistics`, params)),
    pageFourColorMapUnits: (params) => request.get(withQuery(`${base}/four-color-map-units`, params)),
    getFourColorMapUnit: (unitId) => request.get(`${base}/four-color-map-units/${idSegment(unitId)}`),

    pageAreas: (params) => request.get(withQuery(`${base}/areas`, params)),
    createArea: (payload) => request.post(`${base}/areas`, payload),
    getArea: (id) => request.get(`${base}/areas/${idSegment(id)}`),
    updateArea: (id, payload) => request.put(`${base}/areas/${idSegment(id)}`, payload),
    deleteArea: (id) => request.delete(`${base}/areas/${idSegment(id)}`),

    pageUnits: (params) => request.get(withQuery(`${base}/units`, params)),
    exportUnits: (params) => request.get(withQuery(`${base}/units/export`, params)),
    createUnit: (payload) => request.post(`${base}/units`, payload),
    getUnit: (id) => request.get(`${base}/units/${idSegment(id)}`),
    updateUnit: (id, payload) => request.put(`${base}/units/${idSegment(id)}`, payload),
    deleteUnit: (id) => request.delete(`${base}/units/${idSegment(id)}`),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<RiskGradedControlClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createRiskGradedControlClient(httpModule.createHttpClientForPlatform(ctx));
}
