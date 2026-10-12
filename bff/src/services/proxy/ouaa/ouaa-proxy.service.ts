import { Injectable, Inject, CONFIG_SERVICE_TOKEN, ConfigService } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";
import type {
  DepartmentNode,
  DepartmentsQuery,
  GetOrganizationsParams,
  ListUsersParams,
  Organization,
  Role,
  User,
} from "@g2-contract/ouaa";

import { ProxyClient } from "@/clients/proxy-client";
import { buildUrl } from "@/services/request-utils";
import { requireUpstreamUrl, unwrapUpstreamResponse } from "@/services/upstream-response";

@Injectable()
export class OuaaProxyService {
  private readonly baseUrl: string;

  constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>("app.ouaaUrl") || "";
  }

  public async listUsers(params: ListUsersParams): Promise<Pagination<User>> {
    const url = `${this.baseUrl}/user-under-tenant/page`;
    const fullUrl = buildUrl(url, { ...params });
    const response = await this.proxyClient.request<Pagination<User>>(fullUrl, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async getDepartments(query: DepartmentsQuery): Promise<DepartmentNode[]> {
    const base = requireUpstreamUrl(this.baseUrl, "ouaaUrl");
    const authenticated = base.endsWith("/authenticated") ? base : `${base}/authenticated`;
    const response = await this.proxyClient.request(buildUrl(`${authenticated}/organizations`, { ...query }), {
      method: "GET",
      passthroughError: true,
    });
    const data = unwrapUpstreamResponse<unknown>(response.data);
    if (!Array.isArray(data)) throw Response.json({ message: "部门树响应格式错误" }, { status: 502 });
    return data as DepartmentNode[];
  }

  public async getUsersByIds(ids: string[]): Promise<User[]> {
    const url = `${this.baseUrl}/user-under-tenant/ids/list`;
    const fullUrl = buildUrl(url, { ids });
    const response = await this.proxyClient.request<User[]>(fullUrl, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async getUserByUsername(username: string): Promise<User | undefined> {
    const account = username.trim();
    if (account === "") {
      return undefined;
    }
    const url = `${this.baseUrl}/user-under-tenant/username/${encodeURIComponent(account)}`;
    try {
      const response = await this.proxyClient.request<User>(url, {
        method: "GET",
        passthroughError: true,
      });
      return response.data;
    } catch {
      return undefined;
    }
  }

  public async getRoles(): Promise<Role[]> {
    const url = `${this.baseUrl}/role/list-by-product`;
    const response = await this.proxyClient.request<Role[]>(url, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  public async getOrganizations(params: GetOrganizationsParams): Promise<Organization[]> {
    const url = `${this.baseUrl}/organizations/list`;
    const fullUrl = buildUrl(url, { ...params });
    const response = await this.proxyClient.request<Organization[]>(fullUrl, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }

  /** 组织树：上游 GET /organizations */
  public async getOrganizationTree(params: GetOrganizationsParams): Promise<Organization[]> {
    const url = `${this.baseUrl}/organizations`;
    const fullUrl = buildUrl(url, { ...params });
    const response = await this.proxyClient.request<Organization[]>(fullUrl, {
      method: "GET",
      passthroughError: true,
    });
    return response.data;
  }
}
