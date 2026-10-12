import { Body, Controller, GET, Param, POST, QueryMap } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";
import type { DeviceGroup, DeviceInstance } from "@g2-contract/device-center";
import type {
  ListVideoMonitorDeviceOfRuleParams,
  ListVideoMonitorDeviceParams,
  ListVideoMonitorGroupParams,
  ListAiInspectionCameraOptionsParams,
  GetAiInspectionCameraOptionsByIdsParams,
  QueryVideoMonitorDeviceIdsByAreaOrGroupAndTagParams,
  VideoMonitorDeviceGateway,
  VideoMonitorGroupGateway,
  VideoMonitorDeviceOption,
} from "@g2-contract/video-monitor";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { DeviceCenterProxyService } from "@/services/proxy/device-center/device-center-proxy.service";

export const VIDEO_MONITOR_TAG_CODE = "builtin.app::SECURITY_MONITORING";

/**
 * 视频监控授权控制器
 * 实现 VideoMonitorAuthGateway 接口
 */
@Controller("/gw-bff/video-monitor")
export class VideoMonitorDeviceController implements VideoMonitorDeviceGateway, VideoMonitorGroupGateway {
  constructor(private readonly deviceCenterProxyService: DeviceCenterProxyService) {}

  @GET("/devices-of-rule")
  @CubeAuthProxy()
  public async listVideoMonitorDeviceOfRule(@QueryMap() params: ListVideoMonitorDeviceOfRuleParams): Promise<Pagination<DeviceInstance>> {
    const tagRule = await this.deviceCenterProxyService.getDeviceTagRule(VIDEO_MONITOR_TAG_CODE);
    return await this.deviceCenterProxyService.listDeviceInstanceOfRuleCondition({
      ...params,
      ruleGroup: JSON.parse(tagRule.rule),
    });
  }

  @POST("/devices")
  @CubeAuthProxy()
  public async listVideoMonitorDevice(@Body() params: ListVideoMonitorDeviceParams): Promise<Pagination<DeviceInstance>> {
    return await this.deviceCenterProxyService.listDeviceInstances({
      ...params,
      tagCodes: [VIDEO_MONITOR_TAG_CODE],
    });
  }

  @GET("/device-groups")
  @CubeAuthProxy()
  public async listVideoMonitorGroup(@QueryMap() params: ListVideoMonitorGroupParams): Promise<Pagination<DeviceGroup>> {
    return await this.deviceCenterProxyService.listDeviceGroup({
      ...params,
      tagCode: VIDEO_MONITOR_TAG_CODE,
    });
  }

  @GET("/device-groups/:id")
  @CubeAuthProxy()
  public async getVideoMonitorGroup(@Param("id") id: string): Promise<DeviceGroup> {
    return await this.deviceCenterProxyService.getDeviceGroup(id);
  }

  @POST("/devices-by-area-or-group-and-tag")
  @CubeAuthProxy()
  public async queryVideoMonitorDeviceByAreaOrGroupAndTag(
    @Body() params: QueryVideoMonitorDeviceIdsByAreaOrGroupAndTagParams,
  ): Promise<DeviceInstance[]> {
    const ids = await this.deviceCenterProxyService.queryDeviceIdsByAreaOrGroupAndTag({
      tagCode: VIDEO_MONITOR_TAG_CODE,
      ...params,
    });
    if (!ids?.length) {
      return [];
    }
    return this.deviceCenterProxyService.queryDeviceInstances({
      matchedDeviceIds: ids,
    });
  }

  @POST("/ai-inspection/camera-options")
  @CubeAuthProxy()
  public async listAiInspectionCameraOptions(
    @Body() params: ListAiInspectionCameraOptionsParams,
  ): Promise<Pagination<VideoMonitorDeviceOption>> {
    const pageNumber = params.pageNumber ?? 1;
    const pageSize = params.pageSize ?? 10;
    if (params.groupIds?.length || params.deviceIds?.length) {
      const ids = await this.deviceCenterProxyService.queryDeviceIdsByAreaOrGroupAndTag({
        tagCode: VIDEO_MONITOR_TAG_CODE,
        areaIds: params.filterAreaIds,
        groupIds: params.groupIds,
        deviceIds: params.deviceIds,
      });
      if (!ids.length) {
        return { records: [], total: 0, pages: 0 };
      }
      const devices = await this.deviceCenterProxyService.queryDeviceInstances({
        matchedDeviceIds: ids,
        keywordLike: params.keyword,
        tagCodes: [VIDEO_MONITOR_TAG_CODE],
      });
      const records = this.paginate(devices, pageNumber, pageSize).map((device) => this.toDeviceOption(device));
      return {
        records,
        total: devices.length,
        pages: Math.ceil(devices.length / pageSize),
      };
    }

    const page = await this.deviceCenterProxyService.listDeviceInstances({
      pageNumber,
      pageSize,
      keyword: params.keyword,
      filterAreaIds: params.filterAreaIds,
      anyMatchedAreaId: params.anyMatchedAreaId,
      tagCodes: [VIDEO_MONITOR_TAG_CODE],
    });
    return {
      ...page,
      records: page.records.map((device) => this.toDeviceOption(device)),
    };
  }

  @POST("/ai-inspection/camera-options/by-ids")
  @CubeAuthProxy()
  public async getAiInspectionCameraOptionsByIds(
    @Body() params: GetAiInspectionCameraOptionsByIdsParams,
  ): Promise<VideoMonitorDeviceOption[]> {
    if (!params.deviceIds?.length) {
      return [];
    }
    const devices = await this.deviceCenterProxyService.queryDeviceInstances({
      matchedDeviceIds: params.deviceIds,
      tagCodes: [VIDEO_MONITOR_TAG_CODE],
    });
    return devices.map((device) => this.toDeviceOption(device));
  }

  private paginate<T>(records: T[], pageNumber: number, pageSize: number): T[] {
    const start = Math.max(pageNumber - 1, 0) * pageSize;
    return records.slice(start, start + pageSize);
  }

  private resolveOnlineStatus(source: Record<string, unknown>): string {
    const rawStatus = source.onlineStatus ?? source.status ?? source.deviceState;
    if (typeof rawStatus === "string") {
      if (rawStatus === "1" || rawStatus.toLowerCase() === "true") {
        return "在线";
      }
      if (rawStatus === "0" || rawStatus.toLowerCase() === "false") {
        return "离线";
      }
      return rawStatus;
    }
    if (typeof rawStatus === "boolean") {
      return rawStatus ? "在线" : "离线";
    }
    if (typeof rawStatus === "number") {
      return rawStatus === 1 ? "在线" : "离线";
    }
    if (rawStatus && typeof rawStatus === "object" && !Array.isArray(rawStatus)) {
      const status = rawStatus as { onlineState?: unknown; deviceState?: unknown };
      if (typeof status.onlineState === "boolean") {
        return status.onlineState ? "在线" : "离线";
      }
      if (typeof status.deviceState === "number") {
        return status.deviceState === 1 ? "在线" : "离线";
      }
    }
    return "";
  }

  private toDeviceOption(device: DeviceInstance): VideoMonitorDeviceOption {
    const source = device as unknown as Record<string, unknown>;
    const area = source.area as { id?: string; name?: string } | undefined;
    return {
      id: String(source.id ?? ""),
      name: String(source.name ?? source.deviceName ?? ""),
      code: String(source.code ?? source.deviceCode ?? ""),
      areaId: String(source.areaId ?? area?.id ?? ""),
      areaName: String(source.areaName ?? area?.name ?? source.thirdPartyId ?? ""),
      onlineStatus: this.resolveOnlineStatus(source),
    };
  }
}
