import { Injectable, Inject, CONFIG_SERVICE_TOKEN, ConfigService } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";
import type {
  DeviceGroup,
  DeviceGroupDetail,
  DeviceInstance,
  DeviceTagRule,
  ListDeviceGroupParams,
  ListDeviceInstanceOfRuleConditionParams,
  ListDeviceInstancesParams,
  QueryDeviceIdsByAreaOrGroupAndTagParams,
  QueryDeviceInstancesParams,
} from "@g2-contract/device-center";

import { ProxyClient } from "@/clients/proxy-client";
import { buildUrl } from "@/services/request-utils";

@Injectable()
export class DeviceCenterProxyService {
  private readonly baseUrl: string;

  constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>("app.deviceCenterUrl") || "";
  }

  public async listDeviceInstanceOfRuleCondition(params: ListDeviceInstanceOfRuleConditionParams): Promise<Pagination<DeviceInstance>> {
    const url = `${this.baseUrl}/device/instance/rule-condition/page`;
    const response = await this.proxyClient.request<Pagination<DeviceInstance>>(url, {
      method: "POST",
      passthroughError: true,
      body: params,
    });
    return response.data;
  }

  public async getDeviceTagRule(tagCode: string): Promise<DeviceTagRule> {
    const url = `${this.baseUrl}/tag/rule/${tagCode}`;
    const response = await this.proxyClient.request<DeviceTagRule>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async listDeviceGroup(params: ListDeviceGroupParams): Promise<Pagination<DeviceGroup>> {
    const url = `${this.baseUrl}/tags/device-groups`;
    const fullUrl = buildUrl(url, { ...params, keyword: params.keyword ?? "" });
    const response = await this.proxyClient.request<Pagination<DeviceGroup>>(fullUrl, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async getDeviceGroup(id: string): Promise<DeviceGroupDetail> {
    const url = `${this.baseUrl}/device-groups/${id}`;
    const response = await this.proxyClient.request<DeviceGroupDetail>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async listDeviceInstances(params: ListDeviceInstancesParams): Promise<Pagination<DeviceInstance>> {
    const url = `${this.baseUrl}/device/instance/page`;
    const response = await this.proxyClient.request<Pagination<DeviceInstance>>(url, {
      method: "POST",
      passthroughError: true,
      body: params,
    });
    return response.data;
  }

  public async queryDeviceIdsByAreaOrGroupAndTag(params: QueryDeviceIdsByAreaOrGroupAndTagParams): Promise<string[]> {
    const url = `${this.baseUrl}/devices/ids/by-areas-or-groups-and-tag`;
    const response = await this.proxyClient.request<string[]>(url, {
      method: "POST",
      passthroughError: true,
      body: params,
    });
    return response.data;
  }

  public async queryDeviceInstances(params: QueryDeviceInstancesParams): Promise<DeviceInstance[]> {
    const url = `${this.baseUrl}/devices/instance/list`;
    const response = await this.proxyClient.request<DeviceInstance[]>(url, {
      method: "POST",
      passthroughError: true,
      body: params,
    });
    return response.data;
  }

  /** 设备中心：查询设备关联的监控摄像头 */
  public async getAssociatedVideos(deviceId: string): Promise<unknown[]> {
    const url = buildUrl(`${this.baseUrl}/device/associated/videos`, { deviceId });
    const response = await this.proxyClient.request<unknown[] | { data?: unknown[] }>(url, {
      method: "GET",
      passthroughError: true,
    });
    const payload = response.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload != null && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)) {
      return (payload as { data: unknown[] }).data;
    }
    return [];
  }
}
