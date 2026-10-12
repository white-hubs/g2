import { CONFIG_SERVICE_TOKEN, ConfigService, Inject, Injectable } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";

import { ProxyClient } from "@/clients/proxy-client";
import { buildUrl } from "@/services/request-utils";

interface LegacyResponse<T> {
  data: T;
}

export interface StaffPageQuery {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  areaId?: string | number;
}

const hasData = <T>(value: unknown): value is LegacyResponse<T> => {
  return value !== null && typeof value === "object" && "data" in value;
};

@Injectable()
export class StaffProxyService {
  private readonly baseUrl: string;

  constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = (this.configService.get<string>("app.personnelUrl") ?? "").replace(/\/$/, "");
  }

  public async pageStaff(params: StaffPageQuery): Promise<Pagination<Record<string, unknown>>> {
    if (!this.baseUrl) {
      return { total: 0, pages: 0, records: [] };
    }
    const response = await this.proxyClient.request<unknown>(buildUrl(`${this.baseUrl}/staff/page`, { ...params }), {
      method: "GET",
      passthroughError: true,
    });
    return this.unwrap<Pagination<Record<string, unknown>>>(response.data);
  }

  private unwrap<T>(value: unknown): T {
    return hasData<T>(value) ? value.data : (value as T);
  }
}
