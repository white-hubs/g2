import { Body, Controller, DELETE, GET, Param, PATCH, POST, PUT, QueryMap } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";
import type * as Risk from "@g2-contract/risk-graded-control";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { RiskGradedControlProxyService } from "@/services/proxy/risk-graded-control/risk-graded-control-proxy.service";

const UPSTREAM_PREFIX = "/risk-control";

@Controller("/gw-bff/risk-graded-control")
export class RiskGradedControlController {
  constructor(private readonly proxy: RiskGradedControlProxyService) {}

  @GET("/unit-types")
  @CubeAuthProxy()
  public async pageUnitTypes(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskUnitTypeVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskUnitTypeVO>>(
      `${UPSTREAM_PREFIX}/unit-types`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @POST("/unit-types")
  @CubeAuthProxy()
  public async createUnitType(@Body() payload: Risk.RiskUnitTypeParam): Promise<Risk.RiskUnitTypeVO> {
    return await this.proxy.forwardPost<Risk.RiskUnitTypeVO>(`${UPSTREAM_PREFIX}/unit-types`, payload);
  }

  @GET("/unit-types/:id")
  @CubeAuthProxy()
  public async getUnitType(@Param("id") id: string): Promise<Risk.RiskUnitTypeVO> {
    return await this.proxy.forwardGet<Risk.RiskUnitTypeVO>(`${UPSTREAM_PREFIX}/unit-types/${id}`, undefined, {} as Risk.RiskUnitTypeVO);
  }

  @PUT("/unit-types/:id")
  @CubeAuthProxy()
  public async updateUnitType(@Param("id") id: string, @Body() payload: Risk.RiskUnitTypeParam): Promise<Risk.RiskUnitTypeVO> {
    return await this.proxy.forwardPut<Risk.RiskUnitTypeVO>(`${UPSTREAM_PREFIX}/unit-types/${id}`, payload);
  }

  @DELETE("/unit-types/:id")
  @CubeAuthProxy()
  public async deleteUnitType(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`${UPSTREAM_PREFIX}/unit-types/${id}`);
  }

  @GET("/warning-signs")
  @CubeAuthProxy()
  public async pageWarningSigns(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskWarningSignVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskWarningSignVO>>(
      `${UPSTREAM_PREFIX}/warning-signs`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @GET("/warning-sign-options")
  @CubeAuthProxy()
  public async listWarningSignOptions(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskWarningSignVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskWarningSignVO>>(
      `${UPSTREAM_PREFIX}/warning-sign-options`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @POST("/warning-signs")
  @CubeAuthProxy()
  public async createWarningSign(@Body() payload: Risk.RiskWarningSignParam): Promise<Risk.RiskWarningSignVO> {
    return await this.proxy.forwardPost<Risk.RiskWarningSignVO>(`${UPSTREAM_PREFIX}/warning-signs`, payload);
  }

  @GET("/warning-signs/:id")
  @CubeAuthProxy()
  public async getWarningSign(@Param("id") id: string): Promise<Risk.RiskWarningSignVO> {
    return await this.proxy.forwardGet<Risk.RiskWarningSignVO>(
      `${UPSTREAM_PREFIX}/warning-signs/${id}`,
      undefined,
      {} as Risk.RiskWarningSignVO,
    );
  }

  @PUT("/warning-signs/:id")
  @CubeAuthProxy()
  public async updateWarningSign(@Param("id") id: string, @Body() payload: Risk.RiskWarningSignParam): Promise<Risk.RiskWarningSignVO> {
    return await this.proxy.forwardPut<Risk.RiskWarningSignVO>(`${UPSTREAM_PREFIX}/warning-signs/${id}`, payload);
  }

  @PUT("/warning-signs/:id/enabled")
  @CubeAuthProxy()
  public async updateWarningSignEnabled(@Param("id") id: string, @Body() payload: Risk.RiskEnabledParam): Promise<Risk.RiskWarningSignVO> {
    return await this.proxy.forwardPut<Risk.RiskWarningSignVO>(`${UPSTREAM_PREFIX}/warning-signs/${id}/enabled`, payload);
  }

  @DELETE("/warning-signs/:id")
  @CubeAuthProxy()
  public async deleteWarningSign(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`${UPSTREAM_PREFIX}/warning-signs/${id}`);
  }

  @GET("/assessment-methods")
  @CubeAuthProxy()
  public async pageAssessmentMethods(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskAssessmentMethodVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskAssessmentMethodVO>>(
      `${UPSTREAM_PREFIX}/assessment-methods`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @POST("/assessment-methods")
  @CubeAuthProxy()
  public async createAssessmentMethod(@Body() payload: Risk.RiskAssessmentMethodParam): Promise<Risk.RiskAssessmentMethodVO> {
    return await this.proxy.forwardPost<Risk.RiskAssessmentMethodVO>(`${UPSTREAM_PREFIX}/assessment-methods`, payload);
  }

  @GET("/assessment-methods/:id")
  @CubeAuthProxy()
  public async getAssessmentMethod(@Param("id") id: string): Promise<Risk.RiskAssessmentMethodVO> {
    return await this.proxy.forwardGet<Risk.RiskAssessmentMethodVO>(
      `${UPSTREAM_PREFIX}/assessment-methods/${id}`,
      undefined,
      {} as Risk.RiskAssessmentMethodVO,
    );
  }

  @PUT("/assessment-methods/:id")
  @CubeAuthProxy()
  public async updateAssessmentMethod(
    @Param("id") id: string,
    @Body() payload: Risk.RiskAssessmentMethodParam,
  ): Promise<Risk.RiskAssessmentMethodVO> {
    return await this.proxy.forwardPut<Risk.RiskAssessmentMethodVO>(`${UPSTREAM_PREFIX}/assessment-methods/${id}`, payload);
  }

  @PATCH("/assessment-methods/:id")
  @CubeAuthProxy()
  public async patchAssessmentMethod(
    @Param("id") id: string,
    @Body() payload: Risk.RiskEnabledParam,
  ): Promise<Risk.RiskAssessmentMethodVO> {
    return await this.proxy.forwardPatch<Risk.RiskAssessmentMethodVO>(`${UPSTREAM_PREFIX}/assessment-methods/${id}`, payload);
  }

  @DELETE("/assessment-methods/:id")
  @CubeAuthProxy()
  public async deleteAssessmentMethod(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`${UPSTREAM_PREFIX}/assessment-methods/${id}`);
  }

  @GET("/risk-objects")
  @CubeAuthProxy()
  public async pageRiskObjects(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskObjectVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskObjectVO>>(
      `${UPSTREAM_PREFIX}/risk-objects`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @GET("/risk-objects/:objectId")
  @CubeAuthProxy()
  public async getRiskObject(@Param("objectId") objectId: string): Promise<Risk.RiskObjectVO> {
    return await this.proxy.forwardGet<Risk.RiskObjectVO>(
      `${UPSTREAM_PREFIX}/risk-objects/${objectId}`,
      undefined,
      {} as Risk.RiskObjectVO,
    );
  }

  @POST("/ai/risk-objects/photo-generate")
  @CubeAuthProxy()
  public async generateRiskObjectByAiPhoto(
    @Body() payload: Risk.RiskAiIdentificationPhotoParam,
  ): Promise<Risk.RiskAiIdentificationAnalyzeVO> {
    return await this.proxy.forwardPost<Risk.RiskAiIdentificationAnalyzeVO>(`${UPSTREAM_PREFIX}/ai/risk-objects/photo-generate`, payload);
  }

  @POST("/ai/risk-objects/:objectId/photo-modify")
  @CubeAuthProxy()
  public async reviseRiskObjectByAiPhoto(
    @Param("objectId") objectId: string,
    @Body() payload: Risk.RiskAiIdentificationModifyParam,
  ): Promise<Risk.RiskAiIdentificationAnalyzeVO> {
    return await this.proxy.forwardPost<Risk.RiskAiIdentificationAnalyzeVO>(
      `${UPSTREAM_PREFIX}/ai/risk-objects/${objectId}/photo-modify`,
      payload,
    );
  }

  @GET("/assessment-tasks")
  @CubeAuthProxy()
  public async pageAssessmentTasks(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskAssessmentTaskVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskAssessmentTaskVO>>(
      `${UPSTREAM_PREFIX}/assessment-tasks`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @GET("/risk-objects/:objectId/assessments")
  @CubeAuthProxy()
  public async listObjectAssessments(
    @Param("objectId") objectId: string,
    @QueryMap() params?: Risk.RiskPageQuery,
  ): Promise<Pagination<Risk.RiskAssessmentRecordVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskAssessmentRecordVO>>(
      `${UPSTREAM_PREFIX}/risk-objects/${objectId}/assessments`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @POST("/assessments")
  @CubeAuthProxy()
  public async createAssessment(@Body() payload: Risk.RiskAssessmentParam): Promise<Risk.RiskAssessmentRecordVO> {
    return await this.proxy.forwardPost<Risk.RiskAssessmentRecordVO>(`${UPSTREAM_PREFIX}/assessments`, payload);
  }

  @PATCH("/assessments/:id")
  @CubeAuthProxy()
  public async patchAssessment(@Param("id") id: string, @Body() payload: Risk.RiskAssessmentParam): Promise<Risk.RiskAssessmentRecordVO> {
    return await this.proxy.forwardPatch<Risk.RiskAssessmentRecordVO>(`${UPSTREAM_PREFIX}/assessments/${id}`, payload);
  }

  @GET("/review-tasks")
  @CubeAuthProxy()
  public async pageReviewTasks(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskReviewTaskVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskReviewTaskVO>>(
      `${UPSTREAM_PREFIX}/review-tasks`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @GET("/review-tasks/:objectId")
  @CubeAuthProxy()
  public async getReviewTask(@Param("objectId") objectId: string): Promise<Risk.RiskReviewTaskVO> {
    return await this.proxy.forwardGet<Risk.RiskReviewTaskVO>(
      `${UPSTREAM_PREFIX}/review-tasks/${objectId}`,
      undefined,
      {} as Risk.RiskReviewTaskVO,
    );
  }

  @POST("/reviews")
  @CubeAuthProxy()
  public async createReviews(@Body() payload: Risk.RiskReviewCreateParam): Promise<Risk.RiskReviewRecordVO[]> {
    return await this.proxy.forwardPost<Risk.RiskReviewRecordVO[]>(`${UPSTREAM_PREFIX}/reviews`, payload);
  }

  @POST("/units/:unitId/identifications")
  @CubeAuthProxy()
  public async submitUnitIdentification(
    @Param("unitId") unitId: string,
    @Body() payload: Risk.RiskUnitIdentificationSubmitParam,
  ): Promise<Risk.RiskReviewRecordVO[]> {
    return await this.proxy.forwardPost<Risk.RiskReviewRecordVO[]>(`${UPSTREAM_PREFIX}/units/${unitId}/identifications`, payload);
  }

  @GET("/identification-units")
  @CubeAuthProxy()
  public async pageIdentificationUnits(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskIdentificationUnitVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskIdentificationUnitVO>>(
      `${UPSTREAM_PREFIX}/identification-units`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @GET("/identifications")
  @CubeAuthProxy()
  public async pageIdentifications(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskIdentificationHistoryVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskIdentificationHistoryVO>>(
      `${UPSTREAM_PREFIX}/identifications`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @GET("/identifications/:id")
  @CubeAuthProxy()
  public async getIdentification(@Param("id") id: string): Promise<Risk.RiskIdentificationHistoryVO> {
    return await this.proxy.forwardGet<Risk.RiskIdentificationHistoryVO>(
      `${UPSTREAM_PREFIX}/identifications/${id}`,
      undefined,
      {} as Risk.RiskIdentificationHistoryVO,
    );
  }

  @GET("/measure-executions")
  @CubeAuthProxy()
  public async pageMeasureExecutions(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskControlMeasureVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskControlMeasureVO>>(
      `${UPSTREAM_PREFIX}/measure-executions`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @GET("/measure-executions/export")
  @CubeAuthProxy()
  public async exportMeasureExecutions(@QueryMap() params?: Risk.RiskPageQuery): Promise<Response> {
    return await this.proxy.forwardGetDownload(`${UPSTREAM_PREFIX}/measure-executions/export`, { ...params });
  }

  @POST("/control-measures/:measureId/execution-records")
  @CubeAuthProxy()
  public async createMeasureExecutionRecord(
    @Param("measureId") measureId: string,
    @Body() payload: Risk.RiskMeasureExecutionRecordParam,
  ): Promise<Risk.RiskMeasureExecutionRecordVO> {
    return await this.proxy.forwardPost<Risk.RiskMeasureExecutionRecordVO>(
      `${UPSTREAM_PREFIX}/control-measures/${measureId}/execution-records`,
      payload,
    );
  }

  @POST("/measure-execution-sync-batches")
  @CubeAuthProxy()
  public async syncMeasureExecutionBatch(@Body() payload: Risk.RiskControlMeasureParam[]): Promise<Risk.RiskControlMeasureVO> {
    return await this.proxy.forwardPost<Risk.RiskControlMeasureVO>(`${UPSTREAM_PREFIX}/measure-execution-sync-batches`, payload);
  }

  @GET("/control-measures")
  @CubeAuthProxy()
  public async pageControlMeasures(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskControlMeasureVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskControlMeasureVO>>(
      `${UPSTREAM_PREFIX}/control-measures`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @GET("/control-measures/export")
  @CubeAuthProxy()
  public async exportControlMeasures(@QueryMap() params?: Risk.RiskPageQuery): Promise<Response> {
    return await this.proxy.forwardGetDownload(`${UPSTREAM_PREFIX}/control-measures/export`, { ...params });
  }

  @GET("/risk-objects/:objectId/control-measures")
  @CubeAuthProxy()
  public async listObjectControlMeasures(
    @Param("objectId") objectId: string,
    @QueryMap() params?: Risk.RiskPageQuery,
  ): Promise<Pagination<Risk.RiskControlMeasureVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskControlMeasureVO>>(
      `${UPSTREAM_PREFIX}/risk-objects/${objectId}/control-measures`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @PUT("/risk-objects/:objectId/control-measures")
  @CubeAuthProxy()
  public async saveObjectControlMeasures(
    @Param("objectId") objectId: string,
    @Body() payload: Risk.RiskObjectMeasureSaveParam,
  ): Promise<Risk.RiskControlMeasureVO[]> {
    return await this.proxy.forwardPut<Risk.RiskControlMeasureVO[]>(
      `${UPSTREAM_PREFIX}/risk-objects/${objectId}/control-measures`,
      payload,
    );
  }

  @POST("/ai/risk-objects/:objectId/control-measures/generate")
  @CubeAuthProxy()
  public async generateControlMeasuresByAi(
    @Param("objectId") objectId: string,
    @Body() payload: Risk.RiskAiControlMeasureGenerateParam,
  ): Promise<Risk.RiskAiControlMeasureAnalyzeVO> {
    return await this.proxy.forwardPost<Risk.RiskAiControlMeasureAnalyzeVO>(
      `${UPSTREAM_PREFIX}/ai/risk-objects/${objectId}/control-measures/generate`,
      payload,
    );
  }

  @GET("/control-measures/:measureId")
  @CubeAuthProxy()
  public async getControlMeasure(@Param("measureId") measureId: string): Promise<Risk.RiskControlMeasureVO> {
    return await this.proxy.forwardGet<Risk.RiskControlMeasureVO>(
      `${UPSTREAM_PREFIX}/control-measures/${measureId}`,
      undefined,
      {} as Risk.RiskControlMeasureVO,
    );
  }

  @GET("/review-reports")
  @CubeAuthProxy()
  public async pageReviewReports(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskReviewReportVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskReviewReportVO>>(
      `${UPSTREAM_PREFIX}/review-reports`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @GET("/review-reports/:id")
  @CubeAuthProxy()
  public async getReviewReport(@Param("id") id: string): Promise<Risk.RiskReviewReportVO> {
    return await this.proxy.forwardGet<Risk.RiskReviewReportVO>(
      `${UPSTREAM_PREFIX}/review-reports/${id}`,
      undefined,
      {} as Risk.RiskReviewReportVO,
    );
  }

  @POST("/review-reports")
  @CubeAuthProxy()
  public async generateReviewReport(@Body() payload: Risk.RiskReviewReportParam): Promise<Risk.RiskReviewReportVO> {
    return await this.proxy.forwardPost<Risk.RiskReviewReportVO>(`${UPSTREAM_PREFIX}/review-reports`, payload);
  }

  @POST("/review-reports/draft")
  @CubeAuthProxy()
  public async createReviewReportDraft(@Body() payload: Risk.RiskReviewReportParam): Promise<Risk.RiskReviewReportVO> {
    return await this.proxy.forwardPost<Risk.RiskReviewReportVO>(`${UPSTREAM_PREFIX}/review-reports/draft`, payload);
  }

  @POST("/review-reports/submit")
  @CubeAuthProxy()
  public async submitNewReviewReport(@Body() payload: Risk.RiskReviewReportParam): Promise<Risk.RiskReviewReportVO> {
    return await this.proxy.forwardPost<Risk.RiskReviewReportVO>(`${UPSTREAM_PREFIX}/review-reports/submit`, payload);
  }

  @POST("/review-reports/:id/regenerate")
  @CubeAuthProxy()
  public async recheckReviewReport(
    @Param("id") id: string,
    @Body() payload?: Risk.RiskReviewReportParam,
  ): Promise<Risk.RiskReviewReportVO> {
    return await this.proxy.forwardPost<Risk.RiskReviewReportVO>(`${UPSTREAM_PREFIX}/review-reports/${id}/regenerate`, payload ?? {});
  }

  @PUT("/review-reports/:id/draft")
  @CubeAuthProxy()
  public async saveReviewReportDraft(
    @Param("id") id: string,
    @Body() payload: Risk.RiskReviewReportParam,
  ): Promise<Risk.RiskReviewReportVO> {
    return await this.proxy.forwardPut<Risk.RiskReviewReportVO>(`${UPSTREAM_PREFIX}/review-reports/${id}/draft`, payload);
  }

  @POST("/review-reports/:id/submit")
  @CubeAuthProxy()
  public async submitReviewReport(@Param("id") id: string, @Body() payload?: Risk.RiskReviewReportParam): Promise<Risk.RiskReviewReportVO> {
    return await this.proxy.forwardPost<Risk.RiskReviewReportVO>(`${UPSTREAM_PREFIX}/review-reports/${id}/submit`, payload ?? {});
  }

  @GET("/assessment-plans")
  @CubeAuthProxy()
  public async pageAssessmentPlans(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskAssessmentPlanVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskAssessmentPlanVO>>(
      `${UPSTREAM_PREFIX}/assessment-plans`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @POST("/assessment-plans")
  @CubeAuthProxy()
  public async createAssessmentPlan(@Body() payload: Risk.RiskAssessmentPlanParam): Promise<Risk.RiskAssessmentPlanVO> {
    return await this.proxy.forwardPost<Risk.RiskAssessmentPlanVO>(`${UPSTREAM_PREFIX}/assessment-plans`, payload);
  }

  @GET("/assessment-plans/:id")
  @CubeAuthProxy()
  public async getAssessmentPlan(@Param("id") id: string): Promise<Risk.RiskAssessmentPlanVO> {
    return await this.proxy.forwardGet<Risk.RiskAssessmentPlanVO>(
      `${UPSTREAM_PREFIX}/assessment-plans/${id}`,
      undefined,
      {} as Risk.RiskAssessmentPlanVO,
    );
  }

  @PUT("/assessment-plans/:id")
  @CubeAuthProxy()
  public async updateAssessmentPlan(
    @Param("id") id: string,
    @Body() payload: Risk.RiskAssessmentPlanParam,
  ): Promise<Risk.RiskAssessmentPlanVO> {
    return await this.proxy.forwardPut<Risk.RiskAssessmentPlanVO>(`${UPSTREAM_PREFIX}/assessment-plans/${id}`, payload);
  }

  @PATCH("/assessment-plans/:id")
  @CubeAuthProxy()
  public async patchAssessmentPlan(@Param("id") id: string, @Body() payload: Risk.RiskEnabledParam): Promise<Risk.RiskAssessmentPlanVO> {
    return await this.proxy.forwardPatch<Risk.RiskAssessmentPlanVO>(`${UPSTREAM_PREFIX}/assessment-plans/${id}`, payload);
  }

  @DELETE("/assessment-plans/:id")
  @CubeAuthProxy()
  public async deleteAssessmentPlan(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`${UPSTREAM_PREFIX}/assessment-plans/${id}`);
  }

  @GET("/warning-rules")
  @CubeAuthProxy()
  public async pageWarningRules(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskWarningRuleVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskWarningRuleVO>>(
      `${UPSTREAM_PREFIX}/warning-rules`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @POST("/warning-rules")
  @CubeAuthProxy()
  public async createWarningRule(@Body() payload: Risk.RiskWarningRuleParam): Promise<Risk.RiskWarningRuleVO> {
    return await this.proxy.forwardPost<Risk.RiskWarningRuleVO>(`${UPSTREAM_PREFIX}/warning-rules`, payload);
  }

  @GET("/warning-rules/:id")
  @CubeAuthProxy()
  public async getWarningRule(@Param("id") id: string): Promise<Risk.RiskWarningRuleVO> {
    return await this.proxy.forwardGet<Risk.RiskWarningRuleVO>(
      `${UPSTREAM_PREFIX}/warning-rules/${id}`,
      undefined,
      {} as Risk.RiskWarningRuleVO,
    );
  }

  @PUT("/warning-rules/:id")
  @CubeAuthProxy()
  public async updateWarningRule(@Param("id") id: string, @Body() payload: Risk.RiskWarningRuleParam): Promise<Risk.RiskWarningRuleVO> {
    return await this.proxy.forwardPut<Risk.RiskWarningRuleVO>(`${UPSTREAM_PREFIX}/warning-rules/${id}`, payload);
  }

  @PATCH("/warning-rules/:id")
  @CubeAuthProxy()
  public async patchWarningRule(@Param("id") id: string, @Body() payload: Risk.RiskEnabledParam): Promise<Risk.RiskWarningRuleVO> {
    return await this.proxy.forwardPatch<Risk.RiskWarningRuleVO>(`${UPSTREAM_PREFIX}/warning-rules/${id}`, payload);
  }

  @DELETE("/warning-rules/:id")
  @CubeAuthProxy()
  public async deleteWarningRule(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`${UPSTREAM_PREFIX}/warning-rules/${id}`);
  }

  @GET("/warning-records")
  @CubeAuthProxy()
  public async pageWarningRecords(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskWarningRecordVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskWarningRecordVO>>(
      `${UPSTREAM_PREFIX}/warning-records`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @GET("/warning-records/export")
  @CubeAuthProxy()
  public async exportWarningRecords(@QueryMap() params?: Risk.RiskPageQuery): Promise<Response> {
    return await this.proxy.forwardGetDownload(`${UPSTREAM_PREFIX}/warning-records/export`, { ...params });
  }

  @GET("/warning-records/:id")
  @CubeAuthProxy()
  public async getWarningRecord(@Param("id") id: string): Promise<Risk.RiskWarningRecordVO> {
    return await this.proxy.forwardGet<Risk.RiskWarningRecordVO>(
      `${UPSTREAM_PREFIX}/warning-records/${id}`,
      undefined,
      {} as Risk.RiskWarningRecordVO,
    );
  }

  @PATCH("/warning-records/:id")
  @CubeAuthProxy()
  public async patchWarningRecord(
    @Param("id") id: string,
    @Body() payload: Risk.RiskWarningDisposeParam,
  ): Promise<Risk.RiskWarningRecordVO> {
    return await this.proxy.forwardPatch<Risk.RiskWarningRecordVO>(`${UPSTREAM_PREFIX}/warning-records/${id}`, payload);
  }

  @GET("/unit-inventory")
  @CubeAuthProxy()
  public async pageUnitInventory(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskUnitInventoryVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskUnitInventoryVO>>(
      `${UPSTREAM_PREFIX}/unit-inventory`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @GET("/unit-inventory/export")
  @CubeAuthProxy()
  public async exportUnitInventory(@QueryMap() params?: Risk.RiskPageQuery): Promise<Response> {
    return await this.proxy.forwardGetDownload(`${UPSTREAM_PREFIX}/unit-inventory/export`, { ...params });
  }

  @GET("/unit-inventory/:unitId/risk-objects")
  @CubeAuthProxy()
  public async listUnitInventoryObjects(
    @Param("unitId") unitId: string,
    @QueryMap() params?: Risk.RiskPageQuery,
  ): Promise<Pagination<Risk.RiskObjectVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskObjectVO>>(
      `${UPSTREAM_PREFIX}/unit-inventory/${unitId}/risk-objects`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @GET("/notice-cards")
  @CubeAuthProxy()
  public async pageNoticeCards(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskNoticeCardVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskNoticeCardVO>>(
      `${UPSTREAM_PREFIX}/notice-cards`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @GET("/notice-cards/export")
  @CubeAuthProxy()
  public async exportNoticeCards(@QueryMap() params?: Risk.RiskPageQuery): Promise<Response> {
    return await this.proxy.forwardGetDownload(`${UPSTREAM_PREFIX}/notice-cards/export`, { ...params });
  }

  @GET("/notice-cards/:unitId")
  @CubeAuthProxy()
  public async getNoticeCard(@Param("unitId") unitId: string): Promise<Risk.RiskNoticeCardVO> {
    return await this.proxy.forwardGet<Risk.RiskNoticeCardVO>(
      `${UPSTREAM_PREFIX}/notice-cards/${unitId}`,
      undefined,
      {} as Risk.RiskNoticeCardVO,
    );
  }

  @GET("/four-color-map-statistics")
  @CubeAuthProxy()
  public async getFourColorMapStatistics(@QueryMap() params?: Risk.RiskPageQuery): Promise<Record<string, number>> {
    return await this.proxy.forwardGet<Record<string, number>>(`${UPSTREAM_PREFIX}/four-color-map-statistics`, { ...params }, {});
  }

  @GET("/four-color-map-units")
  @CubeAuthProxy()
  public async pageFourColorMapUnits(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskFourColorUnitVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskFourColorUnitVO>>(
      `${UPSTREAM_PREFIX}/four-color-map-units`,
      { ...params },
      this.proxy.emptyPage(),
    );
  }

  @GET("/four-color-map-units/:unitId")
  @CubeAuthProxy()
  public async getFourColorMapUnit(@Param("unitId") unitId: string): Promise<Risk.RiskFourColorUnitVO> {
    return await this.proxy.forwardGet<Risk.RiskFourColorUnitVO>(
      `${UPSTREAM_PREFIX}/four-color-map-units/${unitId}`,
      undefined,
      {} as Risk.RiskFourColorUnitVO,
    );
  }

  @GET("/areas")
  @CubeAuthProxy()
  public async pageAreas(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskAreaVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskAreaVO>>(`${UPSTREAM_PREFIX}/areas`, { ...params }, this.proxy.emptyPage());
  }

  @POST("/areas")
  @CubeAuthProxy()
  public async createArea(@Body() payload: Risk.RiskAreaParam): Promise<Risk.RiskAreaVO> {
    return await this.proxy.forwardPost<Risk.RiskAreaVO>(`${UPSTREAM_PREFIX}/areas`, payload);
  }

  @GET("/areas/:id")
  @CubeAuthProxy()
  public async getArea(@Param("id") id: string): Promise<Risk.RiskAreaVO> {
    return await this.proxy.forwardGet<Risk.RiskAreaVO>(`${UPSTREAM_PREFIX}/areas/${id}`, undefined, {} as Risk.RiskAreaVO);
  }

  @PUT("/areas/:id")
  @CubeAuthProxy()
  public async updateArea(@Param("id") id: string, @Body() payload: Risk.RiskAreaParam): Promise<Risk.RiskAreaVO> {
    return await this.proxy.forwardPut<Risk.RiskAreaVO>(`${UPSTREAM_PREFIX}/areas/${id}`, payload);
  }

  @DELETE("/areas/:id")
  @CubeAuthProxy()
  public async deleteArea(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`${UPSTREAM_PREFIX}/areas/${id}`);
  }

  @GET("/units")
  @CubeAuthProxy()
  public async pageUnits(@QueryMap() params?: Risk.RiskPageQuery): Promise<Pagination<Risk.RiskUnitVO>> {
    return await this.proxy.forwardGet<Pagination<Risk.RiskUnitVO>>(`${UPSTREAM_PREFIX}/units`, { ...params }, this.proxy.emptyPage());
  }

  @GET("/units/export")
  @CubeAuthProxy()
  public async exportUnits(@QueryMap() params?: Risk.RiskPageQuery): Promise<Response> {
    return await this.proxy.forwardGetDownload(`${UPSTREAM_PREFIX}/units/export`, { ...params });
  }

  @POST("/units")
  @CubeAuthProxy()
  public async createUnit(@Body() payload: Risk.RiskUnitParam): Promise<Risk.RiskUnitVO> {
    return await this.proxy.forwardPost<Risk.RiskUnitVO>(`${UPSTREAM_PREFIX}/units`, payload);
  }

  @GET("/units/:id")
  @CubeAuthProxy()
  public async getUnit(@Param("id") id: string): Promise<Risk.RiskUnitVO> {
    return await this.proxy.forwardGet<Risk.RiskUnitVO>(`${UPSTREAM_PREFIX}/units/${id}`, undefined, {} as Risk.RiskUnitVO);
  }

  @PUT("/units/:id")
  @CubeAuthProxy()
  public async updateUnit(@Param("id") id: string, @Body() payload: Risk.RiskUnitParam): Promise<Risk.RiskUnitVO> {
    return await this.proxy.forwardPut<Risk.RiskUnitVO>(`${UPSTREAM_PREFIX}/units/${id}`, payload);
  }

  @DELETE("/units/:id")
  @CubeAuthProxy()
  public async deleteUnit(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`${UPSTREAM_PREFIX}/units/${id}`);
  }
}
