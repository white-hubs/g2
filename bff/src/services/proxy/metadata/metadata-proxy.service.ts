import { Injectable, Inject, CONFIG_SERVICE_TOKEN, ConfigService } from "@dangao/bun-server";
import type { Area } from "@g2-contract/metadata";

import { ProxyClient } from "@/clients/proxy-client";

@Injectable()
export class MetadataProxyService {
  private readonly baseUrl: string;

  constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>("app.metadataUrl") || "";
  }

  public async listAllArea(): Promise<Area[]> {
    const url = `${this.baseUrl}/area/list`;
    const response = await this.proxyClient.request<Area[]>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }
}
