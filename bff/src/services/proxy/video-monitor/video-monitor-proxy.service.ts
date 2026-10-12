import { Injectable, Inject, CONFIG_SERVICE_TOKEN, ConfigService } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";
import type {
  AiInspectionEmergencyRule,
  AiInspectionWorkOrderTemplate,
  AuthGroupModifyParam,
  CameraAiInspectionActionRule,
  CameraAiInspectionAlgorithm,
  CameraAiInspectionEvent,
  CameraAiInspectionPlan,
  CameraAiInspectionPlanBase,
  CameraAiInspectionPlanCamera,
  CameraAiInspectionPlanModifyParam,
  CameraAiInspectionPlanPatchParam,
  CameraAiInspectionTask,
  DeviceAuth,
  GenerateAiInspectionEventActionParam,
  IgnoreAiInspectionEventParam,
  ListAiInspectionPlanActionRulesParams,
  ListAiInspectionEmergencyRulesParams,
  ListAiInspectionEventsParams,
  PageAiInspectionPlanCamerasParams,
  ListAiInspectionPlansParams,
  ListAiInspectionTasksParams,
  ListAiInspectionWorkOrderTemplatesParams,
  ListDeviceAuthParams,
} from "@g2-contract/video-monitor";

import { ProxyClient } from "@/clients/proxy-client";
import { buildUrl } from "@/services/request-utils";

/**
 * 视频监控代理服务
 * 负责与后端视频监控服务通信
 */
@Injectable()
export class VideoMonitorProxyService {
  private readonly baseUrl: string;
  private readonly emergencyUrl: string;
  private readonly flowUrl: string;

  constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>("app.videoMonitorUrl") || "";
    this.emergencyUrl = this.configService.get<string>("app.emergencyUrl") || "";
    this.flowUrl = this.configService.get<string>("app.flowUrl") || "";
  }

  /**
   * 创建摄像头授权
   */
  async createCameraAuth(data: AuthGroupModifyParam): Promise<{ id: string }> {
    const url = `${this.baseUrl}/camera-auths`;
    const response = await this.proxyClient.request<{ id: string }>(url, {
      method: "POST",
      body: data,
      passthroughError: true,
    });
    return response.data;
  }

  /**
   * 更新摄像头授权
   */
  async updateCameraAuth(id: string, data: AuthGroupModifyParam): Promise<void> {
    const url = `${this.baseUrl}/camera-auths/${id}`;
    await this.proxyClient.request(url, {
      method: "PUT",
      body: data,
      passthroughError: true,
      parseJson: false,
    });
  }

  /**
   * 删除摄像头授权
   */
  async deleteCameraAuth(id: string): Promise<void> {
    const url = `${this.baseUrl}/camera-auths/${id}`;
    await this.proxyClient.request(url, {
      method: "DELETE",
      passthroughError: true,
      parseJson: false,
    });
  }

  /**
   * 获取摄像头授权详情
   */
  async getCameraAuthDetail(id: string): Promise<DeviceAuth> {
    const url = `${this.baseUrl}/camera-auths/${id}`;
    const response = await this.proxyClient.request<DeviceAuth>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  /**
   * 获取摄像头授权列表
   */
  public async getCameraAuthList(query?: ListDeviceAuthParams): Promise<Pagination<DeviceAuth>> {
    const url = `${this.baseUrl}/camera-auths`;
    const fullUrl = buildUrl(url, { ...query });
    const response = await this.proxyClient.request<Pagination<DeviceAuth>>(fullUrl, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async listAiInspectionAlgorithms(): Promise<CameraAiInspectionAlgorithm[]> {
    const url = `${this.baseUrl}/camera-ai-inspection-algorithms`;
    const response = await this.proxyClient.request<CameraAiInspectionAlgorithm[]>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async listAiInspectionPlans(query?: ListAiInspectionPlansParams): Promise<Pagination<CameraAiInspectionPlan>> {
    const url = buildUrl(`${this.baseUrl}/camera-ai-inspection-plans`, this.toQueryParams(query));
    const response = await this.proxyClient.request<Pagination<CameraAiInspectionPlan>>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async getAiInspectionPlan(id: string): Promise<CameraAiInspectionPlanBase> {
    const url = `${this.baseUrl}/camera-ai-inspection-plan/${id}`;
    const response = await this.proxyClient.request<CameraAiInspectionPlanBase>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async pageAiInspectionPlanCameras(
    id: string,
    query?: PageAiInspectionPlanCamerasParams,
  ): Promise<Pagination<CameraAiInspectionPlanCamera>> {
    const url = buildUrl(`${this.baseUrl}/camera-ai-inspection-plan/${id}/cameras`, this.toQueryParams(query));
    const response = await this.proxyClient.request<Pagination<CameraAiInspectionPlanCamera>>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async listAiInspectionPlanActionRules(
    id: string,
    query?: ListAiInspectionPlanActionRulesParams,
  ): Promise<CameraAiInspectionActionRule[]> {
    const url = buildUrl(`${this.baseUrl}/camera-ai-inspection-plan/${id}/action-rules`, this.toQueryParams(query));
    const response = await this.proxyClient.request<CameraAiInspectionActionRule[]>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async createAiInspectionPlan(data: CameraAiInspectionPlanModifyParam): Promise<string> {
    const url = `${this.baseUrl}/camera-ai-inspection-plan`;
    const response = await this.proxyClient.request<string>(url, {
      method: "POST",
      body: data,
      passthroughError: true,
    });
    return String(response.data);
  }

  public async patchAiInspectionPlan(id: string, data: CameraAiInspectionPlanPatchParam): Promise<void> {
    const url = `${this.baseUrl}/camera-ai-inspection-plan/${id}`;
    await this.proxyClient.request(url, {
      method: "PATCH",
      body: data,
      passthroughError: true,
      parseJson: false,
    });
  }

  public async updateAiInspectionPlanEnabled(id: string, enabled: boolean): Promise<void> {
    const url = `${this.baseUrl}/camera-ai-inspection-plan/${id}/${enabled}`;
    await this.proxyClient.request(url, {
      method: "PUT",
      passthroughError: true,
      parseJson: false,
    });
  }

  public async deleteAiInspectionPlan(id: string): Promise<void> {
    const url = `${this.baseUrl}/camera-ai-inspection-plan/${id}`;
    await this.proxyClient.request(url, {
      method: "DELETE",
      passthroughError: true,
      parseJson: false,
    });
  }

  public async runAiInspectionPlanOnce(id: string): Promise<string> {
    const url = `${this.baseUrl}/camera-ai-inspection-plan/${id}/run-once`;
    const response = await this.proxyClient.request<string>(url, {
      method: "POST",
      passthroughError: true,
    });
    return String(response.data);
  }

  public async listAiInspectionTasks(query?: ListAiInspectionTasksParams): Promise<Pagination<CameraAiInspectionTask>> {
    const url = buildUrl(`${this.baseUrl}/camera-ai-inspection-tasks`, this.toQueryParams(query));
    const response = await this.proxyClient.request<Pagination<CameraAiInspectionTask>>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async getAiInspectionTask(id: string): Promise<CameraAiInspectionTask> {
    const url = `${this.baseUrl}/camera-ai-inspection-task/${id}`;
    const response = await this.proxyClient.request<CameraAiInspectionTask>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async listAiInspectionEvents(query?: ListAiInspectionEventsParams): Promise<Pagination<CameraAiInspectionEvent>> {
    const url = buildUrl(`${this.baseUrl}/camera-ai-inspection-events`, this.toQueryParams(query));
    const response = await this.proxyClient.request<Pagination<CameraAiInspectionEvent>>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async getAiInspectionEvent(id: string): Promise<CameraAiInspectionEvent> {
    const url = `${this.baseUrl}/camera-ai-inspection-event/${id}`;
    const response = await this.proxyClient.request<CameraAiInspectionEvent>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async ignoreAiInspectionEvent(id: string, data: IgnoreAiInspectionEventParam): Promise<void> {
    const url = `${this.baseUrl}/camera-ai-inspection-event/${id}/ignore`;
    await this.proxyClient.request(url, {
      method: "PUT",
      body: data,
      passthroughError: true,
      parseJson: false,
    });
  }

  public async generateAiInspectionEventAction(id: string, data: GenerateAiInspectionEventActionParam): Promise<void> {
    const url = `${this.baseUrl}/camera-ai-inspection-event/${id}/generate-action`;
    await this.proxyClient.request(url, {
      method: "POST",
      body: data,
      passthroughError: true,
      parseJson: false,
    });
  }

  public async listAiInspectionEmergencyRules(
    query?: ListAiInspectionEmergencyRulesParams,
  ): Promise<Pagination<AiInspectionEmergencyRule>> {
    const url = buildUrl(`${this.emergencyUrl}/emergency-rule/list-page`, this.toQueryParams({ ...query, enabled: true }));
    const response = await this.proxyClient.request<Pagination<AiInspectionEmergencyRule>>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async listAiInspectionWorkOrderTemplates(
    query?: ListAiInspectionWorkOrderTemplatesParams,
  ): Promise<Pagination<AiInspectionWorkOrderTemplate>> {
    const url = buildUrl(`${this.flowUrl}/form-flow/type/page`, this.toQueryParams(query));
    const response = await this.proxyClient.request<Pagination<AiInspectionWorkOrderTemplate>>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async getAiInspectionWorkOrderTemplate(id: string): Promise<AiInspectionWorkOrderTemplate> {
    const url = `${this.flowUrl}/form-flow/${id}`;
    const response = await this.proxyClient.request<AiInspectionWorkOrderTemplate>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  private toQueryParams(params?: object): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    if (!params) {
      return query;
    }
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      if (key === "period" && typeof value === "object" && !Array.isArray(value)) {
        const period = value as { begin?: string; end?: string };
        if (period.begin) {
          query["period.begin"] = period.begin;
        }
        if (period.end) {
          query["period.end"] = period.end;
        }
        continue;
      }
      query[key] = Array.isArray(value) ? value.join(",") : value;
    }
    return query;
  }
}
