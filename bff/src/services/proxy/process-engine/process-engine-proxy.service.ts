import { CONFIG_SERVICE_TOKEN, ConfigService, Inject, Injectable } from "@dangao/bun-server";
import type { ProcessEnginePageResult } from "@g2-contract/process-engine";

import { ProxyClient } from "@/clients/proxy-client";
import { buildUrl } from "@/services/request-utils";

interface LegacyResponse<T> {
  data: T;
}

const hasData = <T>(value: unknown): value is LegacyResponse<T> => {
  return value !== null && typeof value === "object" && "data" in value;
};

@Injectable()
export class ProcessEngineProxyService {
  private readonly baseUrl: string;

  constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = (this.configService.get<string>("app.flowUrl") ?? "").replace(/\/$/, "");
  }

  public emptyPage<T>(): ProcessEnginePageResult<T> {
    return { total: 0, pages: 0, records: [] };
  }

  public async forwardGet<T>(path: string, query?: Record<string, unknown>, empty?: T): Promise<T> {
    if (!this.baseUrl) {
      return (empty ?? this.emptyPage()) as T;
    }
    const response = await this.proxyClient.request<unknown>(buildUrl(`${this.baseUrl}${path}`, query), {
      method: "GET",
      passthroughError: true,
    });
    return this.unwrap<T>(response.data);
  }

  public async forwardPost<T>(path: string, body?: unknown): Promise<T> {
    if (!this.baseUrl) {
      throw new Error("flowUrl is not configured");
    }
    const response = await this.proxyClient.request<unknown>(`${this.baseUrl}${path}`, {
      method: "POST",
      body,
      passthroughError: true,
    });
    return this.unwrap<T>(response.data);
  }

  public async forwardPut<T>(path: string, body?: unknown): Promise<T> {
    if (!this.baseUrl) {
      throw new Error("flowUrl is not configured");
    }
    const response = await this.proxyClient.request<unknown>(`${this.baseUrl}${path}`, {
      method: "PUT",
      body,
      passthroughError: true,
    });
    return this.unwrap<T>(response.data);
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

  public async forwardGetDownload(path: string, query?: Record<string, unknown>): Promise<Response> {
    if (!this.baseUrl) {
      throw new Error("flowUrl is not configured");
    }
    return await this.proxyClient.fetchRaw(buildUrl(`${this.baseUrl}${path}`, query), {
      method: "GET",
      passthroughError: true,
    });
  }

  private unwrap<T>(value: unknown): T {
    return hasData<T>(value) ? value.data : (value as T);
  }
}
