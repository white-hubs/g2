import { Controller, GET, Query, QueryMap } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";
import type {
  DepartmentNode,
  DepartmentsQuery,
  GetOrganizationsParams,
  ListUsersParams,
  Organization,
  OuaaGateway,
  Role,
  User,
} from "@g2-contract/ouaa";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { OuaaProxyService } from "@/services/proxy/ouaa/ouaa-proxy.service";

@Controller("/gw-bff/ouaa")
export class OuaaController implements OuaaGateway {
  constructor(private readonly ouaaProxyService: OuaaProxyService) {}

  @GET("/departments")
  @CubeAuthProxy()
  public getDepartments(@QueryMap() query: DepartmentsQuery): Promise<DepartmentNode[]> {
    return this.ouaaProxyService.getDepartments(query);
  }

  @GET("/users")
  @CubeAuthProxy()
  public async listUsers(@QueryMap() params: ListUsersParams): Promise<Pagination<User>> {
    return await this.ouaaProxyService.listUsers(params);
  }

  @GET("/users/get-by-ids")
  @CubeAuthProxy()
  public async getUsersByIds(@Query("ids") ids: string): Promise<User[]> {
    return await this.ouaaProxyService.getUsersByIds(ids.split(","));
  }

  @GET("/organizations")
  @CubeAuthProxy()
  public async getOrganizations(@QueryMap() params: GetOrganizationsParams): Promise<Organization[]> {
    return await this.ouaaProxyService.getOrganizations(params);
  }

  @GET("/organizations/tree")
  @CubeAuthProxy()
  public async getOrganizationTree(@QueryMap() params: GetOrganizationsParams): Promise<Organization[]> {
    return await this.ouaaProxyService.getOrganizationTree(params);
  }

  @GET("/roles")
  @CubeAuthProxy()
  public async getRoles(): Promise<Role[]> {
    return await this.ouaaProxyService.getRoles();
  }
}
