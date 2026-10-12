import { Injectable, Inject, CONFIG_SERVICE_TOKEN, ConfigService } from "@dangao/bun-server";

import { ProxyClient } from "@/clients/proxy-client";
import { buildUrl } from "@/services/request-utils";

interface LegacyResponse<T> {
  data?: T;
}

@Injectable()
export class AccessControlProxyService {
  private readonly baseUrl: string;

  public constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = (this.configService.get<string>("app.accessControlUrl") ?? "").replace(/\/$/, "");
  }

  public async get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    const response = await this.proxyClient.request<LegacyResponse<T> | T>(buildUrl(`${this.baseUrl}${path}`, query), {
      method: "GET",
      passthroughError: true,
    });
    return this.unwrap(response.data);
  }

  public async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.proxyClient.request<LegacyResponse<T> | T>(`${this.baseUrl}${path}`, {
      method: "POST",
      body,
      passthroughError: true,
    });
    return this.unwrap(response.data);
  }

  public async delete<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    const response = await this.proxyClient.request<LegacyResponse<T> | T>(buildUrl(`${this.baseUrl}${path}`, query), {
      method: "DELETE",
      passthroughError: true,
    });
    return this.unwrap(response.data);
  }

  private unwrap<T>(payload: LegacyResponse<T> | T): T {
    if (
      payload &&
      typeof payload === "object" &&
      "data" in payload &&
      (payload as LegacyResponse<T>).data !== undefined &&
      (payload as LegacyResponse<T>).data !== null
    ) {
      return (payload as LegacyResponse<T>).data as T;
    }
    return payload as T;
  }
}
