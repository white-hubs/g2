import { Body, Controller, DELETE, GET, Param, POST, PUT, QueryMap } from "@dangao/bun-server";
import type { Pagination } from "@g2-contract/base";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { WarehouseSafetyProxyService } from "@/services/proxy/warehouse-safety/warehouse-safety-proxy.service";

const PREFIX = "/warehouse-safety";

@Controller("/gw-bff/warehouse-safety")
export class WarehouseSafetyController {
  constructor(private readonly proxy: WarehouseSafetyProxyService) {}

  @GET("/warehouses")
  @CubeAuthProxy()
  public async pageWarehouses(@QueryMap() params: Record<string, unknown>): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet(`${PREFIX}/warehouses`, params, this.proxy.emptyPage());
  }

  @GET("/statistics/warehouses")
  @CubeAuthProxy()
  public async getWarehouseStatistics(): Promise<unknown> {
    return await this.proxy.forwardGet(`${PREFIX}/statistics/warehouses`, undefined, {});
  }

  @GET("/warehouses/:id")
  @CubeAuthProxy()
  public async getWarehouse(@Param("id") id: string): Promise<unknown> {
    return await this.proxy.forwardGet(`${PREFIX}/warehouses/${id}`, undefined, {});
  }

  @POST("/warehouses")
  @CubeAuthProxy()
  public async createWarehouse(@Body() payload: Record<string, unknown>): Promise<unknown> {
    return await this.proxy.forwardPost(`${PREFIX}/warehouses`, payload);
  }

  @PUT("/warehouses/:id")
  @CubeAuthProxy()
  public async updateWarehouse(@Param("id") id: string, @Body() payload: Record<string, unknown>): Promise<unknown> {
    return await this.proxy.forwardPut(`${PREFIX}/warehouses/${id}`, payload);
  }

  @DELETE("/warehouses/:id")
  @CubeAuthProxy()
  public async deleteWarehouse(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`${PREFIX}/warehouses/${id}`);
  }

  @GET("/shelves")
  @CubeAuthProxy()
  public async pageShelves(@QueryMap() params: Record<string, unknown>): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet(`${PREFIX}/shelves`, params, this.proxy.emptyPage());
  }

  @GET("/statistics/shelves")
  @CubeAuthProxy()
  public async getShelfStatistics(): Promise<unknown> {
    return await this.proxy.forwardGet(`${PREFIX}/statistics/shelves`, undefined, {});
  }

  @GET("/shelves/:id")
  @CubeAuthProxy()
  public async getShelf(@Param("id") id: string): Promise<unknown> {
    return await this.proxy.forwardGet(`${PREFIX}/shelves/${id}`, undefined, {});
  }

  @POST("/shelves")
  @CubeAuthProxy()
  public async createShelf(@Body() payload: Record<string, unknown>): Promise<unknown> {
    return await this.proxy.forwardPost(`${PREFIX}/shelves`, payload);
  }

  @PUT("/shelves/:id")
  @CubeAuthProxy()
  public async updateShelf(@Param("id") id: string, @Body() payload: Record<string, unknown>): Promise<unknown> {
    return await this.proxy.forwardPut(`${PREFIX}/shelves/${id}`, payload);
  }

  @DELETE("/shelves/:id")
  @CubeAuthProxy()
  public async deleteShelf(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`${PREFIX}/shelves/${id}`);
  }

  @GET("/forklifts")
  @CubeAuthProxy()
  public async pageForklifts(@QueryMap() params: Record<string, unknown>): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet(`${PREFIX}/forklifts`, params, this.proxy.emptyPage());
  }

  @GET("/statistics/forklifts")
  @CubeAuthProxy()
  public async getForkliftStatistics(): Promise<unknown> {
    return await this.proxy.forwardGet(`${PREFIX}/statistics/forklifts`, undefined, {});
  }

  @GET("/forklifts/:id")
  @CubeAuthProxy()
  public async getForklift(@Param("id") id: string): Promise<unknown> {
    return await this.proxy.forwardGet(`${PREFIX}/forklifts/${id}`, undefined, {});
  }

  @POST("/forklifts")
  @CubeAuthProxy()
  public async createForklift(@Body() payload: Record<string, unknown>): Promise<unknown> {
    return await this.proxy.forwardPost(`${PREFIX}/forklifts`, payload);
  }

  @PUT("/forklifts/:id")
  @CubeAuthProxy()
  public async updateForklift(@Param("id") id: string, @Body() payload: Record<string, unknown>): Promise<unknown> {
    return await this.proxy.forwardPut(`${PREFIX}/forklifts/${id}`, payload);
  }

  @DELETE("/forklifts/:id")
  @CubeAuthProxy()
  public async deleteForklift(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`${PREFIX}/forklifts/${id}`);
  }

  @GET("/events")
  @CubeAuthProxy()
  public async pageEvents(@QueryMap() params: Record<string, unknown>): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet(`${PREFIX}/events`, params, this.proxy.emptyPage());
  }

  @GET("/events/:id")
  @CubeAuthProxy()
  public async getEvent(@Param("id") id: string): Promise<unknown> {
    return await this.proxy.forwardGet(`${PREFIX}/events/${id}`, undefined, {});
  }

  @GET("/events/:id/devices")
  @CubeAuthProxy()
  public async listEventDevices(@Param("id") id: string): Promise<unknown[]> {
    return await this.proxy.forwardGet(`${PREFIX}/events/${id}/devices`, undefined, []);
  }

  @GET("/devices")
  @CubeAuthProxy()
  public async pageDeviceOptions(@QueryMap() params: Record<string, unknown>): Promise<Pagination<unknown>> {
    return await this.proxy.forwardGet(`${PREFIX}/devices`, params, this.proxy.emptyPage());
  }

  @GET("/areas/tree")
  @CubeAuthProxy()
  public async getAreaTree(): Promise<unknown[]> {
    return await this.proxy.forwardGet(`${PREFIX}/areas/tree`, undefined, []);
  }
}
