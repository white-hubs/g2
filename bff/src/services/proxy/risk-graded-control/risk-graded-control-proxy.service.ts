import { Injectable, Inject, CONFIG_SERVICE_TOKEN, ConfigService } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";

import { ProxyClient } from "@/clients/proxy-client";
import { buildUrl } from "@/services/request-utils";
import { requireUpstreamUrl, unwrapUpstreamResponse } from "@/services/upstream-response";

/**
 * 风险分级管控代理：1:1 转发至开河 /risk-control 服务
 */
@Injectable()
export class RiskGradedControlProxyService {
  private readonly baseUrl: string;

  constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = (this.configService.get<string>("app.riskControlUrl") ?? "").replace(/\/$/, "");
  }

  public emptyPage<T>(): Pagination<T> {
    return { total: 0, pages: 0, records: [] };
  }

  public async forwardGet<T>(path: string, query?: Record<string, unknown>, _empty?: T): Promise<T> {
    const url = buildUrl(`${this.requireBaseUrl()}${path}`, query);
    const response = await this.proxyClient.request<T>(url, {
      method: "GET",
      passthroughError: true,
    });
    return unwrapUpstreamResponse<T>(response.data);
  }

  public async forwardGetDownload(path: string, query?: Record<string, unknown>): Promise<Response> {
    const url = buildUrl(`${this.requireBaseUrl()}${path}`, query);
    return await this.proxyClient.fetchRaw(url, {
      method: "GET",
      passthroughError: true,
    });
  }

  public async forwardPost<T>(path: string, body?: unknown): Promise<T> {
    const url = `${this.requireBaseUrl()}${path}`;
    const response = await this.proxyClient.request<T>(url, {
      method: "POST",
      body,
      passthroughError: true,
    });
    return unwrapUpstreamResponse<T>(response.data);
  }

  public async forwardPut<T>(path: string, body?: unknown): Promise<T> {
    const url = `${this.requireBaseUrl()}${path}`;
    const response = await this.proxyClient.request<T>(url, {
      method: "PUT",
      body,
      passthroughError: true,
    });
    return unwrapUpstreamResponse<T>(response.data);
  }

  public async forwardPatch<T>(path: string, body?: unknown): Promise<T> {
    const url = `${this.requireBaseUrl()}${path}`;
    const response = await this.proxyClient.request<T>(url, {
      method: "PATCH",
      body,
      passthroughError: true,
    });
    return unwrapUpstreamResponse<T>(response.data);
  }

  public async forwardDelete(path: string): Promise<void> {
    const url = `${this.requireBaseUrl()}${path}`;
    await this.proxyClient.request(url, {
      method: "DELETE",
      passthroughError: true,
    });
  }

  private requireBaseUrl(): string {
    return requireUpstreamUrl(this.baseUrl, "riskControlUrl");
  }
}
