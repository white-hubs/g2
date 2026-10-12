import { Body, Controller, DELETE, GET, PATCH, Param, POST, PUT, QueryMap } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";
import type {
  AiInspectionEmergencyRule,
  AiInspectionWorkOrderTemplate,
  CameraAiInspectionActionRule,
  CameraAiInspectionAlgorithm,
  CameraAiInspectionEvent,
  CameraAiInspectionPlan,
  CameraAiInspectionPlanBase,
  CameraAiInspectionPlanCamera,
  CameraAiInspectionPlanModifyParam,
  CameraAiInspectionPlanPatchParam,
  CameraAiInspectionTask,
  GenerateAiInspectionEventActionParam,
  IgnoreAiInspectionEventParam,
  ListAiInspectionPlanActionRulesParams,
  ListAiInspectionEmergencyRulesParams,
  ListAiInspectionEventsParams,
  PageAiInspectionPlanCamerasParams,
  ListAiInspectionPlansParams,
  ListAiInspectionTasksParams,
  ListAiInspectionWorkOrderTemplatesParams,
} from "@g2-contract/video-monitor";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { VideoMonitorProxyService } from "@/services/proxy/video-monitor/video-monitor-proxy.service";

@Controller("/gw-bff/video-monitor")
export class VideoMonitorAiInspectionController {
  constructor(private readonly videoMonitorProxyService: VideoMonitorProxyService) {}

  @GET("/camera-ai-inspection-algorithms")
  @CubeAuthProxy()
  public async listAiInspectionAlgorithms(): Promise<CameraAiInspectionAlgorithm[]> {
    return await this.videoMonitorProxyService.listAiInspectionAlgorithms();
  }

  @GET("/camera-ai-inspection-plans")
  @CubeAuthProxy()
  public async listAiInspectionPlans(@QueryMap() params: ListAiInspectionPlansParams): Promise<Pagination<CameraAiInspectionPlan>> {
    return await this.videoMonitorProxyService.listAiInspectionPlans(params);
  }

  @GET("/camera-ai-inspection-plan/:id/cameras")
  @CubeAuthProxy()
  public async pageAiInspectionPlanCameras(
    @Param("id") id: string,
    @QueryMap() params: PageAiInspectionPlanCamerasParams,
  ): Promise<Pagination<CameraAiInspectionPlanCamera>> {
    return await this.videoMonitorProxyService.pageAiInspectionPlanCameras(id, params);
  }

  @GET("/camera-ai-inspection-plan/:id/action-rules")
  @CubeAuthProxy()
  public async listAiInspectionPlanActionRules(
    @Param("id") id: string,
    @QueryMap() params: ListAiInspectionPlanActionRulesParams,
  ): Promise<CameraAiInspectionActionRule[]> {
    return await this.videoMonitorProxyService.listAiInspectionPlanActionRules(id, params);
  }

  @GET("/camera-ai-inspection-plan/:id")
  @CubeAuthProxy()
  public async getAiInspectionPlan(@Param("id") id: string): Promise<CameraAiInspectionPlanBase> {
    return await this.videoMonitorProxyService.getAiInspectionPlan(id);
  }

  @POST("/camera-ai-inspection-plan")
  @CubeAuthProxy()
  public async createAiInspectionPlan(@Body() data: CameraAiInspectionPlanModifyParam): Promise<string> {
    return await this.videoMonitorProxyService.createAiInspectionPlan(data);
  }

  @PATCH("/camera-ai-inspection-plan/:id")
  @CubeAuthProxy()
  public async patchAiInspectionPlan(@Param("id") id: string, @Body() data: CameraAiInspectionPlanPatchParam): Promise<void> {
    return await this.videoMonitorProxyService.patchAiInspectionPlan(id, data);
  }

  @PUT("/camera-ai-inspection-plan/:id/:enabled")
  @CubeAuthProxy()
  public async updateAiInspectionPlanEnabled(@Param("id") id: string, @Param("enabled") enabled: string): Promise<void> {
    return await this.videoMonitorProxyService.updateAiInspectionPlanEnabled(id, enabled === "true");
  }

  @DELETE("/camera-ai-inspection-plan/:id")
  @CubeAuthProxy()
  public async deleteAiInspectionPlan(@Param("id") id: string): Promise<void> {
    return await this.videoMonitorProxyService.deleteAiInspectionPlan(id);
  }

  @POST("/camera-ai-inspection-plan/:id/run-once")
  @CubeAuthProxy()
  public async runAiInspectionPlanOnce(@Param("id") id: string): Promise<string> {
    return await this.videoMonitorProxyService.runAiInspectionPlanOnce(id);
  }

  @GET("/camera-ai-inspection-tasks")
  @CubeAuthProxy()
  public async listAiInspectionTasks(@QueryMap() params: ListAiInspectionTasksParams): Promise<Pagination<CameraAiInspectionTask>> {
    return await this.videoMonitorProxyService.listAiInspectionTasks(params);
  }

  @GET("/camera-ai-inspection-task/:id")
  @CubeAuthProxy()
  public async getAiInspectionTask(@Param("id") id: string): Promise<CameraAiInspectionTask> {
    return await this.videoMonitorProxyService.getAiInspectionTask(id);
  }

  @GET("/camera-ai-inspection-events")
  @CubeAuthProxy()
  public async listAiInspectionEvents(@QueryMap() params: ListAiInspectionEventsParams): Promise<Pagination<CameraAiInspectionEvent>> {
    return await this.videoMonitorProxyService.listAiInspectionEvents(params);
  }

  @GET("/camera-ai-inspection-event/:id")
  @CubeAuthProxy()
  public async getAiInspectionEvent(@Param("id") id: string): Promise<CameraAiInspectionEvent> {
    return await this.videoMonitorProxyService.getAiInspectionEvent(id);
  }

  @PUT("/camera-ai-inspection-event/:id/ignore")
  @CubeAuthProxy()
  public async ignoreAiInspectionEvent(@Param("id") id: string, @Body() data: IgnoreAiInspectionEventParam): Promise<void> {
    return await this.videoMonitorProxyService.ignoreAiInspectionEvent(id, data);
  }

  @POST("/camera-ai-inspection-event/:id/generate-action")
  @CubeAuthProxy()
  public async generateAiInspectionEventAction(@Param("id") id: string, @Body() data: GenerateAiInspectionEventActionParam): Promise<void> {
    return await this.videoMonitorProxyService.generateAiInspectionEventAction(id, data);
  }

  @GET("/ai-inspection/emergency-rules")
  @CubeAuthProxy()
  public async listAiInspectionEmergencyRules(
    @QueryMap() params: ListAiInspectionEmergencyRulesParams,
  ): Promise<Pagination<AiInspectionEmergencyRule>> {
    return await this.videoMonitorProxyService.listAiInspectionEmergencyRules(params);
  }

  @GET("/ai-inspection/work-order-templates")
  @CubeAuthProxy()
  public async listAiInspectionWorkOrderTemplates(
    @QueryMap() params: ListAiInspectionWorkOrderTemplatesParams,
  ): Promise<Pagination<AiInspectionWorkOrderTemplate>> {
    return await this.videoMonitorProxyService.listAiInspectionWorkOrderTemplates(params);
  }

  @GET("/ai-inspection/work-order-template/:id")
  @CubeAuthProxy()
  public async getAiInspectionWorkOrderTemplate(@Param("id") id: string): Promise<AiInspectionWorkOrderTemplate> {
    return await this.videoMonitorProxyService.getAiInspectionWorkOrderTemplate(id);
  }
}
