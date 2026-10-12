import { Body, Controller, DELETE, GET, Param, POST, PUT, Query, QueryMap } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { SecurityOpinionProxyService } from "@/services/proxy/security-opinion/security-opinion-proxy.service";

const OPINION_PREFIX = "/public-opinion";

@Controller("/gw-bff/security-opinion")
export class SecurityOpinionController {
  constructor(private readonly proxy: SecurityOpinionProxyService) {}

  @GET("/opinions")
  @CubeAuthProxy()
  public async pageOpinions(@QueryMap() params: Record<string, unknown>): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/opinions`, params, this.proxy.emptyPage());
  }

  @GET("/opinions/:id")
  @CubeAuthProxy()
  public async getOpinion(@Param("id") id: string): Promise<unknown> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/opinions/${id}`, undefined, {});
  }

  @POST("/opinions/export")
  @CubeAuthProxy()
  public async exportOpinions(@Body() params: Record<string, unknown>): Promise<Response> {
    return await this.proxy.forwardPostDownload(`${OPINION_PREFIX}/opinions/export`, params);
  }

  @POST("/opinions/batch-delete")
  @CubeAuthProxy()
  public async batchDeleteOpinions(@Body() payload: unknown): Promise<void> {
    await this.proxy.forwardPost(`${OPINION_PREFIX}/opinions/batch-delete`, payload);
  }

  @GET("/sources")
  @CubeAuthProxy()
  public async listSources(): Promise<unknown[]> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/sources`, undefined, []);
  }

  @POST("/sources")
  @CubeAuthProxy()
  public async createSource(@Body() payload: Record<string, unknown>): Promise<unknown> {
    return await this.proxy.forwardPost(`${OPINION_PREFIX}/sources`, payload);
  }

  @GET("/sources/:id")
  @CubeAuthProxy()
  public async getSource(@Param("id") id: string): Promise<unknown> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/sources/${id}`, undefined, {});
  }

  @PUT("/sources/:id")
  @CubeAuthProxy()
  public async updateSource(@Param("id") id: string, @Body() payload: Record<string, unknown>): Promise<unknown> {
    return await this.proxy.forwardPut(`${OPINION_PREFIX}/sources/${id}`, payload);
  }

  @DELETE("/sources/:id")
  @CubeAuthProxy()
  public async deleteSource(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`${OPINION_PREFIX}/sources/${id}`);
  }

  @POST("/sources/:id/pause")
  @CubeAuthProxy()
  public async pauseSource(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardPost(`${OPINION_PREFIX}/sources/${id}/pause`);
  }

  @POST("/sources/:id/resume")
  @CubeAuthProxy()
  public async resumeSource(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardPost(`${OPINION_PREFIX}/sources/${id}/resume`);
  }

  @GET("/keyword-rule")
  @CubeAuthProxy()
  public async getKeywordRule(): Promise<unknown> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/keyword-rule`, undefined, {});
  }

  @PUT("/keyword-rule")
  @CubeAuthProxy()
  public async updateKeywordRule(@Body() payload: Record<string, unknown>): Promise<void> {
    await this.proxy.forwardPut(`${OPINION_PREFIX}/keyword-rule`, payload);
  }

  @GET("/keywords")
  @CubeAuthProxy()
  public async listKeywords(@Query("type") type: string): Promise<unknown[]> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/keywords`, { type }, []);
  }

  @POST("/keywords")
  @CubeAuthProxy()
  public async addKeyword(@Body() payload: Record<string, unknown>): Promise<unknown> {
    return await this.proxy.forwardPost(`${OPINION_PREFIX}/keywords`, payload);
  }

  @DELETE("/keywords/:id")
  @CubeAuthProxy()
  public async deleteKeyword(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`${OPINION_PREFIX}/keywords/${id}`);
  }

  @GET("/keyword-presets")
  @CubeAuthProxy()
  public async listKeywordPresets(@Query("type") type: string): Promise<string[]> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/keyword-presets`, { type }, []);
  }

  @POST("/keywords/presets")
  @CubeAuthProxy()
  public async addKeywordFromPreset(@Body() payload: Record<string, unknown>): Promise<unknown> {
    return await this.proxy.forwardPost(`${OPINION_PREFIX}/keywords/presets`, payload);
  }

  @POST("/keywords/presets/batch")
  @CubeAuthProxy()
  public async batchAddKeywordPresets(@Query("type") type: string): Promise<unknown[]> {
    return await this.proxy.forwardPost(`${OPINION_PREFIX}/keywords/presets/batch`, undefined, { type });
  }

  @GET("/recycle-bin")
  @CubeAuthProxy()
  public async pageTrash(@QueryMap() params: Record<string, unknown>): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/recycle-bin`, params, this.proxy.emptyPage());
  }

  @GET("/recycle-bin/:id")
  @CubeAuthProxy()
  public async getTrashItem(@Param("id") id: string): Promise<unknown> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/recycle-bin/${id}`, undefined, {});
  }

  @DELETE("/recycle-bin")
  @CubeAuthProxy()
  public async clearTrash(): Promise<void> {
    await this.proxy.forwardDelete(`${OPINION_PREFIX}/recycle-bin`);
  }

  @POST("/recycle-bin/:id/restore")
  @CubeAuthProxy()
  public async restoreTrashItem(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardPost(`${OPINION_PREFIX}/recycle-bin/${id}/restore`);
  }

  @DELETE("/recycle-bin/:id")
  @CubeAuthProxy()
  public async deleteTrashItem(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`${OPINION_PREFIX}/recycle-bin/${id}`);
  }

  @GET("/alerts")
  @CubeAuthProxy()
  public async pageAlerts(@QueryMap() params: Record<string, unknown>): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/alerts`, params, this.proxy.emptyPage());
  }

  @GET("/alerts/notification-config")
  @CubeAuthProxy()
  public async getAlertNotificationConfig(): Promise<unknown> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/alerts/notification-config`, undefined, {});
  }

  @POST("/alerts/notification-config")
  @CubeAuthProxy()
  public async saveAlertNotificationConfig(@Body() payload: Record<string, unknown>): Promise<void> {
    await this.proxy.forwardPost(`${OPINION_PREFIX}/alerts/notification-config`, payload);
  }

  @GET("/alerts/channels")
  @CubeAuthProxy()
  public async listAlertChannels(@QueryMap() params: Record<string, unknown>): Promise<unknown[]> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/alerts/channels`, params, []);
  }

  @GET("/alerts/receivers")
  @CubeAuthProxy()
  public async pageAlertReceivers(@QueryMap() params: Record<string, unknown>): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/alerts/receivers`, params, this.proxy.emptyPage());
  }

  @GET("/alerts/:opinionId")
  @CubeAuthProxy()
  public async getAlert(@Param("opinionId") opinionId: string): Promise<unknown> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/alerts/${opinionId}`, undefined, {});
  }

  @POST("/alerts/:opinionId/push")
  @CubeAuthProxy()
  public async pushAlert(@Param("opinionId") opinionId: string, @Body() payload?: Record<string, unknown>): Promise<void> {
    await this.proxy.forwardPost(`${OPINION_PREFIX}/alerts/${opinionId}/push`, payload ?? {});
  }

  @GET("/alerts/:opinionId/push-records")
  @CubeAuthProxy()
  public async listAlertPushRecords(@Param("opinionId") opinionId: string): Promise<unknown[]> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/alerts/${opinionId}/push-records`, undefined, []);
  }

  @GET("/alerts/events/:eventId")
  @CubeAuthProxy()
  public async getAlertEvent(@Param("eventId") eventId: string): Promise<unknown> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/alerts/events/${eventId}`, undefined, {});
  }

  @POST("/alerts/events/:eventId/archive")
  @CubeAuthProxy()
  public async archiveAlertEvent(@Param("eventId") eventId: string, @Body() payload: Record<string, unknown>): Promise<void> {
    await this.proxy.forwardPost(`${OPINION_PREFIX}/alerts/events/${eventId}/archive`, payload);
  }

  @GET("/review-reports")
  @CubeAuthProxy()
  public async pageReviewReports(@QueryMap() params: Record<string, unknown>): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/review-reports`, params, this.proxy.emptyPage());
  }

  @GET("/review-reports/events/:eventId")
  @CubeAuthProxy()
  public async getReviewReportEvent(@Param("eventId") eventId: string): Promise<unknown> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/review-reports/events/${eventId}`, undefined, {});
  }

  @POST("/review-reports/events/:eventId/generate")
  @CubeAuthProxy()
  public async generateReviewReport(@Param("eventId") eventId: string): Promise<unknown> {
    return await this.proxy.forwardPost(`${OPINION_PREFIX}/review-reports/events/${eventId}/generate`);
  }

  @POST("/review-reports/:reportId/draft")
  @CubeAuthProxy()
  public async saveReviewReportDraft(@Param("reportId") reportId: string, @Body() payload: Record<string, unknown>): Promise<void> {
    await this.proxy.forwardPost(`${OPINION_PREFIX}/review-reports/${reportId}/draft`, payload);
  }

  @POST("/review-reports/:reportId/finalize")
  @CubeAuthProxy()
  public async finalizeReviewReport(@Param("reportId") reportId: string): Promise<void> {
    await this.proxy.forwardPost(`${OPINION_PREFIX}/review-reports/${reportId}/finalize`);
  }

  @GET("/statistics/overview")
  @CubeAuthProxy()
  public async getStatisticsOverview(): Promise<unknown> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/statistics/overview`, undefined, {});
  }

  @GET("/statistics/sentiment-distribution")
  @CubeAuthProxy()
  public async getSentimentDistribution(): Promise<unknown[]> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/statistics/sentiment-distribution`, undefined, []);
  }

  @GET("/statistics/source-distribution")
  @CubeAuthProxy()
  public async getSourceDistribution(): Promise<unknown[]> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/statistics/source-distribution`, undefined, []);
  }

  @GET("/statistics/collect-trend")
  @CubeAuthProxy()
  public async getCollectionTrend(): Promise<unknown[]> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/statistics/collect-trend`, undefined, []);
  }

  @GET("/statistics/keyword-rank")
  @CubeAuthProxy()
  public async getKeywordRanking(): Promise<unknown[]> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/statistics/keyword-rank`, undefined, []);
  }

  @GET("/statistics/hot-events")
  @CubeAuthProxy()
  public async getHotEvents(@Query("limit") limit?: number): Promise<unknown[]> {
    return await this.proxy.forwardGet(`${OPINION_PREFIX}/statistics/hot-events`, limit === undefined ? undefined : { limit }, []);
  }
}
