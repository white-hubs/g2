import { Injectable, Inject, CONFIG_SERVICE_TOKEN, ConfigService } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";

import { ProxyClient } from "@/clients/proxy-client";
import { buildUrl } from "@/services/request-utils";

@Injectable()
export class WarehouseSafetyProxyService {
  private readonly baseUrl: string;

  constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = (this.configService.get<string>("app.securityManagementUrl") ?? "").replace(/\/$/, "");
  }

  public emptyPage<T>(): Pagination<T> {
    return { total: 0, pages: 0, records: [] };
  }

  public async forwardGet<T>(path: string, query?: Record<string, unknown>, empty?: T): Promise<T> {
    if (!this.baseUrl) {
      return (empty ?? this.emptyPage()) as T;
    }
    const response = await this.proxyClient.request<T>(buildUrl(`${this.baseUrl}${path}`, query), {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async forwardPost<T>(path: string, body?: unknown): Promise<T> {
    if (!this.baseUrl) {
      throw new Error("securityManagementUrl is not configured");
    }
    const response = await this.proxyClient.request<T>(`${this.baseUrl}${path}`, {
      method: "POST",
      body,
      passthroughError: true,
    });
    return response.data;
  }

  public async forwardPut<T>(path: string, body?: unknown): Promise<T> {
    if (!this.baseUrl) {
      throw new Error("securityManagementUrl is not configured");
    }
    const response = await this.proxyClient.request<T>(`${this.baseUrl}${path}`, {
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
    await this.proxyClient.request(`${this.baseUrl}${path}`, {
      method: "DELETE",
      passthroughError: true,
    });
  }
}
