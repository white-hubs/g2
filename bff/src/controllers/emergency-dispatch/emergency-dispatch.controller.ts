import { Body, Controller, DELETE, GET, Param, POST, PUT, QueryMap } from "@dangao/bun-server";
import type {
  AreaPlaneMapPayload,
  AreaPlaneMapVO,
  AreaTreeNode,
  CandidatePageQuery,
  EmergencyDispatchGateway,
  EvacuationRouteCreatePayload,
  EvacuationRouteDevicesPayload,
  EvacuationRoutePageQuery,
  EvacuationRouteUpdatePayload,
  EvacuationRouteVO,
  PageResult,
  ResourceCandidate,
  ResourcePageQuery,
  ResourceRefPayload,
  ResourceRefStatistics,
  ResourceRefVO,
} from "@g2-contract/emergency-dispatch";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { EmergencyDispatchProxyService } from "@/services/proxy/emergency-dispatch/emergency-dispatch-proxy.service";

@Controller("/gw-bff/emergency-dispatch")
export class EmergencyDispatchController implements EmergencyDispatchGateway {
  constructor(private readonly proxy: EmergencyDispatchProxyService) {}

  @GET("/resource-refs/page")
  @CubeAuthProxy()
  public async pageResourceRefs(@QueryMap() query: ResourcePageQuery): Promise<PageResult<ResourceRefVO>> {
    return await this.proxy.pageResourceRefs(query);
  }

  @POST("/resource-refs/resources")
  @CubeAuthProxy()
  public async listResourceRefs(@Body() query: Pick<ResourcePageQuery, "refType" | "refIds">): Promise<ResourceRefVO[]> {
    return await this.proxy.listResourceRefs(query);
  }

  @POST("/resource-refs")
  @CubeAuthProxy()
  public async createResourceRef(@Body() payload: ResourceRefPayload[]): Promise<void> {
    await this.proxy.createResourceRef(payload);
  }

  @DELETE("/resource-refs/:id")
  @CubeAuthProxy()
  public async deleteResourceRef(@Param("id") id: string): Promise<void> {
    await this.proxy.deleteResourceRef(id);
  }

  @GET("/resource-refs/statistics")
  @CubeAuthProxy()
  public async getResourceRefStatistics(): Promise<ResourceRefStatistics> {
    return await this.proxy.getResourceRefStatistics();
  }

  @GET("/areas/tree")
  @CubeAuthProxy()
  public async getAreaTree(): Promise<AreaTreeNode[]> {
    return await this.proxy.getAreaTree();
  }

  @GET("/resource-candidates/page")
  @CubeAuthProxy()
  public async pageResourceCandidates(@QueryMap() query: CandidatePageQuery): Promise<PageResult<ResourceCandidate>> {
    return await this.proxy.pageResourceCandidates(query);
  }

  @POST("/area-plane-maps")
  @CubeAuthProxy()
  public async createAreaPlaneMap(@Body() payload: AreaPlaneMapPayload): Promise<AreaPlaneMapVO | void> {
    return await this.proxy.createAreaPlaneMap(payload);
  }

  @PUT("/area-plane-maps/:id")
  @CubeAuthProxy()
  public async updateAreaPlaneMap(@Param("id") id: string, @Body() payload: AreaPlaneMapPayload): Promise<AreaPlaneMapVO | void> {
    return await this.proxy.updateAreaPlaneMap(id, payload);
  }

  @DELETE("/area-plane-maps/:id")
  @CubeAuthProxy()
  public async deleteAreaPlaneMap(@Param("id") id: string): Promise<void> {
    await this.proxy.deleteAreaPlaneMap(id);
  }

  @GET("/area-plane-maps/area/:areaId")
  @CubeAuthProxy()
  public async listAreaPlaneMapsByAreaId(@Param("areaId") areaId: string | number): Promise<AreaPlaneMapVO[]> {
    return await this.proxy.listAreaPlaneMapsByAreaId(areaId);
  }

  @GET("/evacuation-routes/page")
  @CubeAuthProxy()
  public async pageEvacuationRoutes(@QueryMap() query: EvacuationRoutePageQuery): Promise<PageResult<EvacuationRouteVO>> {
    return await this.proxy.pageEvacuationRoutes(query);
  }

  @POST("/evacuation-routes")
  @CubeAuthProxy()
  public async createEvacuationRoute(@Body() payload: EvacuationRouteCreatePayload): Promise<EvacuationRouteVO | void> {
    return await this.proxy.createEvacuationRoute(payload);
  }

  @PUT("/evacuation-routes/:id")
  @CubeAuthProxy()
  public async updateEvacuationRoute(
    @Param("id") id: string,
    @Body() payload: EvacuationRouteUpdatePayload,
  ): Promise<EvacuationRouteVO | void> {
    return await this.proxy.updateEvacuationRoute(id, payload);
  }

  @DELETE("/evacuation-routes/:id")
  @CubeAuthProxy()
  public async deleteEvacuationRoute(@Param("id") id: string): Promise<void> {
    await this.proxy.deleteEvacuationRoute(id);
  }

  @PUT("/evacuation-routes/:id/devices")
  @CubeAuthProxy()
  public async updateEvacuationRouteDevices(@Param("id") id: string, @Body() payload: EvacuationRouteDevicesPayload): Promise<void> {
    await this.proxy.updateEvacuationRouteDevices(id, payload);
  }
}
