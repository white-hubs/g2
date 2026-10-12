import { Body, Controller, DELETE, GET, POST, PUT, Param, QueryMap } from "@dangao/bun-server";
import type { DeviceUpdatePayload, GroupPayload, PageQuery, RecordingQuery } from "@g2-contract/command-dispatch";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { CommandDispatchProxyService } from "@/services/proxy/command-dispatch/command-dispatch-proxy.service";

@Controller("/gw-bff/command-dispatch")
export class CommandDispatchController {
  public constructor(private readonly proxy: CommandDispatchProxyService) {}

  @GET("/recordings")
  @CubeAuthProxy()
  pageRecordings(@QueryMap() query: RecordingQuery) {
    return this.proxy.pageRecordings(query);
  }

  @GET("/groups")
  @CubeAuthProxy()
  pageGroups(@QueryMap() query: PageQuery) {
    return this.proxy.pageGroups(query);
  }

  @POST("/groups")
  @CubeAuthProxy()
  createGroup(@Body() payload: GroupPayload) {
    return this.proxy.createGroup(payload);
  }

  @PUT("/groups/:id")
  @CubeAuthProxy()
  updateGroup(@Param("id") id: string, @Body() payload: GroupPayload) {
    return this.proxy.updateGroup(id, payload);
  }

  @DELETE("/groups/code/:code")
  @CubeAuthProxy()
  deleteGroup(@Param("code") code: string) {
    return this.proxy.deleteGroup(code);
  }

  @GET("/devices")
  @CubeAuthProxy()
  pageDevices(@QueryMap() query: PageQuery) {
    return this.proxy.pageDevices(query);
  }

  @PUT("/devices/:id")
  @CubeAuthProxy()
  updateDevice(@Param("id") id: string, @Body() payload: DeviceUpdatePayload) {
    return this.proxy.updateDevice(id, payload);
  }

  @POST("/groups/:code/members")
  @CubeAuthProxy()
  setGroupMembers(@Param("code") code: string, @Body() payload: { deviceCodes: string[] }) {
    return this.proxy.setGroupMembers(code, payload.deviceCodes);
  }

  @GET("/accounts")
  @CubeAuthProxy()
  pageAccounts(@QueryMap() query: PageQuery) {
    return this.proxy.pageAccounts(query);
  }
}
