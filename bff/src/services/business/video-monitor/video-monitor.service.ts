import { Injectable } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";
import type { AuthGroupModifyParam, DeviceAuth, ListDeviceAuthParams, VideoMonitorAuthGateway } from "@g2-contract/video-monitor";

import { VideoMonitorProxyService } from "@/services/proxy/video-monitor/video-monitor-proxy.service";

/**
 * 视频监控业务服务
 * 实现 VideoMonitorAuthGateway 接口
 * 负责业务逻辑处理，可能做接口聚合、响应裁剪等
 */
@Injectable()
export class VideoMonitorService implements VideoMonitorAuthGateway {
  constructor(private readonly proxyService: VideoMonitorProxyService) {}

  /**
   * 创建授权组
   */
  async createAuthGroup(params: AuthGroupModifyParam): Promise<string> {
    const result = await this.proxyService.createCameraAuth(params);
    return result.id;
  }

  /**
   * 更新授权组
   */
  async updateAuthGroup(id: string, params: AuthGroupModifyParam): Promise<void> {
    await this.proxyService.updateCameraAuth(id, params);
  }

  /**
   * 删除授权组
   */
  async deleteAuthGroup(id: string): Promise<void> {
    await this.proxyService.deleteCameraAuth(id);
  }

  /**
   * 获取授权组详情
   */
  async getAuthGroup(id: string): Promise<DeviceAuth> {
    return await this.proxyService.getCameraAuthDetail(id);
  }

  /**
   * 获取授权组列表
   */
  async listAuthGroup(params: ListDeviceAuthParams): Promise<Pagination<DeviceAuth>> {
    return await this.proxyService.getCameraAuthList(params);
  }
}
