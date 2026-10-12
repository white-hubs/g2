import { Body, Controller, GET, Param, POST, QueryMap } from "@dangao/bun-server";
import type {
  CompleteFumigationWorkPayload,
  CreateFumigationWorkPayload,
  FumigationArchiveQuery,
  FumigationArchiveRecord,
  FumigationArchiveDocument,
  FumigationApplicationMethodCode,
  FumigationDeviceOption,
  FumigationEnumOption,
  FumigationGrainVarietyOption,
  FumigationPageResult,
  FumigationPesticideTypeCode,
  FumigationPrecheckResult,
  FumigationPrecheckStepId,
  FumigationRealtimeSituation,
  FumigationRealtimeSituationAlarmItem,
  FumigationRealtimeSituationDeviceItem,
  FumigationRealtimeSituationStats,
  FumigationRealtimeSituationWarehouseItem,
  FumigationRealtimeSituationWorks,
  FumigationWarehouseOption,
  FumigationWorkerOption,
  FumigationWork,
  FumigationWorkQuery,
  RunFumigationPrecheckPayload,
  SendFumigationNotificationPayload,
  SubmitFumigationApprovalPayload,
  TerminateFumigationWorkPayload,
} from "@g2-contract/fumigation-operation";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { FumigationOperationProxyService } from "@/services/proxy/fumigation-operation/fumigation-operation-proxy.service";

@Controller("/gw-bff/security-management/fumigation")
export class FumigationOperationController {
  public constructor(private readonly proxy: FumigationOperationProxyService) {}

  @GET("/works")
  @CubeAuthProxy()
  public async listWorks(@QueryMap() params: FumigationWorkQuery): Promise<FumigationPageResult<FumigationWork>> {
    return await this.proxy.listWorks(params);
  }

  @GET("/works/:id")
  @CubeAuthProxy()
  public async getWork(@Param("id") id: string): Promise<FumigationWork> {
    return await this.proxy.getWork(id);
  }

  @POST("/works")
  @CubeAuthProxy()
  public async createWork(@Body() payload: CreateFumigationWorkPayload): Promise<FumigationWork> {
    return await this.proxy.createWork(payload);
  }

  @POST("/works/:id/approvals")
  @CubeAuthProxy()
  public async submitApproval(@Param("id") id: string, @Body() payload: SubmitFumigationApprovalPayload): Promise<FumigationWork> {
    return await this.proxy.submitApproval(id, payload);
  }

  @GET("/works/:id/prechecks")
  @CubeAuthProxy()
  public async getPrechecks(@Param("id") id: string): Promise<Record<FumigationPrecheckStepId, FumigationPrecheckResult>> {
    return await this.proxy.getPrechecks(id);
  }

  @POST("/works/:id/prechecks")
  @CubeAuthProxy()
  public async runPrecheck(@Param("id") id: string, @Body() payload: RunFumigationPrecheckPayload): Promise<FumigationPrecheckResult> {
    return await this.proxy.runPrecheck(id, payload);
  }

  @POST("/works/:id/prechecks/run")
  @CubeAuthProxy()
  public async runPrechecks(@Param("id") id: string): Promise<Record<FumigationPrecheckStepId, FumigationPrecheckResult>> {
    return await this.proxy.runPrechecks(id);
  }

  @POST("/works/:id/complete")
  @CubeAuthProxy()
  public async completeWork(@Param("id") id: string, @Body() payload: CompleteFumigationWorkPayload): Promise<FumigationWork> {
    return await this.proxy.completeWork(id, payload);
  }

  @POST("/works/:id/terminate")
  @CubeAuthProxy()
  public async terminateWork(@Param("id") id: string, @Body() payload: TerminateFumigationWorkPayload): Promise<FumigationWork> {
    return await this.proxy.terminateWork(id, payload);
  }

  @POST("/works/:id/notifications")
  @CubeAuthProxy()
  public async sendNotification(@Param("id") id: string, @Body() payload: SendFumigationNotificationPayload): Promise<void> {
    await this.proxy.sendNotification(id, payload);
  }

  @GET("/support/warehouses")
  @CubeAuthProxy()
  public async listWarehouses(@QueryMap() params: { keyword?: string; areaId?: string }): Promise<FumigationWarehouseOption[]> {
    return await this.proxy.listWarehouses(params);
  }

  @GET("/support/warehouses/:warehouseId/grain-varieties")
  @CubeAuthProxy()
  public async listGrainVarieties(@Param("warehouseId") warehouseId: string): Promise<FumigationGrainVarietyOption[]> {
    return await this.proxy.listGrainVarieties(warehouseId);
  }

