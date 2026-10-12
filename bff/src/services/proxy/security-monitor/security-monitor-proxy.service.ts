import { CONFIG_SERVICE_TOKEN, ConfigService, Inject, Injectable } from "@dangao/bun-server";
import { SECURITY_MONITOR_ALLOWED_UPSTREAM_PREFIXES, type SecurityMonitorProxyGateway } from "@g2-contract/security-monitor";

import { ProxyClient } from "@/clients/proxy-client";
import { buildUrl } from "@/services/request-utils";

interface LegacyResponse<T> {
  data?: T;
}

@Injectable()
export class SecurityMonitorProxyService implements SecurityMonitorProxyGateway {
  private readonly baseUrl: string;

  public constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = (this.configService.get<string>("app.securityMonitorUrl") ?? "").replace(/\/$/, "");
  }

  public async forwardGet(path: string, query?: Record<string, unknown>): Promise<unknown> {
    return await this.request(path, "GET", undefined, query);
  }

  public async forwardPost(path: string, body?: unknown): Promise<unknown> {
    return await this.request(path, "POST", body);
  }

  public async forwardPut(path: string, body?: unknown): Promise<unknown> {
    return await this.request(path, "PUT", body);
  }

  public async forwardDelete(path: string, query?: Record<string, unknown>): Promise<unknown> {
    return await this.request(path, "DELETE", undefined, query);
  }

  private async request(
    path: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    body?: unknown,
    query?: Record<string, unknown>,
  ): Promise<unknown> {
    this.assertAllowed(path);
    const url = query ? buildUrl(`${this.baseUrl}${path}`, query) : `${this.baseUrl}${path}`;
    const response = await this.proxyClient.request<LegacyResponse<unknown> | unknown>(url, {
      method,
      body,
      passthroughError: true,
    });
    return this.unwrap(response.data);
  }

  private assertAllowed(path: string): void {
    if (
      path.includes("..") ||
      path.includes("://") ||
      !SECURITY_MONITOR_ALLOWED_UPSTREAM_PREFIXES.some((prefix) => path.startsWith(prefix))
    ) {
      throw new Error(`security-monitor upstream path is not allowed: ${path}`);
    }
  }

  private unwrap<T>(payload: LegacyResponse<T> | T): T {
    if (payload && typeof payload === "object" && "data" in payload && (payload as LegacyResponse<T>).data !== undefined) {
      return (payload as LegacyResponse<T>).data as T;
    }
    return payload as T;
  }
}
