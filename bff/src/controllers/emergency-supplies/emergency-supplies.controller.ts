import { Body, Controller, DELETE, GET, Param, POST, PUT, Query, QueryMap } from "@dangao/bun-server";
import type {
  DispatchOrderVO,
  DispatchPayload,
  DispatchStatVO,
  MapPointVO,
  MapTypeVO,
  MapWarningVO,
  PageResult,
  SuppliesBatchVO,
  SuppliesOverviewVO,
  SuppliesTypeVO,
  SuppliesVO,
  WarehouseVO,
  WarningConfigVO,
} from "@g2-contract/emergency-supplies";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { EmergencySuppliesProxyService } from "@/services/proxy/emergency-supplies/emergency-supplies-proxy.service";

@Controller("/gw-bff/emergency-supplies")
export class EmergencySuppliesController {
  constructor(private readonly proxy: EmergencySuppliesProxyService) {}

  @GET("/warehouses/page")
  @CubeAuthProxy()
  public async getWarehousePage(@QueryMap() payload: Record<string, unknown>): Promise<PageResult<WarehouseVO>> {
    return await this.proxy.forwardGet("/emergency-warehouses/page", payload, this.proxy.emptyPage<WarehouseVO>());
  }

  @GET("/warehouses/:id")
  @CubeAuthProxy()
  public async getWarehouseDetail(@Param("id") id: string): Promise<WarehouseVO> {
    return await this.proxy.forwardGet(`/emergency-warehouses/${id}`, undefined, {} as WarehouseVO);
  }

  @POST("/warehouses")
  @CubeAuthProxy()
  public async createWarehouse(@Body() payload: Partial<WarehouseVO>): Promise<string> {
    return await this.proxy.forwardPost("/emergency-warehouses", payload);
  }

  @PUT("/warehouses/:id")
  @CubeAuthProxy()
  public async updateWarehouse(@Param("id") id: string, @Body() payload: Partial<WarehouseVO>): Promise<void> {
    await this.proxy.forwardPut(`/emergency-warehouses/${id}`, payload);
  }

  @PUT("/warehouses/:id/status")
  @CubeAuthProxy()
  public async changeWarehouseStatus(@Param("id") id: string, @Query("status") status: boolean): Promise<void> {
    await this.proxy.forwardPut(`/emergency-warehouses/${id}/status`, undefined, { status });
  }

