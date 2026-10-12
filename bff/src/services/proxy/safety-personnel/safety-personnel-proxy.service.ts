import { Injectable, Inject, CONFIG_SERVICE_TOKEN, ConfigService } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";

import { ProxyClient } from "@/clients/proxy-client";
import { buildUrl } from "@/services/request-utils";

/**
 * 安全人员管理代理：1:1 转发至 app.safetyPersonnelUrl（开河 safety-personnel 服务）
 */
@Injectable()
export class SafetyPersonnelProxyService {
  private readonly baseUrl: string;

  constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = (this.configService.get<string>("app.safetyPersonnelUrl") ?? "").replace(/\/$/, "");
  }

  public emptyPage<T>(): Pagination<T> {
    return { total: 0, pages: 0, records: [] };
  }

  public async forwardGet<T>(path: string, query?: Record<string, unknown>, empty?: T): Promise<T> {
    if (!this.baseUrl) {
      return (empty ?? this.emptyPage()) as T;
    }
    const url = buildUrl(`${this.baseUrl}${path}`, query);
    const response = await this.proxyClient.request<T>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async forwardPost<T>(path: string, body?: unknown): Promise<T> {
    if (!this.baseUrl) {
      throw new Error("safetyPersonnelUrl is not configured");
    }
    const url = `${this.baseUrl}${path}`;
    const response = await this.proxyClient.request<T>(url, {
      method: "POST",
      body,
      passthroughError: true,
    });
    return response.data;
  }

  public async forwardPut<T>(path: string, body?: unknown): Promise<T> {
    if (!this.baseUrl) {
      throw new Error("safetyPersonnelUrl is not configured");
    }
    const url = `${this.baseUrl}${path}`;
    const response = await this.proxyClient.request<T>(url, {
      method: "PUT",
      body,
      passthroughError: true,
    });
    return response.data;
  }

  public async forwardDelete(path: string): Promise<void> {
    if (!this.baseUrl) {
      return;
    }
    const url = `${this.baseUrl}${path}`;
    await this.proxyClient.request(url, {
      method: "DELETE",
      passthroughError: true,
    });
  }

  /** 文件流下载（POST + JSON body）：原样透传上游 Response */
  public async forwardPostDownload(path: string, body?: Record<string, unknown>): Promise<Response> {
    if (!this.baseUrl) {
      throw new Error("safetyPersonnelUrl is not configured");
    }
    const url = `${this.baseUrl}${path}`;
    return await this.proxyClient.fetchRaw(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      passthroughError: true,
    });
  }
}
