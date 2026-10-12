import { CONFIG_SERVICE_TOKEN, ConfigService, Inject, Injectable } from "@dangao/bun-server";
import type { WorkPermitPageResult } from "@g2-contract/work-permit";

import { ProxyClient } from "@/clients/proxy-client";
import { buildUrl } from "@/services/request-utils";

interface LegacyResponse<T> {
  data: T;
}

const hasData = <T>(value: unknown): value is LegacyResponse<T> => {
  return value !== null && typeof value === "object" && "data" in value;
};

@Injectable()
export class WorkPermitProxyService {
  private readonly workPermitBaseUrl: string;

  constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.workPermitBaseUrl = (this.configService.get<string>("app.workPermitUrl") ?? "").replace(/\/$/, "");
  }

  public emptyPage<T>(): WorkPermitPageResult<T> {
    return { total: 0, pages: 0, records: [] };
  }

  public async forwardWorkPermitGet<T>(path: string, query?: Record<string, unknown>, empty?: T): Promise<T> {
    return await this.forwardGet(this.workPermitBaseUrl, path, query, empty);
  }

  public async forwardWorkPermitPost<T>(path: string, body?: unknown): Promise<T> {
    return await this.forwardPost(this.workPermitBaseUrl, path, body, "workPermitUrl");
  }

  public async forwardWorkPermitPut<T>(path: string, body?: unknown): Promise<T> {
    return await this.forwardPut(this.workPermitBaseUrl, path, body, "workPermitUrl");
  }

  public async forwardWorkPermitDelete(path: string): Promise<void> {
    await this.forwardDelete(this.workPermitBaseUrl, path);
  }

  public async forwardWorkPermitGetDownload(path: string, query?: Record<string, unknown>): Promise<Response> {
    return await this.forwardGetDownload(this.workPermitBaseUrl, path, query, "workPermitUrl");
  }

  private unwrap<T>(value: unknown): T {
    return hasData<T>(value) ? value.data : (value as T);
  }

  private async forwardGet<T>(baseUrl: string, path: string, query?: Record<string, unknown>, empty?: T): Promise<T> {
    if (!baseUrl) {
      return (empty ?? this.emptyPage()) as T;
    }
    const url = buildUrl(`${baseUrl}${path}`, query);
    const response = await this.proxyClient.request<unknown>(url, {
      method: "GET",
      passthroughError: true,
    });
    return this.unwrap<T>(response.data);
  }

  private async forwardPost<T>(baseUrl: string, path: string, body: unknown, configName: string): Promise<T> {
    if (!baseUrl) {
      throw new Error(`${configName} is not configured`);
    }
    const response = await this.proxyClient.request<unknown>(`${baseUrl}${path}`, {
      method: "POST",
      body,
      passthroughError: true,
    });
    return this.unwrap<T>(response.data);
  }

  private async forwardPut<T>(baseUrl: string, path: string, body: unknown, configName: string): Promise<T> {
    if (!baseUrl) {
      throw new Error(`${configName} is not configured`);
    }
    const response = await this.proxyClient.request<unknown>(`${baseUrl}${path}`, {
      method: "PUT",
      body,
      passthroughError: true,
    });
    return this.unwrap<T>(response.data);
  }

  private async forwardDelete(baseUrl: string, path: string): Promise<void> {
    if (!baseUrl) {
      return;
    }
    await this.proxyClient.request(`${baseUrl}${path}`, {
      method: "DELETE",
      passthroughError: true,
    });
  }

  private async forwardGetDownload(
    baseUrl: string,
    path: string,
    query: Record<string, unknown> | undefined,
    configName: string,
  ): Promise<Response> {
    if (!baseUrl) {
      throw new Error(`${configName} is not configured`);
    }
    const url = buildUrl(`${baseUrl}${path}`, query);
    return await this.proxyClient.fetchRaw(url, {
      method: "GET",
      passthroughError: true,
    });
  }
}
