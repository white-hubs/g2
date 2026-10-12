import { Body, Controller, DELETE, GET, HttpException, Param, POST, PUT, QueryMap } from "@dangao/bun-server";
import type {
  WorkPermitPageResult,
  WorkPermitAssociatedItemAiRecognitionRequest,
  WorkPermitAssociatedItemAiRecognitionResponse,
  WorkPermitLevelQuery,
  WorkPermitTypeDetailVO,
  WorkPermitTypePayload,
  WorkPermitTypePageVO,
  WorkPermitTypeQuery,
} from "@g2-contract/work-permit";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { WorkPermitAiFlowService } from "@/services/business/work-permit/work-permit-ai-flow.service";
import { WorkPermitProxyService } from "@/services/proxy/work-permit/work-permit-proxy.service";

@Controller("/gw-bff/work-permit")
export class WorkPermitController {
  constructor(
    private readonly proxy: WorkPermitProxyService,
    private readonly workPermitAiFlowService: WorkPermitAiFlowService,
  ) {}

  @GET("/work-permit-types")
  @CubeAuthProxy()
  public async listWorkPermitTypes(@QueryMap() params: WorkPermitTypeQuery): Promise<WorkPermitPageResult<WorkPermitTypePageVO>> {
    return await this.proxy.forwardWorkPermitGet("/work-permit-types/page", { ...params }, this.proxy.emptyPage());
  }

  @GET("/work-permit-types/levels")
  @CubeAuthProxy()
  public async listWorkPermitLevels(@QueryMap() params: WorkPermitLevelQuery): Promise<string[]> {
    return await this.proxy.forwardWorkPermitGet("/work-permit-types/levels", { ...params }, []);
  }

  @GET("/work-permit-types/export")
  @CubeAuthProxy()
  public async exportWorkPermitTypes(@QueryMap() params: Omit<WorkPermitTypeQuery, "pageNumber" | "pageSize">): Promise<Response> {
    return await this.proxy.forwardWorkPermitGetDownload("/work-permit-types/export", { ...params });
  }

  @GET("/work-permit-types/:id")
  @CubeAuthProxy()
  public async getWorkPermitTypeDetail(@Param("id") id: string): Promise<WorkPermitTypeDetailVO> {
    return await this.proxy.forwardWorkPermitGet(`/work-permit-types/${id}`, undefined, {} as WorkPermitTypeDetailVO);
  }

  @POST("/work-permit-types")
  @CubeAuthProxy()
  public async createWorkPermitType(@Body() payload: WorkPermitTypePayload): Promise<string> {
    return await this.proxy.forwardWorkPermitPost("/work-permit-types", payload);
  }

  @PUT("/work-permit-types/:id")
  @CubeAuthProxy()
  public async updateWorkPermitType(@Param("id") id: string, @Body() payload: WorkPermitTypePayload): Promise<void> {
    await this.proxy.forwardWorkPermitPut(`/work-permit-types/${id}`, payload);
  }

  @DELETE("/work-permit-types/:id")
  @CubeAuthProxy()
  public async deleteWorkPermitType(@Param("id") id: string): Promise<void> {
    await this.proxy.forwardWorkPermitDelete(`/work-permit-types/${id}`);
  }

  @POST("/associated-items/ai-recognition")
  @CubeAuthProxy()
  public async recognizeWorkPermitAssociatedItemByAi(
    @Body() payload: WorkPermitAssociatedItemAiRecognitionRequest,
  ): Promise<WorkPermitAssociatedItemAiRecognitionResponse> {
    validateAiRecognitionPayload(payload);
    return await this.workPermitAiFlowService.recognizeAssociatedItem(
      {
        itemContent: payload.itemContent.trim(),
        fileIds: payload.fileIds.map((fileId) => fileId.trim()).filter(Boolean),
      },
      `trace_${Date.now()}_${crypto.randomUUID()}`,
    );
  }
}

function validateAiRecognitionPayload(payload: WorkPermitAssociatedItemAiRecognitionRequest): void {
  if (!payload || typeof payload !== "object") {
    throw new HttpException(400, "请求体不能为空");
  }
  if (typeof payload.itemContent !== "string" || !payload.itemContent.trim()) {
    throw new HttpException(400, "itemContent 不能为空");
  }
  if (!Array.isArray(payload.fileIds) || payload.fileIds.every((fileId) => typeof fileId !== "string" || !fileId.trim())) {
    throw new HttpException(400, "fileIds 不能为空");
  }
}