  @DELETE("/warehouses/:id")
  @CubeAuthProxy()
  public async deleteWarehouse(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`/emergency-warehouses/${id}`);
  }

  @GET("/supplies-types/page")
  @CubeAuthProxy()
  public async getSuppliesTypePage(@QueryMap() payload: Record<string, unknown>): Promise<PageResult<SuppliesTypeVO>> {
    return await this.proxy.forwardGet("/emergency-supplies-type/page", payload, this.proxy.emptyPage<SuppliesTypeVO>());
  }

  @POST("/supplies-types")
  @CubeAuthProxy()
  public async createSuppliesType(@Body() payload: Partial<SuppliesTypeVO>): Promise<string> {
    return await this.proxy.forwardPost("/emergency-supplies-type", payload);
  }

  @PUT("/supplies-types/:id")
  @CubeAuthProxy()
  public async updateSuppliesType(@Param("id") id: string, @Body() payload: Partial<SuppliesTypeVO>): Promise<void> {
    await this.proxy.forwardPut(`/emergency-supplies-type/${id}`, payload);
  }

  @DELETE("/supplies-types/:id")
  @CubeAuthProxy()
  public async deleteSuppliesType(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`/emergency-supplies-type/${id}`);
  }

  @GET("/supplies/page")
  @CubeAuthProxy()
  public async getSuppliesPage(@QueryMap() payload: Record<string, unknown>): Promise<PageResult<SuppliesVO>> {
    return await this.proxy.forwardGet("/emergency-supplies/page", payload, this.proxy.emptyPage<SuppliesVO>());
  }

  @GET("/supplies/export")
  @CubeAuthProxy()
  public async exportSuppliesLedger(@QueryMap() payload: Record<string, unknown>): Promise<Response> {
    return await this.proxy.forwardGetDownload("/emergency-supplies/export", payload);
  }

  @GET("/supplies/import-template")
  @CubeAuthProxy()
  public async downloadSuppliesImportTemplate(): Promise<Response> {
    return await this.proxy.forwardGetDownload("/emergency-supplies/import-template");
  }

  @GET("/supplies/:id/batches")
  @CubeAuthProxy()
  public async getSuppliesBatches(@Param("id") id: string): Promise<SuppliesBatchVO[]> {
    return await this.proxy.forwardGet(`/emergency-supplies/${id}/batches`, undefined, []);
  }

  @POST("/supplies/:id/batches")
  @CubeAuthProxy()
  public async createSuppliesBatch(@Param("id") id: string, @Body() payload: Partial<SuppliesBatchVO>): Promise<string> {
    return await this.proxy.forwardPost(`/emergency-supplies/${id}/batches`, payload);
  }

  @GET("/supplies/overview")
  @CubeAuthProxy()
  public async getSuppliesOverview(): Promise<SuppliesOverviewVO> {
    return await this.proxy.forwardGet("/emergency-supplies/overview", undefined, {} as SuppliesOverviewVO);
  }

  @GET("/supplies/:id")
  @CubeAuthProxy()
  public async getSuppliesDetail(@Param("id") id: string): Promise<SuppliesVO> {
    return await this.proxy.forwardGet(`/emergency-supplies/${id}`, undefined, {} as SuppliesVO);
  }

  @POST("/supplies")
  @CubeAuthProxy()
  public async createSupplies(@Body() payload: Partial<SuppliesVO> & { firstBatch?: Partial<SuppliesBatchVO> }): Promise<string> {
    return await this.proxy.forwardPost("/emergency-supplies", payload);
  }

  @PUT("/supplies/:id")
  @CubeAuthProxy()
  public async updateSupplies(@Param("id") id: string, @Body() payload: Partial<SuppliesVO>): Promise<void> {
    await this.proxy.forwardPut(`/emergency-supplies/${id}`, payload);
  }

  @PUT("/supplies/:id/status")
  @CubeAuthProxy()
  public async changeSuppliesStatus(@Param("id") id: string, @Query("status") status: string): Promise<void> {
    await this.proxy.forwardPut(`/emergency-supplies/${id}/status`, undefined, { status });
  }

  @GET("/dispatch-orders/page")
  @CubeAuthProxy()
  public async getDispatchOrderPage(@QueryMap() payload: Record<string, unknown>): Promise<PageResult<DispatchOrderVO>> {
    return await this.proxy.forwardGet("/emergency-supplies-dispatch-orders/page", payload, this.proxy.emptyPage<DispatchOrderVO>());
  }

  @GET("/dispatch-orders/stat")
  @CubeAuthProxy()
  public async getDispatchStat(): Promise<DispatchStatVO> {
    return await this.proxy.forwardGet("/emergency-supplies-dispatch-orders/stat", undefined, {} as DispatchStatVO);
  }

  @GET("/dispatch-orders/:id")
  @CubeAuthProxy()
  public async getDispatchOrderDetail(@Param("id") id: string): Promise<DispatchOrderVO> {
    return await this.proxy.forwardGet(`/emergency-supplies-dispatch-orders/${id}`, undefined, {} as DispatchOrderVO);
  }

  @POST("/dispatch-orders")
  @CubeAuthProxy()
  public async createDispatchOrder(@Body() payload: DispatchPayload): Promise<string> {
    return await this.proxy.forwardPost("/emergency-supplies-dispatch-orders", payload);
  }

  @PUT("/dispatch-orders/:id/confirm-outbound")
  @CubeAuthProxy()
  public async confirmDispatchOutbound(@Param("id") id: string, @Body() payload?: Record<string, unknown>): Promise<void> {
    await this.proxy.forwardPut(`/emergency-supplies-dispatch-orders/${id}/confirm-outbound`, payload);
  }

  @PUT("/dispatch-orders/:id/confirm-using")
  @CubeAuthProxy()
  public async confirmDispatchUsing(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardPut(`/emergency-supplies-dispatch-orders/${id}/confirm-using`);
  }

  @PUT("/dispatch-orders/:id/cancel")
  @CubeAuthProxy()
  public async cancelDispatchOrder(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardPut(`/emergency-supplies-dispatch-orders/${id}/cancel`);
  }

  @POST("/dispatch-items/:id/return")
  @CubeAuthProxy()
  public async returnDispatchItem(@Param("id") id: string, @Body() payload: Record<string, unknown>): Promise<void> {
    await this.proxy.forwardPost(`/emergency-supplies-dispatch-items/${id}/return`, payload);
  }

  @POST("/dispatch-items/:id/writeoff")
  @CubeAuthProxy()
  public async writeoffDispatchItem(@Param("id") id: string, @Body() payload: Record<string, unknown>): Promise<void> {
    await this.proxy.forwardPost(`/emergency-supplies-dispatch-items/${id}/writeoff`, payload);
  }

  @GET("/warning-config")
  @CubeAuthProxy()
  public async getWarningConfig(): Promise<WarningConfigVO[]> {
    return await this.proxy.forwardGet("/emergency-supplies-warning-config", undefined, []);
  }

  @PUT("/warning-config")
  @CubeAuthProxy()
  public async updateWarningConfig(@Body() payload: WarningConfigVO[]): Promise<void> {
    await this.proxy.forwardPut("/emergency-supplies-warning-config", payload);
  }

  @GET("/expiry-warnings/page")
  @CubeAuthProxy()
  public async getExpiryWarningPage(@QueryMap() payload: Record<string, unknown>): Promise<PageResult<Record<string, unknown>>> {
    return await this.proxy.forwardGet(
      "/emergency-supplies-expiry-warnings/page",
      payload,
      this.proxy.emptyPage<Record<string, unknown>>(),
    );
  }

  @GET("/stock-warnings/page")
  @CubeAuthProxy()
  public async getStockWarningPage(@QueryMap() payload: Record<string, unknown>): Promise<PageResult<Record<string, unknown>>> {
    return await this.proxy.forwardGet("/emergency-supplies-stock-warnings/page", payload, this.proxy.emptyPage<Record<string, unknown>>());
  }

  @GET("/map/points")
  @CubeAuthProxy()
  public async getSuppliesMapPoints(@QueryMap() payload: Record<string, unknown>): Promise<MapPointVO[]> {
    return await this.proxy.forwardGet("/emergency-supplies-map/points", payload, []);
  }

  @GET("/map/data")
  @CubeAuthProxy()
  public async getSuppliesMapData(@QueryMap() payload: Record<string, unknown>): Promise<MapTypeVO[]> {
    return await this.proxy.forwardGet("/emergency-supplies-map/points", payload, []);
  }

  @GET("/map/warnings")
  @CubeAuthProxy()
  public async getSuppliesMapWarnings(@QueryMap() payload: Record<string, unknown>): Promise<MapWarningVO[]> {
    return await this.proxy.forwardGet("/emergency-supplies-map/warnings", payload, []);
  }
}
