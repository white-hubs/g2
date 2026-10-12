import { Body, Controller, DELETE, GET, POST, QueryMap } from "@dangao/bun-server";
import type {
  AccessControlAnyParams,
  AccessControlGateway,
  AccessControlPagingParams,
  DoorControlParams,
  DoorDevicePageParams,
  DoorStatusParams,
  GetDoorTendParams,
  RemoveDoorDeviceBatchParams,
  RemoveDoorDeviceParams,
  SecurityLockNeedParams,
  SecurityLockVerifyParams,
} from "@g2-contract/access-control";
import type {
  AccessControlPage,
  AccessControlRecord,
  DeviceProductCategoryRecord,
  DeviceProductRecord,
  DoorDeviceRecord,
  DoorEventRecord,
  DoorRankingRecord,
  DoorTypeRecord,
  EnterpriseDirectoryRecord,
} from "@g2-contract/access-control";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { AccessControlProxyService } from "@/services/proxy/access-control/access-control-proxy.service";

@Controller("/gw-bff/access-control")
export class AccessControlController implements AccessControlGateway {
  public constructor(private readonly accessControlProxyService: AccessControlProxyService) {}

  @GET("/enterprise-directory")
  @CubeAuthProxy()
  public async getEnterpriseDirectory(
    @QueryMap() params: AccessControlPagingParams,
  ): Promise<AccessControlPage<EnterpriseDirectoryRecord>> {
    return await this.accessControlProxyService.get("/door/enterprise/directory/page", params);
  }

  @GET("/door-ranking")
  @CubeAuthProxy()
  public async getDoorRanking(@QueryMap() params: AccessControlAnyParams): Promise<DoorRankingRecord[]> {
    return await this.accessControlProxyService.get("/door/getDoorRanking", params);
  }

  @GET("/door-events")
  @CubeAuthProxy()
  public async getDoorEvents(@QueryMap() params: AccessControlAnyParams): Promise<DoorEventRecord[]> {
    return await this.accessControlProxyService.get("/door/getDoorEvents", params);
  }

  @GET("/passed-today-num")
  @CubeAuthProxy()
  public async passedTodayNum(@QueryMap() params: AccessControlAnyParams): Promise<number> {
    return await this.accessControlProxyService.get("/door/passedTodayNum", params);
  }

  @GET("/door-tend")
  @CubeAuthProxy()
  public async getDoorTend(@QueryMap() params: GetDoorTendParams): Promise<AccessControlRecord[]> {
    const { timeFlag, ...query } = params;
    return await this.accessControlProxyService.get(`/door/getDoorTend/${timeFlag}`, query);
  }

  @GET("/security-lock/is-need")
  @CubeAuthProxy()
  public async generDeviceIsWord(@QueryMap() params: SecurityLockNeedParams): Promise<boolean | AccessControlRecord> {
    const { deviceInstanceId, ...query } = params;
    return await this.accessControlProxyService.get(`/device/device/instance/${deviceInstanceId}/security-lock/is-need`, query);
  }

  @POST("/security-lock/verify")
  @CubeAuthProxy()
  public async controlDoorverify(@Body() params: SecurityLockVerifyParams): Promise<boolean | AccessControlRecord> {
    return await this.accessControlProxyService.post("/device/device/instance/security-lock/verify", params);
  }

  @GET("/devices")
  @CubeAuthProxy()
  public async generDevice(@QueryMap() params: AccessControlAnyParams): Promise<DoorDeviceRecord[] | AccessControlPage<DoorDeviceRecord>> {
    return await this.accessControlProxyService.get("/door/devices", params);
  }

  @GET("/door-types")
  @CubeAuthProxy()
  public async getDoorType(@QueryMap() params: AccessControlAnyParams): Promise<DoorTypeRecord[]> {
    return await this.accessControlProxyService.get("/door/getDoorType", params);
  }

  @POST("/door-devices")
  @CubeAuthProxy()
  public async addDoorDevices(@Body() params: AccessControlAnyParams): Promise<boolean | AccessControlRecord> {
    return await this.accessControlProxyService.post("/door/addDoorDevices", params);
  }

  @GET("/door-device-page")
  @CubeAuthProxy()
  public async getDoorDevicePage(@QueryMap() params: DoorDevicePageParams): Promise<AccessControlPage<DoorDeviceRecord>> {
    return await this.accessControlProxyService.get("/door/getDoorDevicePage", params);
  }

  @DELETE("/door-device")
  @CubeAuthProxy()
  public async removeDoorDevice(@QueryMap() params: RemoveDoorDeviceParams): Promise<boolean | void> {
    const { id, ...query } = params;
    return await this.accessControlProxyService.delete(`/door/removeDoorDevice/${id}`, query);
  }

  @DELETE("/door-devices")
  @CubeAuthProxy()
  public async removeDoorDeviceBatch(@QueryMap() params: RemoveDoorDeviceBatchParams): Promise<boolean | void> {
    const ids = Array.isArray(params.ids) ? params.ids.join(",") : params.ids;
    return await this.accessControlProxyService.delete("/door/removeDoorDeviceBatch", { ...params, ids });
  }

  @POST("/control-door")
  @CubeAuthProxy()
  public async controlDoor(@Body() params: DoorControlParams): Promise<boolean | AccessControlRecord> {
    return await this.accessControlProxyService.post("/door/controlDoor", params);
  }

  @GET("/door-event-record")
  @CubeAuthProxy()
  public async getDoorEventRecord(@QueryMap() params: AccessControlPagingParams): Promise<AccessControlPage<DoorEventRecord>> {
    return await this.accessControlProxyService.get("/door/getDoorEventRecord", params);
  }

  @GET("/today-event-trend")
  @CubeAuthProxy()
  public async getToDayEventTrend(@QueryMap() params: AccessControlAnyParams): Promise<AccessControlRecord[]> {
    return await this.accessControlProxyService.get("/door/getToDayEventTrend", params);
  }

  @GET("/abnormal-event")
  @CubeAuthProxy()
  public async getAbnormalEvent(@QueryMap() params: AccessControlPagingParams): Promise<AccessControlPage<DoorEventRecord>> {
    return await this.accessControlProxyService.get("/door/getAbnormalEvent", {
      keyword: "",
      date: "",
      period: "",
      cascaderIds: "",
      item: "",
      sort: "",
      ...params,
    });
  }

  @GET("/door-status")
  @CubeAuthProxy()
  public async inspectgetStatus(@QueryMap() params: DoorStatusParams): Promise<AccessControlRecord> {
    const { id, ...query } = params;
    return await this.accessControlProxyService.get(`/door/getStatus/${id}`, query);
  }

  @GET("/device-products")
  @CubeAuthProxy()
  public async getDeviceProduct(@QueryMap() params: AccessControlAnyParams): Promise<DeviceProductCategoryRecord[]> {
    return await this.accessControlProxyService.get("/device/product/category/tree", params);
  }

  @GET("/device-list")
  @CubeAuthProxy()
  public async getDeviceList(
    @QueryMap() params: AccessControlAnyParams,
  ): Promise<AccessControlPage<DoorDeviceRecord> | DoorDeviceRecord[]> {
    return await this.accessControlProxyService.get("/device/device/instance/page/all", params);
  }

  @GET("/products")
  @CubeAuthProxy()
  public async getProductAll(@QueryMap() params: AccessControlAnyParams): Promise<DeviceProductRecord[]> {
    return await this.accessControlProxyService.get("/device/product/list/all", params);
  }
}
