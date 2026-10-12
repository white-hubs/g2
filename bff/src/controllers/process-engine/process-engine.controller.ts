import { Body, Controller, DELETE, GET, Param, POST, PUT, QueryMap } from "@dangao/bun-server";
import type {
  ApplicationQuery,
  FlowBusinessNodeNamesQuery,
  FlowNumberStatistics,
  FlowProcessQuery,
  FlowProcessVO,
  FormFlowDetailVO,
  FormFlowGroupCountParams,
  FormFlowGroupVO,
  FormFlowPageQuery,
  FormGroupTypeVO,
  PermissionFormFlowGroupCountParams,
  ProcessEnginePageResult,
  UpdateFormFlowEnableParams,
  UpdateFormFlowGroupParams,
  UserFlowNumberParams,
  WorkOrderBusinessTypeModel,
  WorkOrderExportQuery,
  WorkOrderStatisticsModel,
  WorkOrderStatisticsQuery,
} from "@g2-contract/process-engine";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { ProcessEngineProxyService } from "@/services/proxy/process-engine/process-engine-proxy.service";

@Controller("/gw-bff/process-engine")
export class ProcessEngineController {
  constructor(private readonly proxy: ProcessEngineProxyService) {}

  @GET("/user-number")
  @CubeAuthProxy()
  public async getUserFlowNumber(@QueryMap() params: UserFlowNumberParams): Promise<FlowNumberStatistics> {
    return await this.proxy.forwardGet(
      "/statistics/user/flow/number",
      { ...params },
      {
        submitCount: 0,
        waitingCount: 0,
        finishedCount: 0,
      },
    );
  }

  @GET("/form-flow-groups/permission-count")
  @CubeAuthProxy()
  public async getPermissionFormFlowGroupCount(@QueryMap() params: PermissionFormFlowGroupCountParams): Promise<FormFlowGroupVO[]> {
    const { applicationCode, ...rest } = params;
    return await this.proxy.forwardGet(
      "/custom-form-flow/group/permission/count",
      {
        ...rest,
        application: params.application ?? applicationCode,
      },
      [],
    );
  }

  @GET("/form-flow-groups/count")
  @CubeAuthProxy()
  public async getFormFlowGroupCount(@QueryMap() params: FormFlowGroupCountParams): Promise<FormFlowGroupVO[]> {
    return await this.proxy.forwardGet("/custom-form-flow/group/count", { ...params }, []);
  }

  @POST("/form-flow-groups")
  @CubeAuthProxy()
  public async updateFormFlowGroup(@Body() params: UpdateFormFlowGroupParams): Promise<boolean> {
    return await this.proxy.forwardPost("/form-flow-group/save-or-update", params);
  }

  @DELETE("/form-flow-groups/:id")
  @CubeAuthProxy()
  public async deleteFormFlowGroup(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`/form-flow-group/${id}`);
  }

  @GET("/form-flows")
  @CubeAuthProxy()
  public async getFormFlowPageList(@QueryMap() params: FormFlowPageQuery): Promise<ProcessEnginePageResult<FormFlowDetailVO>> {
    return await this.proxy.forwardGet("/custom-form-flow/page", { ...params }, this.proxy.emptyPage());
  }

  @PUT("/form-flows/enable")
  @CubeAuthProxy()
  public async updateFormFlowEnable(@Body() params: UpdateFormFlowEnableParams): Promise<boolean> {
    return await this.proxy.forwardPut(`/custom-form-flow/enable?id=${params.id}&enable=${params.enable}`, undefined);
  }

  @DELETE("/form-flows/:id")
  @CubeAuthProxy()
  public async deleteFormFlow(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardDelete(`/custom-form-flow/${id}`);
  }

  @GET("/processes")
  @CubeAuthProxy()
  public async getFlowProcessPage(@QueryMap() params: FlowProcessQuery): Promise<ProcessEnginePageResult<FlowProcessVO>> {
    return await this.proxy.forwardGet("/process/instance/historical/page", { ...params }, this.proxy.emptyPage());
  }

  @GET("/processes/all")
  @CubeAuthProxy()
  public async getWorkOrderList(@QueryMap() params: FlowProcessQuery): Promise<ProcessEnginePageResult<FlowProcessVO>> {
    return await this.proxy.forwardGet("/process/instance/historical/allPage", { ...params }, this.proxy.emptyPage());
  }

  @GET("/processes/export")
  @CubeAuthProxy()
  public async exportWorkOrderList(@QueryMap() params: WorkOrderExportQuery): Promise<Response> {
    return await this.proxy.forwardGetDownload("/process/instance/historical/export", { ...params });
  }

  @GET("/statistics/business-types")
  @CubeAuthProxy()
  public async getWorkOrderStatisticsList(
    @QueryMap() params: WorkOrderStatisticsQuery,
  ): Promise<ProcessEnginePageResult<WorkOrderStatisticsModel>> {
    return await this.proxy.forwardGet("/statistics/group/businessType", { ...params }, this.proxy.emptyPage());
  }

  @GET("/statistics/business-types/export")
  @CubeAuthProxy()
  public async exportWorkOrderStatisticsList(
    @QueryMap() params: Omit<WorkOrderStatisticsQuery, "pageNumber" | "pageSize">,
  ): Promise<Response> {
    return await this.proxy.forwardGetDownload("/statistics/group/businessType/export", { ...params });
  }

  @GET("/business-node-names")
  @CubeAuthProxy()
  public async getFlowBusinessNodeNames(@QueryMap() params: FlowBusinessNodeNamesQuery): Promise<string[]> {
    return await this.proxy.forwardGet("/form-flow-business/node/name", { ...params }, []);
  }

  @GET("/form-flow-groups")
  @CubeAuthProxy()
  public async getFormFlowGroupList(@QueryMap() params?: ApplicationQuery): Promise<FormGroupTypeVO[]> {
    return await this.proxy.forwardGet("/form-flow-group/list", { ...params }, []);
  }

  @GET("/business-types")
  @CubeAuthProxy()
  public async getWorkOrderBusinessTypeList(@QueryMap() params?: ApplicationQuery): Promise<WorkOrderBusinessTypeModel[]> {
    return await this.proxy.forwardGet("/custom-form-flow/business/type", { ...params }, []);
  }
}