  @GET("/support/pesticide-types")
  @CubeAuthProxy()
  public async listPesticideTypes(): Promise<FumigationEnumOption<FumigationPesticideTypeCode>[]> {
    return await this.proxy.listPesticideTypes();
  }

  @GET("/support/application-methods")
  @CubeAuthProxy()
  public async listApplicationMethods(): Promise<FumigationEnumOption<FumigationApplicationMethodCode>[]> {
    return await this.proxy.listApplicationMethods();
  }

  @GET("/devices")
  @CubeAuthProxy()
  public async listDevices(
    @QueryMap() params: { warehouseId?: string; pageNumber?: number; pageSize?: number; keyword?: string },
  ): Promise<FumigationDeviceOption[]> {
    return await this.proxy.listDevices(params);
  }

  @GET("/devices/:deviceId/monitor")
  @CubeAuthProxy()
  public async getDeviceMonitor(@Param("deviceId") deviceId: string): Promise<FumigationDeviceOption> {
    return await this.proxy.getDeviceMonitor(deviceId);
  }

  @GET("/devices/:deviceId/properties")
  @CubeAuthProxy()
  public async getDeviceProperties(
    @Param("deviceId") deviceId: string,
    @QueryMap() params: { propertyCodes?: string },
  ): Promise<FumigationDeviceOption["properties"]> {
    const codes = params.propertyCodes
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return await this.proxy.getDeviceProperties(deviceId, codes);
  }

  @GET("/devices/:deviceId/linked")
  @CubeAuthProxy()
  public async listLinkedDevices(@Param("deviceId") deviceId: string): Promise<FumigationDeviceOption["linkedDevices"]> {
    return await this.proxy.listLinkedDevices(deviceId);
  }

  @GET("/devices/:deviceId/associated-videos")
  @CubeAuthProxy()
  public async listAssociatedVideos(@Param("deviceId") deviceId: string): Promise<FumigationDeviceOption["cameras"]> {
    return await this.proxy.listAssociatedVideos(deviceId);
  }

  @GET("/workers")
  @CubeAuthProxy()
  public async listWorkers(): Promise<FumigationWorkerOption[]> {
    return await this.proxy.listWorkers();
  }

  @GET("/archives")
  @CubeAuthProxy()
  public async listArchives(@QueryMap() params: FumigationArchiveQuery): Promise<FumigationPageResult<FumigationArchiveRecord>> {
    return await this.proxy.listArchives(params);
  }

  @POST("/archives/generate")
  @CubeAuthProxy()
  public async generateArchive(@Body("workId") workId: string): Promise<FumigationArchiveRecord> {
    return await this.proxy.generateArchive(workId);
  }

  @GET("/archives/:archiveId/document")
  @CubeAuthProxy()
  public async getArchiveDocument(@Param("archiveId") archiveId: string): Promise<FumigationArchiveDocument> {
    return await this.proxy.getArchiveDocument(archiveId);
  }

  @GET("/realtime-situation")
  @CubeAuthProxy()
  public async getRealtimeSituation(@QueryMap() params: { applicationCode?: string }): Promise<FumigationRealtimeSituation> {
    return await this.proxy.getRealtimeSituation(params.applicationCode);
  }

  @GET("/realtime-situation/stats")
  @CubeAuthProxy()
  public async getRealtimeSituationStats(): Promise<FumigationRealtimeSituationStats> {
    return await this.proxy.getRealtimeSituationStats();
  }

  @GET("/realtime-situation/works")
  @CubeAuthProxy()
  public async getRealtimeSituationWorks(): Promise<FumigationRealtimeSituationWorks> {
    return await this.proxy.getRealtimeSituationWorks();
  }

  @GET("/realtime-situation/warehouses")
  @CubeAuthProxy()
  public async listRealtimeSituationWarehouses(): Promise<FumigationRealtimeSituationWarehouseItem[]> {
    return await this.proxy.listRealtimeSituationWarehouses();
  }

  @GET("/realtime-situation/devices")
  @CubeAuthProxy()
  public async listRealtimeSituationDevices(): Promise<FumigationRealtimeSituationDeviceItem[]> {
    return await this.proxy.listRealtimeSituationDevices();
  }

  @GET("/realtime-situation/alarms")
  @CubeAuthProxy()
  public async listRealtimeSituationAlarms(
    @QueryMap() params: { applicationCode?: string },
  ): Promise<FumigationRealtimeSituationAlarmItem[]> {
    return await this.proxy.listRealtimeSituationAlarms(params.applicationCode);
  }
}
